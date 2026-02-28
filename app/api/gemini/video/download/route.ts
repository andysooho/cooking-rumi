import { NextRequest, NextResponse } from "next/server";

import { getGeminiApiKey } from "@/lib/gemini";

export const runtime = "nodejs";

const ALLOWED_HOST_SUFFIXES = ["googleapis.com", "googleusercontent.com"];

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}

function isAllowedUri(uri: string): boolean {
  try {
    const parsed = new URL(uri);
    if (parsed.protocol !== "https:") {
      return false;
    }

    return ALLOWED_HOST_SUFFIXES.some(
      (suffix) =>
        parsed.hostname === suffix || parsed.hostname.endsWith(`.${suffix}`),
    );
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const uri = request.nextUrl.searchParams.get("uri");
    const mimeTypeHint = request.nextUrl.searchParams.get("mimeType");

    if (!uri || !isAllowedUri(uri)) {
      return NextResponse.json(
        { error: "A valid Google-hosted video URI is required." },
        { status: 400 },
      );
    }

    const upstream = await fetch(uri, {
      headers: { "x-goog-api-key": getGeminiApiKey() },
    });

    if (!upstream.ok) {
      const detail = (await upstream.text()).slice(0, 1000);
      throw new Error(
        `Video download failed (${upstream.status}): ${detail || "No details"}`,
      );
    }

    const headers = new Headers();
    headers.set(
      "Content-Type",
      upstream.headers.get("content-type") ?? mimeTypeHint ?? "video/mp4",
    );
    headers.set("Cache-Control", "no-store");

    if (upstream.body) {
      return new NextResponse(upstream.body, { status: 200, headers });
    }

    const buffer = await upstream.arrayBuffer();
    return new NextResponse(buffer, { status: 200, headers });
  } catch (error) {
    return NextResponse.json(
      { error: toErrorMessage(error) },
      { status: 400 },
    );
  }
}
