import { NextRequest, NextResponse } from "next/server";

import { parseModelJson, safeText } from "@/lib/ai-json";
import { fallbackCookingAction } from "@/lib/game-fallbacks";
import { getGeminiClient } from "@/lib/gemini";
import { buildCookingActionPrompt } from "@/lib/prompts";
import type { CookingActionResponse } from "@/types/game";

export const runtime = "nodejs";

const DEFAULT_MODEL = "gemini-2.0-flash-lite";
const cache = new Map<string, CookingActionResponse>();

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}

function normalizeResponse(payload: Partial<CookingActionResponse>): CookingActionResponse {
  const result = safeText(payload.result);
  const reaction = safeText(payload.reaction);

  if (!result || !reaction) {
    throw new Error("Model response is missing result/reaction.");
  }

  return {
    result,
    resultEn: safeText(payload.resultEn),
    reaction,
    emoji: safeText(payload.emoji),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      ingredient?: unknown;
      tool?: unknown;
      model?: unknown;
    };

    const ingredient = safeText(body.ingredient);
    const tool = safeText(body.tool);
    if (!ingredient || !tool) {
      throw new Error("ingredient and tool are required.");
    }

    const key = `${ingredient}|${tool}`.toLowerCase();
    const cached = cache.get(key);
    if (cached) {
      return NextResponse.json({ ...cached, source: "cache" });
    }

    const model =
      typeof body.model === "string" && body.model.trim()
        ? body.model.trim()
        : DEFAULT_MODEL;

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model,
        contents: buildCookingActionPrompt(ingredient, tool),
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
        throw new Error("Model response is empty.");
      }

      const parsed = parseModelJson<Partial<CookingActionResponse>>(text);
      const normalized = normalizeResponse(parsed);
      cache.set(key, normalized);
      return NextResponse.json({ ...normalized, source: "model" });
    } catch {
      const fallback = fallbackCookingAction(ingredient, tool);
      cache.set(key, fallback);
      return NextResponse.json({ ...fallback, source: "fallback" });
    }
  } catch (error) {
    return NextResponse.json(
      { error: toErrorMessage(error) },
      { status: 400 },
    );
  }
}

