import { NextRequest, NextResponse } from "next/server";

import { getGeminiClient } from "@/lib/gemini";

export const runtime = "nodejs";

const DEFAULT_VIDEO_MODEL = "veo-2.0-generate-001";
const POLL_INTERVAL_MS = 10_000;
const MAX_POLL_ATTEMPTS = 30;

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { model?: unknown; prompt?: unknown };
    const model =
      typeof body.model === "string" && body.model.trim()
        ? body.model.trim()
        : DEFAULT_VIDEO_MODEL;

    if (typeof body.prompt !== "string" || !body.prompt.trim()) {
      throw new Error("prompt must be a non-empty string.");
    }

    const ai = getGeminiClient();
    let operation = await ai.models.generateVideos({
      model,
      source: { prompt: body.prompt.trim() },
      config: { numberOfVideos: 1 },
    });

    for (let i = 0; !operation.done && i < MAX_POLL_ATTEMPTS; i += 1) {
      await sleep(POLL_INTERVAL_MS);
      operation = await ai.operations.getVideosOperation({ operation });
    }

    if (!operation.done) {
      throw new Error(
        "Timed out while waiting for video generation. Try again with a shorter prompt.",
      );
    }

    if (operation.error) {
      throw new Error(JSON.stringify(operation.error));
    }

    const video = operation.response?.generatedVideos?.[0]?.video;
    if (!video?.uri) {
      throw new Error("No generated video URI was returned.");
    }

    const mimeType = video.mimeType ?? "video/mp4";
    const proxyUrl = `/api/gemini/video/download?uri=${encodeURIComponent(video.uri)}&mimeType=${encodeURIComponent(mimeType)}`;

    return NextResponse.json({
      operationName: operation.name ?? null,
      videoUri: video.uri,
      mimeType,
      proxyUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: toErrorMessage(error) },
      { status: 400 },
    );
  }
}
