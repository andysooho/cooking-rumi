import { NextRequest, NextResponse } from "next/server";

import { getGeminiClient } from "@/lib/gemini";

export const runtime = "nodejs";

const DEFAULT_CHAT_MODEL = "gemini-2.5-flash";

type ChatMessage = {
  role: "user" | "model";
  text: string;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}

function parseMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error("messages must be a non-empty array.");
  }

  return input.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`messages[${index}] is invalid.`);
    }

    const role = "role" in item ? item.role : undefined;
    const text = "text" in item ? item.text : undefined;

    if (role !== "user" && role !== "model") {
      throw new Error(`messages[${index}].role must be 'user' or 'model'.`);
    }

    if (typeof text !== "string" || !text.trim()) {
      throw new Error(`messages[${index}].text must be a non-empty string.`);
    }

    return { role, text: text.trim() };
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      model?: unknown;
      messages?: unknown;
    };

    const model =
      typeof body.model === "string" && body.model.trim()
        ? body.model.trim()
        : DEFAULT_CHAT_MODEL;
    const messages = parseMessages(body.messages);

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model,
      contents: messages.map((message) => ({
        role: message.role,
        parts: [{ text: message.text }],
      })),
    });

    const reply =
      response.text?.trim() ??
      response.candidates?.[0]?.content?.parts
        ?.map((part) => part.text?.trim())
        .filter((text): text is string => Boolean(text))
        .join("\n")
        .trim() ??
      "";

    if (!reply) {
      throw new Error("Model returned an empty response.");
    }

    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json(
      { error: toErrorMessage(error) },
      { status: 400 },
    );
  }
}
