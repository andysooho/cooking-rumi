import { Modality } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

import { getGeminiClient } from "@/lib/gemini";

export const runtime = "nodejs";

const DEFAULT_IMAGE_MODEL = "gemini-3.1-flash-image-preview";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { model?: unknown; prompt?: unknown };
    const model =
      typeof body.model === "string" && body.model.trim()
        ? body.model.trim()
        : DEFAULT_IMAGE_MODEL;

    if (typeof body.prompt !== "string" || !body.prompt.trim()) {
      throw new Error("prompt must be a non-empty string.");
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model,
      contents: body.prompt.trim(),
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((part) => part.inlineData?.data);
    const text = parts
      .map((part) => part.text?.trim())
      .filter((value): value is string => Boolean(value))
      .join("\n")
      .trim();

    const imageBase64 = imagePart?.inlineData?.data;
    const mimeType = imagePart?.inlineData?.mimeType ?? "image/png";

    if (!imageBase64) {
      throw new Error(
        "Image data was not returned. Try a more explicit image-generation prompt.",
      );
    }

    return NextResponse.json({
      text,
      mimeType,
      imageDataUrl: `data:${mimeType};base64,${imageBase64}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: toErrorMessage(error) },
      { status: 400 },
    );
  }
}
