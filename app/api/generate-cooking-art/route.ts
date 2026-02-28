import { Modality } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

import { fallbackImageDataUrl } from "@/lib/game-fallbacks";
import { getGeminiClient } from "@/lib/gemini";
import { buildCookingArtPrompt } from "@/lib/prompts";

export const runtime = "nodejs";

const DEFAULT_MODEL = "gemini-3-pro-image-preview";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { resultName?: unknown; model?: unknown };
    const resultName =
      typeof body.resultName === "string" && body.resultName.trim()
        ? body.resultName.trim()
        : "";
    if (!resultName) {
      throw new Error("resultName must be a non-empty string.");
    }

    const model =
      typeof body.model === "string" && body.model.trim()
        ? body.model.trim()
        : DEFAULT_MODEL;

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model,
        contents: buildCookingArtPrompt(resultName),
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
      });
      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const imagePart = parts.find((part) => part.inlineData?.data);
      const imageBase64 = imagePart?.inlineData?.data;
      const mimeType = imagePart?.inlineData?.mimeType ?? "image/png";

      if (imageBase64) {
        return NextResponse.json({
          imageDataUrl: `data:${mimeType};base64,${imageBase64}`,
          source: "model",
        });
      }
    } catch {
      // Falls through to placeholder.
    }

    return NextResponse.json({
      imageDataUrl: fallbackImageDataUrl(resultName, "#7ed957"),
      source: "fallback",
    });
  } catch (error) {
    return NextResponse.json(
      { error: toErrorMessage(error) },
      { status: 400 },
    );
  }
}

