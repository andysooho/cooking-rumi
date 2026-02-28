"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";

type ChatRole = "user" | "model";

type ChatMessage = {
  role: ChatRole;
  text: string;
};

const DEFAULT_CHAT_MODEL = "gemini-2.5-flash";
const DEFAULT_IMAGE_MODEL = "gemini-3-pro-image-preview";
const DEFAULT_VIDEO_MODEL = "veo-2.0-generate-001";

async function postJson<TResponse>(
  url: string,
  payload: unknown,
): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMessage = "Request failed.";
    try {
      const json = (await response.json()) as { error?: string };
      if (typeof json.error === "string") {
        errorMessage = json.error;
      }
    } catch {
      errorMessage = `${errorMessage} (status: ${response.status})`;
    }
    throw new Error(errorMessage);
  }

  return (await response.json()) as TResponse;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}

export default function Home() {
  const [chatModel, setChatModel] = useState(DEFAULT_CHAT_MODEL);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const [imageModel, setImageModel] = useState(DEFAULT_IMAGE_MODEL);
  const [imagePrompt, setImagePrompt] = useState(
    "A cinematic sunset over Han River, detailed, realistic",
  );
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageText, setImageText] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const [videoModel, setVideoModel] = useState(DEFAULT_VIDEO_MODEL);
  const [videoPrompt, setVideoPrompt] = useState(
    "A small robot watering plants on a rooftop garden at sunrise, cinematic, smooth motion",
  );
  const [videoProxyUrl, setVideoProxyUrl] = useState<string | null>(null);
  const [videoSourceUri, setVideoSourceUri] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  const submitChat = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (chatLoading) {
      return;
    }

    const prompt = chatInput.trim();
    if (!prompt) {
      setChatError("메시지를 입력하세요.");
      return;
    }

    const previousMessages = chatMessages;
    const nextMessages: ChatMessage[] = [
      ...previousMessages,
      { role: "user", text: prompt },
    ];

    setChatLoading(true);
    setChatError(null);
    setChatInput("");
    setChatMessages(nextMessages);

    try {
      const response = await postJson<{ reply: string }>("/api/gemini/chat", {
        model: chatModel,
        messages: nextMessages,
      });

      setChatMessages([...nextMessages, { role: "model", text: response.reply }]);
    } catch (error) {
      setChatMessages(previousMessages);
      setChatInput(prompt);
      setChatError(getErrorMessage(error));
    } finally {
      setChatLoading(false);
    }
  };

  const submitImage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (imageLoading) {
      return;
    }

    if (!imagePrompt.trim()) {
      setImageError("프롬프트를 입력하세요.");
      return;
    }

    setImageLoading(true);
    setImageError(null);
    setImageDataUrl(null);
    setImageText("");

    try {
      const response = await postJson<{
        imageDataUrl: string;
        text?: string;
      }>("/api/gemini/image", {
        model: imageModel,
        prompt: imagePrompt,
      });
      setImageDataUrl(response.imageDataUrl);
      setImageText(response.text ?? "");
    } catch (error) {
      setImageError(getErrorMessage(error));
    } finally {
      setImageLoading(false);
    }
  };

  const submitVideo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (videoLoading) {
      return;
    }

    if (!videoPrompt.trim()) {
      setVideoError("프롬프트를 입력하세요.");
      return;
    }

    setVideoLoading(true);
    setVideoError(null);
    setVideoProxyUrl(null);
    setVideoSourceUri(null);

    try {
      const response = await postJson<{
        proxyUrl: string;
        videoUri: string;
      }>("/api/gemini/video", {
        model: videoModel,
        prompt: videoPrompt,
      });
      setVideoProxyUrl(response.proxyUrl);
      setVideoSourceUri(response.videoUri);
    } catch (error) {
      setVideoError(getErrorMessage(error));
    } finally {
      setVideoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f5f3ff_0%,#eaf4ff_40%,#f8fafc_100%)] px-4 py-8 md:px-8 md:py-10">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200/70 bg-white/85 p-6 shadow-lg backdrop-blur md:p-8">
          <p className="text-sm font-semibold tracking-[0.2em] text-indigo-600">
            GEMINI SDK TEST LAB
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 md:text-4xl">
            Chat, Image, Video Playground
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-700 md:text-base">
            `GEMINI_API_KEY`를 서버에서 사용해 채팅, 이미지 생성(Nano Banana
            Pro), 비디오 생성(Veo) 기능을 한 페이지에서 테스트합니다.
          </p>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-xl font-semibold text-slate-900">1) 채팅 테스트</h2>
            <form className="mt-4 space-y-3" onSubmit={submitChat}>
              <label className="block text-sm font-medium text-slate-700">
                Model
              </label>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-indigo-300 transition focus:ring"
                value={chatModel}
                onChange={(event) => setChatModel(event.target.value)}
                placeholder={DEFAULT_CHAT_MODEL}
              />

              <label className="block text-sm font-medium text-slate-700">
                Message
              </label>
              <div className="flex gap-2">
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-indigo-300 transition focus:ring"
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="예: 서울 맛집 추천 3개 알려줘"
                />
                <button
                  type="submit"
                  disabled={chatLoading}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                >
                  {chatLoading ? "전송중..." : "전송"}
                </button>
              </div>
            </form>

            <div className="mt-4 max-h-80 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
              {chatMessages.length === 0 ? (
                <p className="text-sm text-slate-500">대화를 시작해 보세요.</p>
              ) : (
                chatMessages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`rounded-xl px-3 py-2 text-sm ${
                      message.role === "user"
                        ? "ml-auto w-fit max-w-[90%] bg-indigo-600 text-white"
                        : "mr-auto w-fit max-w-[90%] bg-white text-slate-800"
                    }`}
                  >
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider opacity-70">
                      {message.role}
                    </p>
                    <p className="whitespace-pre-wrap">{message.text}</p>
                  </div>
                ))
              )}
            </div>
            {chatError ? (
              <p className="mt-3 text-sm text-rose-600">{chatError}</p>
            ) : null}
          </article>

          <article className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-xl font-semibold text-slate-900">
              2) 이미지 생성 테스트
            </h2>
            <form className="mt-4 space-y-3" onSubmit={submitImage}>
              <label className="block text-sm font-medium text-slate-700">
                Model
              </label>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-300 transition focus:ring"
                value={imageModel}
                onChange={(event) => setImageModel(event.target.value)}
                placeholder={DEFAULT_IMAGE_MODEL}
              />

              <label className="block text-sm font-medium text-slate-700">
                Prompt
              </label>
              <textarea
                className="h-24 w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-300 transition focus:ring"
                value={imagePrompt}
                onChange={(event) => setImagePrompt(event.target.value)}
              />

              <button
                type="submit"
                disabled={imageLoading}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                {imageLoading ? "생성중..." : "이미지 생성"}
              </button>
            </form>

            {imageError ? (
              <p className="mt-3 text-sm text-rose-600">{imageError}</p>
            ) : null}

            {imageDataUrl ? (
              <div className="mt-4 space-y-3">
                <Image
                  src={imageDataUrl}
                  alt="Generated by Gemini"
                  width={1024}
                  height={1024}
                  unoptimized
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 object-cover"
                />
                {imageText ? (
                  <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                    {imageText}
                  </p>
                ) : null}
              </div>
            ) : null}
          </article>
        </section>

        <section className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-xl font-semibold text-slate-900">
            3) 비디오 생성 테스트
          </h2>
          <form className="mt-4 space-y-3" onSubmit={submitVideo}>
            <label className="block text-sm font-medium text-slate-700">
              Model
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-orange-300 transition focus:ring"
              value={videoModel}
              onChange={(event) => setVideoModel(event.target.value)}
              placeholder={DEFAULT_VIDEO_MODEL}
            />

            <label className="block text-sm font-medium text-slate-700">
              Prompt
            </label>
            <textarea
              className="h-24 w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-orange-300 transition focus:ring"
              value={videoPrompt}
              onChange={(event) => setVideoPrompt(event.target.value)}
            />

            <button
              type="submit"
              disabled={videoLoading}
              className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300"
            >
              {videoLoading ? "생성 대기중... (수십초~수분)" : "비디오 생성"}
            </button>
          </form>

          {videoError ? (
            <p className="mt-3 text-sm text-rose-600">{videoError}</p>
          ) : null}

          {videoProxyUrl ? (
            <div className="mt-4 space-y-3">
              <video
                src={videoProxyUrl}
                controls
                className="w-full rounded-2xl border border-slate-200 bg-slate-100"
              />
              {videoSourceUri ? (
                <p className="break-all rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                  source: {videoSourceUri}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
