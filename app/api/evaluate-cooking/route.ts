import { NextRequest, NextResponse } from "next/server";

import { parseModelJson, safeText } from "@/lib/ai-json";
import { fallbackEvaluation } from "@/lib/game-fallbacks";
import { getGeminiClient } from "@/lib/gemini";
import { buildEvaluationPrompt } from "@/lib/prompts";
import type { CookingEvaluation, CookingLog, GameMode, RecipePlan } from "@/types/game";

export const runtime = "nodejs";

const DEFAULT_MODEL = "gemini-2.5-flash";

type EvaluationPayload = Partial<CookingEvaluation>;

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}

function parseMode(value: unknown): GameMode {
  return value === "creative" ? "creative" : "delicious";
}

function normalizeLogs(input: unknown): CookingLog[] {
  if (!Array.isArray(input)) {
    return [];
  }
  return input
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const id = "id" in item ? safeText(item.id) : "";
      const action = "action" in item ? safeText(item.action) : "";
      const ingredient = "ingredient" in item ? safeText(item.ingredient) : "";
      const tool = "tool" in item ? safeText(item.tool) : "";
      const result = "result" in item ? safeText(item.result) : "";
      const reaction = "reaction" in item ? safeText(item.reaction) : "";
      const createdAt = "createdAt" in item ? safeText(item.createdAt) : "";
      if (!action || !ingredient || !tool || !result) {
        return null;
      }
      return {
        id: id || crypto.randomUUID(),
        action,
        ingredient,
        tool,
        result,
        reaction: reaction || "좋은 시도야!",
        createdAt: createdAt || new Date().toISOString(),
      };
    })
    .filter((item): item is CookingLog => Boolean(item));
}

function normalizeEvaluation(
  payload: EvaluationPayload,
  fallback: CookingEvaluation,
): CookingEvaluation {
  const rate =
    typeof payload.matchRate === "number" && Number.isFinite(payload.matchRate)
      ? Math.max(0, Math.min(100, Math.round(payload.matchRate)))
      : fallback.matchRate;
  const missed = Array.isArray(payload.missedSteps)
    ? payload.missedSteps.map((item) => safeText(item)).filter(Boolean).slice(0, 4)
    : fallback.missedSteps;
  const bonus = Array.isArray(payload.bonusPoints)
    ? payload.bonusPoints.map((item) => safeText(item)).filter(Boolean).slice(0, 4)
    : fallback.bonusPoints;

  return {
    matchRate: rate,
    evaluation: safeText(payload.evaluation) || fallback.evaluation,
    missedSteps: missed.length > 0 ? missed : fallback.missedSteps,
    bonusPoints: bonus.length > 0 ? bonus : fallback.bonusPoints,
    fullRecipeNarrative:
      safeText(payload.fullRecipeNarrative) || fallback.fullRecipeNarrative,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      mode?: unknown;
      recipe?: unknown;
      logs?: unknown;
      finalDish?: unknown;
      model?: unknown;
    };

    if (!body.recipe || typeof body.recipe !== "object") {
      throw new Error("recipe is required.");
    }

    const mode = parseMode(body.mode);
    const recipe = body.recipe as RecipePlan;
    const logs = normalizeLogs(body.logs);
    const finalDish = safeText(body.finalDish) || "미완성 요리";
    const fallback = fallbackEvaluation(mode, recipe, logs, finalDish);

    if (logs.length === 0) {
      return NextResponse.json({
        evaluation: fallback,
        source: "fallback",
      });
    }

    const model =
      typeof body.model === "string" && body.model.trim()
        ? body.model.trim()
        : DEFAULT_MODEL;

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model,
        contents: buildEvaluationPrompt(mode, recipe, logs, finalDish),
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

      const parsed = parseModelJson<EvaluationPayload>(text);
      return NextResponse.json({
        evaluation: normalizeEvaluation(parsed, fallback),
        source: "model",
      });
    } catch {
      return NextResponse.json({
        evaluation: fallback,
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

