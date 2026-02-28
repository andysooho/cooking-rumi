import { Modality } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

import { fallbackImageDataUrl } from "@/lib/game-fallbacks";
import { getGeminiClient } from "@/lib/gemini";
import { buildPixelArtPrompt } from "@/lib/prompts";

export const runtime = "nodejs";

const DEFAULT_MODEL = "gemini-3-pro-image-preview";

type IngredientInput = {
  name?: unknown;
  nameEn?: unknown;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}

function normalizeName(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      ingredients?: unknown;
      model?: unknown;
    };

    if (!Array.isArray(body.ingredients) || body.ingredients.length === 0) {
      throw new Error("ingredients must be a non-empty array.");
    }

    const model =
      typeof body.model === "string" && body.model.trim()
        ? body.model.trim()
        : DEFAULT_MODEL;

    const ingredients = body.ingredients
      .filter((item): item is IngredientInput => Boolean(item && typeof item === "object"))
      .slice(0, 12);

    const ai = getGeminiClient();

    const sprites: Record<string, string> = {};
    await Promise.all(
      ingredients.map(async (ingredient, index) => {
        const name = normalizeName(ingredient.name, `재료${index + 1}`);
        const nameEn = normalizeName(ingredient.nameEn, `ingredient ${index + 1}`);

        try {
          const response = await ai.models.generateContent({
            model,
            contents: buildPixelArtPrompt(nameEn),
            config: {
              responseModalities: [Modality.TEXT, Modality.IMAGE],
            },
          });
          const parts = response.candidates?.[0]?.content?.parts ?? [];
          const imagePart = parts.find((part) => part.inlineData?.data);
          const imageBase64 = imagePart?.inlineData?.data;
          const mimeType = imagePart?.inlineData?.mimeType ?? "image/png";

          if (imageBase64) {
            sprites[name] = `data:${mimeType};base64,${imageBase64}`;
            return;
          }
        } catch {
          // Use a deterministic fallback if model image generation fails.
        }

        sprites[name] = fallbackImageDataUrl(name);
      }),
    );

    return NextResponse.json({
      sprites,
      source: "best-effort",
    });
  } catch (error) {
    return NextResponse.json(
      { error: toErrorMessage(error) },
      { status: 400 },
    );
  }
}

