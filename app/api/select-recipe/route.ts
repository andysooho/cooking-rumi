import { NextRequest, NextResponse } from "next/server";

import { parseModelJson, safeText } from "@/lib/ai-json";
import { fallbackRecipe } from "@/lib/game-fallbacks";
import { getGeminiClient } from "@/lib/gemini";
import { buildRecipeSelectionPrompt } from "@/lib/prompts";
import type { GameMode, Ingredient, RecipePlan, RecipeStep } from "@/types/game";

export const runtime = "nodejs";

const DEFAULT_MODEL = "gemini-2.5-flash";

type RecipePayload = Partial<RecipePlan> & {
  recipe?: {
    steps?: Array<Partial<RecipeStep>>;
    tips?: unknown;
    totalTime?: unknown;
  };
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}

function parseMode(value: unknown): GameMode {
  return value === "creative" ? "creative" : "delicious";
}

function normalizeRecipe(input: RecipePayload, mode: GameMode, ingredients: Ingredient[]): RecipePlan {
  const fallback = fallbackRecipe(mode, ingredients);
  const steps = (input.recipe?.steps ?? [])
    .map((step, index) => {
      const action = safeText(step.action);
      const tool = safeText(step.tool);
      const parsedIngredients = Array.isArray(step.ingredients)
        ? step.ingredients.map((item) => safeText(item)).filter(Boolean)
        : [];
      if (!action || !tool || parsedIngredients.length === 0) {
        return null;
      }
      return {
        order:
          typeof step.order === "number" && Number.isFinite(step.order)
            ? step.order
            : index + 1,
        action,
        tool,
        ingredients: parsedIngredients,
        result: safeText(step.result),
      };
    })
    .filter((step): step is NonNullable<typeof step> => Boolean(step));

  const hints =
    Array.isArray(input.hints) && input.hints.length > 0
      ? input.hints.map((item) => safeText(item)).filter(Boolean).slice(0, 3)
      : fallback.hints;

  return {
    dishName: safeText(input.dishName) || fallback.dishName,
    dishNameEn: safeText(input.dishNameEn) || fallback.dishNameEn,
    description: safeText(input.description) || fallback.description,
    hints: hints.length > 0 ? hints : fallback.hints,
    recipe: {
      steps: steps.length >= 4 ? steps : fallback.recipe.steps,
      tips: safeText(input.recipe?.tips) || fallback.recipe.tips,
      totalTime: safeText(input.recipe?.totalTime) || fallback.recipe.totalTime,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      mode?: unknown;
      ingredients?: unknown;
      model?: unknown;
    };

    if (!Array.isArray(body.ingredients) || body.ingredients.length === 0) {
      throw new Error("ingredients must be a non-empty array.");
    }

    const mode = parseMode(body.mode);
    const ingredients = body.ingredients
      .filter((item): item is Ingredient => Boolean(item && typeof item === "object"))
      .map((item, index) => ({
        id: safeText(item.id) || `ingredient-${index + 1}`,
        name: safeText(item.name),
        nameEn: safeText(item.nameEn),
        category: safeText(item.category),
        source: "fridge" as const,
      }))
      .filter((item) => item.name);

    if (ingredients.length === 0) {
      throw new Error("ingredients are empty after validation.");
    }

    const model =
      typeof body.model === "string" && body.model.trim()
        ? body.model.trim()
        : DEFAULT_MODEL;

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model,
        contents: buildRecipeSelectionPrompt(
          mode,
          ingredients.map((ingredient) => ingredient.name),
        ),
      });

      const text =
        response.text?.trim() ??
        response.candidates?.[0]?.content?.parts
          ?.map((part) => part.text?.trim())
          .filter((item): item is string => Boolean(item))
          .join("\n")
          .trim() ??
        "";

      if (!text) {
        return NextResponse.json({
          recipe: fallbackRecipe(mode, ingredients),
          source: "fallback",
        });
      }

      const parsed = parseModelJson<RecipePayload>(text);
      const recipe = normalizeRecipe(parsed, mode, ingredients);

      return NextResponse.json({
        recipe,
        source: "model",
      });
    } catch {
      return NextResponse.json({
        recipe: fallbackRecipe(mode, ingredients),
        source: "fallback",
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: toErrorMessage(error) },
      { status: 400 },
    );
  }
}
