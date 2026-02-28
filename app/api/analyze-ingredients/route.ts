import { NextRequest, NextResponse } from "next/server";

import { parseModelJson, safeText } from "@/lib/ai-json";
import { fallbackIngredientsFromFileNames } from "@/lib/game-fallbacks";
import { getGeminiClient } from "@/lib/gemini";
import { buildIngredientAnalysisPrompt } from "@/lib/prompts";
import type { Ingredient } from "@/types/game";

export const runtime = "nodejs";

const DEFAULT_MODEL = "gemini-2.5-flash";

type UploadedImage = {
  name?: string;
  mimeType?: string;
  dataUrl?: string;
};

type IngredientAnalysisJson = {
  ingredients?: Array<{
    name?: unknown;
    nameEn?: unknown;
    category?: unknown;
  }>;
  confidence?: unknown;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const matched = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!matched) {
    throw new Error("Invalid dataUrl format.");
  }
  return { mimeType: matched[1] ?? "image/jpeg", data: matched[2] ?? "" };
}

function normalizeIngredients(
  payload: IngredientAnalysisJson,
  fallbackFileNames: string[],
): Ingredient[] {
  const fromModel = (payload.ingredients ?? [])
    .map((item, index) => {
      const name = safeText(item.name);
      if (!name) {
        return null;
      }
      const nameEn = safeText(item.nameEn) || `ingredient_${index + 1}`;
      return {
        id: `${nameEn}-${index}`,
        name,
        nameEn,
        category: safeText(item.category) || "기타",
        source: "fridge" as const,
      };
    })
    .filter(
      (
        item,
      ): item is {
        id: string;
        name: string;
        nameEn: string;
        category: string;
        source: "fridge";
      } => Boolean(item),
    );

  if (fromModel.length > 0) {
    return fromModel;
  }

  return fallbackIngredientsFromFileNames(fallbackFileNames);
}

function buildFallback(fileNames: string[]) {
  const ingredients = fallbackIngredientsFromFileNames(fileNames);
  return {
    ingredients,
    confidence: 0.4,
    source: "fallback",
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { images?: unknown; model?: unknown };
    if (!Array.isArray(body.images) || body.images.length === 0) {
      throw new Error("images must be a non-empty array.");
    }

    const parsedImages: UploadedImage[] = body.images
      .filter((item): item is UploadedImage => Boolean(item && typeof item === "object"))
      .slice(0, 10);

    if (parsedImages.length === 0) {
      throw new Error("No valid image payloads were provided.");
    }

    const fallbackFileNames = parsedImages.map((image) => safeText(image.name) || "upload");

    const parts = parsedImages.map((image) => {
      const rawDataUrl = safeText(image.dataUrl);
      if (!rawDataUrl) {
        throw new Error("Each image requires dataUrl.");
      }
      const parsed = parseDataUrl(rawDataUrl);
      return {
        inlineData: {
          mimeType: safeText(image.mimeType) || parsed.mimeType,
          data: parsed.data,
        },
      };
    });

    const model =
      typeof body.model === "string" && body.model.trim()
        ? body.model.trim()
        : DEFAULT_MODEL;

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [{ text: buildIngredientAnalysisPrompt() }, ...parts],
          },
        ],
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
        return NextResponse.json(buildFallback(fallbackFileNames));
      }

      const parsed = parseModelJson<IngredientAnalysisJson>(text);
      const ingredients = normalizeIngredients(parsed, fallbackFileNames);
      const confidence =
        typeof parsed.confidence === "number"
          ? Math.max(0, Math.min(1, parsed.confidence))
          : 0.75;

      return NextResponse.json({
        ingredients,
        confidence,
        source: "model",
      });
    } catch {
      return NextResponse.json(buildFallback(fallbackFileNames));
    }
  } catch (error) {
    return NextResponse.json(
      { error: toErrorMessage(error) },
      { status: 400 },
    );
  }
}
