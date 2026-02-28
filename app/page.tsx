"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { playBgmForScreen, playSfx, playSfxForTool, stopBgm } from "@/lib/audio";

import type {
  CookingActionResponse,
  CookingEvaluation,
  CookingLog,
  GameMode,
  Ingredient,
  RecipePlan,
} from "@/types/game";

type Screen =
  | "title"
  | "upload"
  | "confirm"
  | "preparing"
  | "hint"
  | "cooking"
  | "result";

type UploadedImage = {
  name: string;
  mimeType: string;
  dataUrl: string;
};

type PrepStatus = "idle" | "loading" | "done" | "fallback";

type ToolDef = {
  id: string;
  name: string;
  emoji: string;
  assetPath: string;
};

const DEFAULT_ANALYZE_MODEL = "gemini-2.5-flash";
const DEFAULT_ACTION_MODEL = "gemini-2.0-flash-lite";
const DEFAULT_RECIPE_MODEL = "gemini-2.5-flash";
const DEFAULT_IMAGE_MODEL = "gemini-3-pro-image-preview";

const TOOLS: ToolDef[] = [
  {
    id: "board",
    name: "도마",
    emoji: "🔪",
    assetPath: "/assets/tools/cutting-board.png",
  },
  {
    id: "pan",
    name: "프라이팬",
    emoji: "🍳",
    assetPath: "/assets/tools/frying-pan.png",
  },
  {
    id: "pot",
    name: "냄비",
    emoji: "🫕",
    assetPath: "/assets/tools/pot.png",
  },
  {
    id: "stove",
    name: "화로",
    emoji: "🔥",
    assetPath: "/assets/tools/stove.png",
  },
  {
    id: "mixing-bowl",
    name: "믹싱볼",
    emoji: "🥣",
    assetPath: "/assets/tools/mixing-bowl.png",
  },
  {
    id: "oven",
    name: "오븐",
    emoji: "♨️",
    assetPath: "/assets/tools/oven.png",
  },
  {
    id: "grill",
    name: "그릴",
    emoji: "🥩",
    assetPath: "/assets/tools/grill.png",
  },
];

const SCREEN_ORDER: Screen[] = [
  "title",
  "upload",
  "confirm",
  "preparing",
  "hint",
  "cooking",
  "result",
];

const SCREEN_LABELS: Record<Screen, string> = {
  title: "모드 선택",
  upload: "재료 업로드",
  confirm: "재료 확인",
  preparing: "준비 중",
  hint: "힌트",
  cooking: "쿠킹",
  result: "결과",
};

const SCREEN_BACKGROUNDS: Record<Screen, string> = {
  title: "/assets/backgrounds/title-bg.png",
  upload: "/assets/backgrounds/title-bg.png",
  confirm: "/assets/backgrounds/title-bg.png",
  preparing: "/assets/backgrounds/cooking-bg.png",
  hint: "/assets/backgrounds/cooking-bg.png",
  cooking: "/assets/backgrounds/cooking-bg.png",
  result: "/assets/backgrounds/result-bg.png",
};

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
      const json = (await response.json()) as { error?: unknown };
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

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

function modeLabel(mode: GameMode): string {
  return mode === "delicious" ? "맛있는 음식" : "창의적인 음식";
}

function modeDescription(mode: GameMode): string {
  return mode === "delicious"
    ? "정통 조리법과 일치하는 최고의 한 끼를 완성하세요."
    : "재료를 과감하게 조합해 세상에 없는 퓨전 요리를 만드세요.";
}

function createEmergencyRecipe(mode: GameMode, ingredients: Ingredient[]): RecipePlan {
  const hasPasta = ingredients.some((item) => item.name.includes("파스타"));
  const hasTomato = ingredients.some((item) => item.name.includes("토마토"));

  const dishName =
    hasPasta && hasTomato
      ? mode === "delicious"
        ? "토마토 파스타"
        : "퓨전 토마토 파스타"
      : mode === "delicious"
        ? "냉장고 스페셜"
        : "루미 퓨전 스페셜";

  return {
    dishName,
    dishNameEn: "Rumi Special",
    description:
      mode === "delicious"
        ? "재료의 풍미를 안정적으로 살리는 정석형 레시피"
        : "중간 재료를 다시 조리해 새로운 조합을 만드는 실험형 레시피",
    hints:
      mode === "delicious"
        ? [
          "향채를 먼저 손질하면 풍미가 좋아져.",
          "소스 베이스를 먼저 잡는 요리야.",
          "중간 재료를 조합해 완성해봐.",
        ]
        : [
          "재료를 한 번 이상 변형해봐.",
          "같은 재료를 다른 도구로 다시 조리해도 좋아.",
          "마지막엔 조합의 의외성이 핵심이야.",
        ],
    recipe: {
      steps: [
        {
          order: 1,
          action: "향채를 손질한다",
          tool: "도마",
          ingredients: ["양파", "마늘"],
          result: "손질한 향채",
        },
        {
          order: 2,
          action: "기본 재료를 익힌다",
          tool: "프라이팬",
          ingredients: ["손질한 향채"],
          result: "볶은 베이스",
        },
        {
          order: 3,
          action: "소스를 조리한다",
          tool: "냄비",
          ingredients: ["토마토"],
          result: "베이스 소스",
        },
        {
          order: 4,
          action: "완성 재료를 섞는다",
          tool: "믹싱볼",
          ingredients: ["볶은 베이스", "베이스 소스"],
          result: dishName,
        },
      ],
      tips: "중간 결과물을 다시 조리하면 점수가 올라갑니다.",
      totalTime: "20분",
    },
  };
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
        return;
      }
      reject(new Error("파일을 읽을 수 없습니다."));
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("파일 읽기 중 오류가 발생했습니다."));
    };
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("title");
  const [mode, setMode] = useState<GameMode>("delicious");

  // BGM: auto-switch on screen change
  useEffect(() => {
    playBgmForScreen(screen);
    return () => { };
  }, [screen]);

  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [analysisConfidence, setAnalysisConfidence] = useState<number | null>(null);
  const [analysisSource, setAnalysisSource] = useState<string>("-");

  const [recipe, setRecipe] = useState<RecipePlan | null>(null);
  const [prepareSpritesStatus, setPrepareSpritesStatus] =
    useState<PrepStatus>("idle");
  const [prepareRecipeStatus, setPrepareRecipeStatus] = useState<PrepStatus>("idle");

  const [rumiMessage, setRumiMessage] = useState(
    "오늘 냉장고 재료로 어떤 요리를 만들지 궁금해!",
  );
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const [cookingLogs, setCookingLogs] = useState<CookingLog[]>([]);
  const [currentDishName, setCurrentDishName] = useState("");

  const [evaluation, setEvaluation] = useState<CookingEvaluation | null>(null);
  const [finalDishArt, setFinalDishArt] = useState<string | null>(null);

  const [selectedIngredientIds, setSelectedIngredientIds] = useState<Set<string>>(new Set());
  const [showHintModal, setShowHintModal] = useState(false);
  const [loadingArtIds, setLoadingArtIds] = useState<Set<string>>(new Set());

  const stagePercent =
    (SCREEN_ORDER.indexOf(screen) / (SCREEN_ORDER.length - 1)) * 100;

  const inventory = useMemo(() => {
    return ingredients.slice().reverse();
  }, [ingredients]);

  const finalDish = currentDishName || cookingLogs.at(-1)?.result || "미완성 요리";

  const canFinishCooking = cookingLogs.length >= 1;

  const toggleSelectIngredient = useCallback((id: string) => {
    setSelectedIngredientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onModeSelect = (nextMode: GameMode) => {
    playSfx("buttonClick");
    setMode(nextMode);
    setScreen("upload");
    setRumiMessage(
      nextMode === "delicious"
        ? "좋아! 정석으로 가장 맛있는 요리를 노려보자."
        : "좋아! 오늘은 실험적인 퓨전 요리로 가보자.",
    );
    setGlobalError(null);
  };

  const onPickFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }
    setUploading(true);
    setGlobalError(null);
    try {
      const selected = Array.from(files).slice(0, 10);
      const payload = await Promise.all(
        selected.map(async (file) => {
          const dataUrl = await fileToDataUrl(file);
          return {
            name: file.name,
            mimeType: file.type || "image/jpeg",
            dataUrl,
          };
        }),
      );
      setUploadedImages(payload);
      setRumiMessage(`총 ${payload.length}장의 재료 사진을 받았어. 분석을 시작해볼까?`);
    } catch (error) {
      setGlobalError(getErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const onAnalyzeIngredients = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isAnalyzing) {
      return;
    }
    if (uploadedImages.length === 0) {
      setGlobalError("먼저 재료 이미지를 업로드하세요.");
      return;
    }

    setIsAnalyzing(true);
    setGlobalError(null);

    try {
      const response = await postJson<{
        ingredients: Ingredient[];
        confidence: number;
        source: string;
      }>("/api/analyze-ingredients", {
        images: uploadedImages,
        model: DEFAULT_ANALYZE_MODEL,
      });

      const normalized = response.ingredients.map((item, index) => ({
        id: item.id || `${slugify(item.name)}-${index}`,
        name: item.name,
        nameEn: item.nameEn,
        category: item.category,
        imageDataUrl: item.imageDataUrl,
        source: "fridge" as const,
      }));

      setIngredients(normalized);
      setAnalysisConfidence(response.confidence);
      setAnalysisSource(response.source);
      setScreen("confirm");
      setRumiMessage(
        `오호~ 총 ${normalized.length}개의 재료를 찾았어. 맞으면 Yes를 눌러줘!`,
      );
    } catch (error) {
      setGlobalError(getErrorMessage(error));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onConfirmIngredients = async () => {
    if (ingredients.length === 0 || isPreparing) {
      return;
    }

    setScreen("preparing");
    setIsPreparing(true);
    setPrepareSpritesStatus("loading");
    setPrepareRecipeStatus("loading");
    setGlobalError(null);

    const recipePromise = postJson<{ recipe: RecipePlan }>("/api/select-recipe", {
      mode,
      ingredients,
      model: DEFAULT_RECIPE_MODEL,
    })
      .then((response) => {
        setPrepareRecipeStatus("done");
        return response.recipe;
      })
      .catch(() => {
        setPrepareRecipeStatus("fallback");
        return createEmergencyRecipe(mode, ingredients);
      });

    const spritePromise = postJson<{ sprites: Record<string, string> }>(
      "/api/generate-pixel-art",
      {
        ingredients,
        model: DEFAULT_IMAGE_MODEL,
      },
    )
      .then((response) => {
        setPrepareSpritesStatus("done");
        return response.sprites;
      })
      .catch(() => {
        setPrepareSpritesStatus("fallback");
        return {} as Record<string, string>;
      });

    try {
      const [selectedRecipe, sprites] = await Promise.all([
        recipePromise,
        spritePromise,
      ]);
      setRecipe(selectedRecipe);
      setIngredients((prev) =>
        prev.map((item) => ({
          ...item,
          imageDataUrl: sprites[item.name] || item.imageDataUrl,
        })),
      );
      setScreen("hint");
      setRumiMessage("힌트를 줄게. 준비됐다면 쿠킹 스테이지로 이동하자!");
    } finally {
      setIsPreparing(false);
    }
  };

  const onDropIngredientToTool = async (ingredientIds: string[], tool: ToolDef) => {
    if (isActionLoading) return;
    const selected = ingredients.filter((item) => ingredientIds.includes(item.id));
    if (selected.length === 0) return;

    setIsActionLoading(true);
    setGlobalError(null);

    try {
      const ingredientNames = selected.map((item) => item.name).join(" + ");
      const action = await postJson<CookingActionResponse>("/api/cooking-action", {
        ingredient: ingredientNames,
        tool: tool.name,
        model: DEFAULT_ACTION_MODEL,
      });

      const resultName = action.result || `${ingredientNames} 조리 결과`;
      const newIngredientId = `${slugify(resultName)}-${crypto.randomUUID().slice(0, 8)}`;

      const newIngredient: Ingredient = {
        id: newIngredientId,
        name: resultName,
        nameEn: action.resultEn,
        source: "cooked",
      };

      const newLog: CookingLog = {
        id: crypto.randomUUID(),
        ingredient: ingredientNames,
        tool: tool.name,
        action: `${ingredientNames} + ${tool.name}`,
        result: resultName,
        reaction: action.reaction,
        createdAt: new Date().toISOString(),
      };

      setIngredients((prev) => [...prev, newIngredient]);
      setCookingLogs((prev) => [...prev, newLog]);
      setRumiMessage(action.reaction || "좋아, 다음 단계로 이어가 보자!");
      setCurrentDishName(resultName);
      setSelectedIngredientIds(new Set());
      playSfxForTool(tool.name);

      setLoadingArtIds((prev) => new Set(prev).add(newIngredientId));
      void postJson<{ imageDataUrl: string }>("/api/generate-cooking-art", {
        resultName,
        model: DEFAULT_IMAGE_MODEL,
      })
        .then((response) => {
          setIngredients((prev) =>
            prev.map((item) =>
              item.id === newIngredientId
                ? { ...item, imageDataUrl: response.imageDataUrl }
                : item,
            ),
          );
        })
        .catch(() => { })
        .finally(() => {
          setLoadingArtIds((prev) => {
            const next = new Set(prev);
            next.delete(newIngredientId);
            return next;
          });
        });
    } catch (error) {
      setGlobalError(getErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  };

  const onFinishCooking = async () => {
    if (!recipe || !canFinishCooking || isEvaluating) {
      return;
    }

    setIsEvaluating(true);
    setGlobalError(null);
    playSfx("cookingComplete");

    try {
      const [evaluationResponse, finalArtResponse] = await Promise.all([
        postJson<{ evaluation: CookingEvaluation }>("/api/evaluate-cooking", {
          mode,
          recipe,
          logs: cookingLogs,
          finalDish,
        }),
        postJson<{ imageDataUrl: string }>("/api/generate-cooking-art", {
          resultName: finalDish,
          model: DEFAULT_IMAGE_MODEL,
        }).catch(() => ({ imageDataUrl: "" })),
      ]);

      setEvaluation(evaluationResponse.evaluation);
      setFinalDishArt(finalArtResponse.imageDataUrl || null);
      setScreen("result");
      setRumiMessage("평가를 완료했어! 결과를 확인해봐.");
    } catch (error) {
      setGlobalError(getErrorMessage(error));
    } finally {
      setIsEvaluating(false);
    }
  };

  const onRestart = () => {
    playSfx("buttonClick");
    stopBgm();
    setScreen("title");
    setMode("delicious");
    setUploadedImages([]);
    setIngredients([]);
    setAnalysisConfidence(null);
    setAnalysisSource("-");
    setRecipe(null);
    setPrepareSpritesStatus("idle");
    setPrepareRecipeStatus("idle");
    setCookingLogs([]);
    setCurrentDishName("");
    setEvaluation(null);
    setFinalDishArt(null);
    setGlobalError(null);
    setRumiMessage("오늘 냉장고 재료로 어떤 요리를 만들지 궁금해!");
    setSelectedIngredientIds(new Set());
    setShowHintModal(false);
    setLoadingArtIds(new Set());
  };

  const onShareResult = async () => {
    if (!evaluation || !recipe) {
      return;
    }

    const summary = [
      "[냉장고를 부탁해 결과]",
      `모드: ${modeLabel(mode)}`,
      `완성 요리: ${finalDish}`,
      `정답 요리: ${recipe.dishName}`,
      `일치율: ${evaluation.matchRate}%`,
      `평가: ${evaluation.evaluation}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(summary);
      setRumiMessage("결과를 클립보드에 복사했어. 친구에게 공유해봐!");
    } catch {
      setRumiMessage("클립보드 복사에 실패했어. 브라우저 권한을 확인해줘.");
    }
  };

  return (
    <div className={`fridge-game min-h-screen py-6 text-slate-100 ${screen === "cooking" ? "px-1 md:px-2" : "px-4 md:px-8"}`}>
      <main className={`mx-auto flex w-full flex-col gap-4 ${screen === "cooking" ? "max-w-7xl" : "max-w-6xl"}`}>
        <header className="rounded-3xl border border-orange-200/30 bg-slate-900/70 p-4 shadow-2xl backdrop-blur md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-40 overflow-hidden rounded-lg border border-amber-200/20 bg-slate-900/70">
                <Image
                  src="/assets/ui/game-logo.png"
                  alt="냉장고를 부탁해 로고"
                  fill
                  className="object-contain p-1"
                />
              </div>
              <p className="text-xs font-bold tracking-[0.2em] text-amber-300">
                Please, My Fridge!
              </p>
              <h1 className="mt-1 text-xl font-black text-amber-50 md:text-3xl">
                냉장고를 부탁해
              </h1>
            </div>
            <button
              type="button"
              onClick={onRestart}
              className="rounded-xl border border-amber-200/30 bg-amber-400/15 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-300/20"
            >
              처음으로
            </button>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400 transition-all"
              style={{ width: `${stagePercent}%` }}
            />
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-xs md:text-sm">
            {SCREEN_ORDER.map((item) => (
              <span
                key={item}
                className={`rounded-lg px-2 py-1 ${item === screen
                  ? "bg-amber-300 text-slate-900"
                  : "bg-slate-800 text-slate-300"
                  }`}
              >
                {SCREEN_LABELS[item]}
              </span>
            ))}
          </div>
        </header>

        <section className={`grid gap-4 ${screen === "cooking" ? "" : "lg:grid-cols-[2fr_1fr]"}`}>
          <article
            className={`relative overflow-hidden rounded-3xl border border-orange-200/20 bg-slate-900/75 shadow-xl backdrop-blur ${screen === "cooking" ? "p-2 md:p-3" : "p-4 md:p-6"}`}
            style={{
              backgroundImage: `linear-gradient(rgba(15,18,27,0.78), rgba(15,18,27,0.78)), url(${SCREEN_BACKGROUNDS[screen]})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {screen === "title" ? (
              <div className="space-y-6">
                <div className="rounded-2xl border border-orange-200/20 bg-black/25 p-4">
                  <p className="text-sm text-amber-100/90">
                    실제 냉장고 사진을 업로드하면 루미가 재료를 분석하고, 힌트 기반 요리
                    미션을 제공합니다.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {(["delicious", "creative"] as GameMode[]).map((candidate) => (
                    <button
                      key={candidate}
                      type="button"
                      onClick={() => onModeSelect(candidate)}
                      className="group rounded-2xl border border-orange-200/30 bg-slate-800/80 p-4 text-left transition hover:-translate-y-0.5 hover:border-amber-300"
                    >
                      <p className="text-lg font-bold text-amber-100">
                        {candidate === "delicious" ? "🍝 맛있는 음식" : "🧪 창의적인 음식"}
                      </p>
                      <p className="mt-2 text-sm text-slate-300">
                        {modeDescription(candidate)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {screen === "upload" ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-amber-200/20 bg-black/20 p-4">
                  <p className="text-sm text-amber-50">
                    현재 모드: <strong>{modeLabel(mode)}</strong>
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    냉장고 전체 사진과 개별 재료 사진을 최대 10장까지 업로드하세요.
                  </p>
                </div>

                <form onSubmit={onAnalyzeIngredients} className="space-y-3">
                  <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-amber-200/40 bg-slate-800/70 p-6 text-center transition hover:border-amber-300">
                    <span className="block text-sm font-semibold text-amber-100">
                      {uploading
                        ? "이미지 인코딩 중..."
                        : "이미지를 드롭하거나 클릭해서 선택"}
                    </span>
                    <span className="mt-1 block text-xs text-slate-300">
                      PNG/JPG/WebP, 최대 10장
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(event) => {
                        void onPickFiles(event.target.files);
                      }}
                      disabled={uploading || isAnalyzing}
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={isAnalyzing || uploading || uploadedImages.length === 0}
                    className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-amber-200/60"
                  >
                    {isAnalyzing ? "Gemini 분석 중..." : "재료 분석 시작"}
                  </button>
                </form>

                {uploadedImages.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {uploadedImages.map((image) => (
                      <div
                        key={image.name}
                        className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800"
                      >
                        <Image
                          src={image.dataUrl}
                          alt={image.name}
                          width={320}
                          height={240}
                          unoptimized
                          className="h-24 w-full object-cover"
                        />
                        <p className="truncate px-2 py-1 text-[10px] text-slate-300">
                          {image.name}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {screen === "confirm" ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-emerald-200/30 bg-emerald-500/10 p-4">
                  <p className="text-sm text-emerald-100">
                    분석 완료: {ingredients.length}개 재료 인식
                  </p>
                  <p className="mt-1 text-xs text-emerald-200/80">
                    confidence: {analysisConfidence?.toFixed(2) ?? "-"} / source:
                    {" "}
                    {analysisSource}
                  </p>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  {ingredients.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/80 p-3"
                    >
                      <span className="text-2xl">🥕</span>
                      <div>
                        <p className="text-sm font-semibold text-amber-100">{item.name}</p>
                        <p className="text-xs text-slate-300">{item.category || "기타"}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onConfirmIngredients}
                    className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-emerald-300"
                  >
                    ✅ Yes! 맞아요
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScreen("upload");
                      setRumiMessage("알겠어! 이미지를 다시 올려서 재분석해보자.");
                    }}
                    className="rounded-xl border border-rose-300/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20"
                  >
                    ❌ No, 다시 분석
                  </button>
                </div>
              </div>
            ) : null}

            {screen === "preparing" ? (
              <div className="space-y-4">
                <p className="text-sm text-amber-100">
                  루미가 요리를 고르고 픽셀 아트 에셋을 준비하고 있어...
                </p>
                <div className="space-y-2">
                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
                    <p className="text-sm text-slate-200">재료 픽셀 아트 생성</p>
                    <p className="mt-1 text-xs text-slate-300">status: {prepareSpritesStatus}</p>
                  </div>
                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
                    <p className="text-sm text-slate-200">요리 선정 및 레시피 생성</p>
                    <p className="mt-1 text-xs text-slate-300">status: {prepareRecipeStatus}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  {isPreparing ? "병렬 작업 진행 중..." : "준비가 완료되면 자동으로 다음 화면으로 이동합니다."}
                </p>
              </div>
            ) : null}

            {screen === "hint" ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-300">Mission Dish</p>
                  <h2 className="mt-1 text-2xl font-black text-amber-100">
                    {recipe?.dishName ?? "요리 준비 중"}
                  </h2>
                  <p className="mt-2 text-sm text-slate-200">{recipe?.description}</p>
                </div>

                <div className="space-y-2">
                  {(recipe?.hints ?? []).map((hint, index) => (
                    <div
                      key={`${hint}-${index}`}
                      className="rounded-xl border border-slate-700 bg-slate-800 p-3 text-sm text-slate-100"
                    >
                      💡 힌트 {index + 1}: {hint}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setScreen("cooking");
                    setRumiMessage("좋아, 이제 재료를 도구로 드래그해서 요리를 시작해봐!");
                  }}
                  className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-amber-300"
                >
                  🍳 쿠킹 스테이지 시작
                </button>
              </div>
            ) : null}

            {screen === "cooking" ? (
              <div className="space-y-3">
                {/* Top bar: mission + status + hint */}
                <div className="flex items-center justify-between rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-2">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-amber-400">🎯 Mission</p>
                      <p className="text-base font-black text-amber-100 md:text-lg">{recipe?.dishName ?? "요리"}</p>
                    </div>
                    {cookingLogs.length > 0 && (
                      <span className="rounded-lg bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                        STEP {cookingLogs.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isActionLoading && (
                      <span className="flex items-center gap-2 rounded-lg border border-amber-300/30 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-200">
                        <span className="loading-spinner loading-spinner-sm" /> 조리 중...
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowHintModal(true)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-300/40 bg-amber-400/15 text-lg transition hover:bg-amber-300/25 animate-float"
                      title="힌트 다시 보기"
                    >
                      ❓
                    </button>
                  </div>
                </div>

                {globalError && (
                  <div className="rounded-xl border border-rose-300/40 bg-rose-500/10 p-3 text-sm text-rose-100">
                    {globalError}
                  </div>
                )}

                {/* === 3-Column Game Layout === */}
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1fr_200px_1fr]">

                  {/* ── LEFT: Ingredient Tray ── */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold tracking-wider text-amber-300">🧊 재료</h3>
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                        {selectedIngredientIds.size > 0 ? `${selectedIngredientIds.size}개 선택` : "클릭 선택"}
                      </span>
                    </div>
                    <div className="game-scrollbar grid max-h-[58vh] grid-cols-3 gap-1 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-800/60 p-1.5">
                      {inventory.map((item) => {
                        const isSelected = selectedIngredientIds.has(item.id);
                        const isLoadingArt = loadingArtIds.has(item.id);
                        return (
                          <div
                            key={item.id}
                            draggable
                            onClick={() => toggleSelectIngredient(item.id)}
                            onDragStart={(event) => {
                              const ids = isSelected
                                ? Array.from(selectedIngredientIds)
                                : [item.id];
                              event.dataTransfer.setData("text/plain", JSON.stringify(ids));
                            }}
                            className={`ingredient-card cursor-grab rounded-xl border bg-slate-900/70 p-1.5 active:cursor-grabbing ${isSelected ? "selected border-amber-400/80" : "border-slate-600"
                              }`}
                          >
                            <div className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
                              {isLoadingArt ? (
                                <span className="loading-spinner loading-spinner-sm" />
                              ) : item.imageDataUrl ? (
                                <Image
                                  src={item.imageDataUrl}
                                  alt={item.name}
                                  width={56}
                                  height={56}
                                  unoptimized
                                  className="h-14 w-14 object-contain"
                                />
                              ) : (
                                <span className="text-[10px] text-slate-400">{item.name.slice(0, 4)}</span>
                              )}
                            </div>
                            <p className="mt-1 line-clamp-1 text-center text-[10px] font-semibold text-slate-200">
                              {item.name}
                            </p>
                            <p className="text-center text-[9px] text-slate-500">
                              {item.source === "fridge" ? "원재료" : "중간결과"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── CENTER: Rumi Character + Cooking Log + Finish ── */}
                  <div className="flex flex-col items-center gap-3">
                    {/* Rumi Character */}
                    <div className="flex flex-col items-center">
                      <div className="relative h-28 w-28 animate-float overflow-hidden rounded-2xl border-2 border-amber-300/30 bg-gradient-to-b from-slate-800 to-slate-900 shadow-lg shadow-amber-400/10">
                        <Image
                          src="/assets/sprites/rumi-chef.png"
                          alt="AI 셰프 루미"
                          fill
                          className="object-contain p-1"
                        />
                      </div>
                      <p className="mt-1 text-[10px] font-bold text-amber-300">AI 셰프 루미</p>
                    </div>

                    {/* Speech bubble */}
                    <div className="relative w-full rounded-2xl border border-amber-200/20 bg-amber-300/10 px-3 py-2 text-center text-xs leading-relaxed text-amber-50">
                      <div className="absolute -top-2 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-amber-200/20 bg-amber-300/10" />
                      {rumiMessage}
                    </div>

                    {/* Cooking Log */}
                    <div className="w-full rounded-2xl border border-slate-700 bg-slate-800/80 p-2">
                      <p className="text-[10px] font-bold tracking-wider text-amber-300">📋 조리 로그</p>
                      <div className="game-scrollbar mt-1.5 max-h-32 space-y-1.5 overflow-y-auto text-[11px] text-slate-200">
                        {cookingLogs.length === 0 ? (
                          <p className="text-center text-slate-500 italic">재료를 도구에 넣어보세요!</p>
                        ) : (
                          cookingLogs
                            .slice()
                            .reverse()
                            .map((log) => (
                              <div key={log.id} className="cooking-log-item flex flex-wrap items-center gap-1">
                                <span className="text-slate-300">{log.ingredient}</span>
                                <span className="text-amber-400">+</span>
                                <span className="text-slate-300">{log.tool}</span>
                                <span className="text-amber-400">=</span>
                                <span className="font-bold text-amber-200">{log.result}</span>
                              </div>
                            ))
                        )}
                      </div>
                    </div>

                    {/* Finish button */}
                    <button
                      type="button"
                      onClick={onFinishCooking}
                      disabled={!canFinishCooking || isEvaluating || isActionLoading}
                      className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2.5 text-sm font-black text-slate-900 shadow-lg transition hover:from-emerald-400 hover:to-emerald-300 disabled:cursor-not-allowed disabled:from-emerald-200/60 disabled:to-emerald-200/60"
                    >
                      {isEvaluating ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="loading-spinner loading-spinner-sm" /> AI 평가 중...
                        </span>
                      ) : (
                        "🍽️ 요리 완료!"
                      )}
                    </button>
                  </div>

                  {/* ── RIGHT: Cooking Tools ── */}
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold tracking-wider text-amber-300">🔧 조리 도구</h3>
                    <div className="grid grid-cols-1 gap-1">
                      {TOOLS.map((tool) => (
                        <button
                          key={tool.id}
                          type="button"
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.currentTarget.classList.add("drag-over");
                          }}
                          onDragLeave={(event) => {
                            event.currentTarget.classList.remove("drag-over");
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            event.currentTarget.classList.remove("drag-over");
                            try {
                              const raw = event.dataTransfer.getData("text/plain");
                              const ids: string[] = JSON.parse(raw);
                              if (ids.length > 0) {
                                void onDropIngredientToTool(ids, tool);
                              }
                            } catch {
                              const single = event.dataTransfer.getData("text/plain");
                              if (single) void onDropIngredientToTool([single], tool);
                            }
                          }}
                          onClick={() => {
                            if (selectedIngredientIds.size > 0) {
                              void onDropIngredientToTool(Array.from(selectedIngredientIds), tool);
                            }
                          }}
                          className="tool-zone rounded-xl border border-amber-200/20 bg-slate-800/80 p-2.5 text-left"
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
                              <Image
                                src={tool.assetPath}
                                alt={tool.name}
                                width={40}
                                height={40}
                                className="h-8 w-8 object-contain"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-amber-100">
                                {tool.emoji} {tool.name}
                              </p>
                              <p className="text-[9px] text-slate-400">드래그 또는 클릭</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Hint modal */}
                {showHintModal && (
                  <div className="hint-overlay" onClick={() => setShowHintModal(false)}>
                    <div
                      className="hint-panel rounded-3xl border border-amber-300/30 bg-slate-900/95 p-6 shadow-2xl backdrop-blur"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-amber-200">💡 힌트</h3>
                        <button
                          type="button"
                          onClick={() => setShowHintModal(false)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-sm text-slate-300 transition hover:bg-slate-700"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="mt-4 space-y-2">
                        {(recipe?.hints ?? []).map((hint, index) => (
                          <div
                            key={`${hint}-${index}`}
                            className="animate-slide-in rounded-xl border border-amber-300/20 bg-amber-400/10 p-3 text-sm text-amber-50"
                          >
                            💡 힌트 {index + 1}: {hint}
                          </div>
                        ))}
                      </div>
                      <p className="mt-4 text-center text-xs text-slate-400">
                        목표 요리: <span className="font-bold text-amber-200">{recipe?.dishName}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {screen === "result" ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-amber-200/30 bg-amber-400/10 p-4 text-center">
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-300">Final Dish</p>
                  <h2 className="mt-1 text-2xl font-black text-amber-100">{finalDish}</h2>
                  {finalDishArt ? (
                    <div className="mx-auto mt-3 flex h-40 w-40 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
                      <Image
                        src={finalDishArt}
                        alt={finalDish}
                        width={160}
                        height={160}
                        unoptimized
                        className="h-full w-full object-contain"
                      />
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
                    <p className="text-xs tracking-wider text-slate-400">정답 요리</p>
                    <p className="mt-1 text-lg font-bold text-amber-100">{recipe?.dishName}</p>
                    <p className="mt-3 text-xs tracking-wider text-slate-400">일치율</p>
                    <p className="mt-1 text-3xl font-black text-emerald-300">
                      {evaluation?.matchRate ?? "-"}%
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
                    <p className="text-xs tracking-wider text-slate-400">루미의 평가</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-100">
                      {evaluation?.evaluation}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
                    <p className="text-sm font-bold text-amber-100">놓친 포인트</p>
                    <ul className="mt-2 space-y-1 text-xs text-slate-200">
                      {(evaluation?.missedSteps ?? []).map((item, index) => (
                        <li key={`${item}-${index}`}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
                    <p className="text-sm font-bold text-emerald-200">보너스 포인트</p>
                    <ul className="mt-2 space-y-1 text-xs text-slate-200">
                      {(evaluation?.bonusPoints ?? []).map((item, index) => (
                        <li key={`${item}-${index}`}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
                  <p className="text-sm font-bold text-amber-100">전체 레시피</p>
                  <pre className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-200">
                    {evaluation?.fullRecipeNarrative ||
                      recipe?.recipe.steps
                        .map((step) => `${step.order}. ${step.action}`)
                        .join("\n")}
                  </pre>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onRestart}
                    className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-amber-300"
                  >
                    🔄 다시 하기
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void onShareResult();
                    }}
                    className="rounded-xl border border-sky-300/40 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/20"
                  >
                    📤 결과 공유
                  </button>
                </div>
              </div>
            ) : null}
          </article>

          {screen !== "cooking" && (
            <aside className="space-y-4">
              <div className="rounded-3xl border border-orange-200/20 bg-slate-900/75 p-4 shadow-xl backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
                    <Image
                      src="/assets/sprites/rumi-chef.png"
                      alt="루미"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-200">AI 셰프 루미</p>
                    <p className="text-xs text-slate-400">실시간 코칭 중</p>
                  </div>
                </div>
                <div className="mt-3 rounded-xl border border-amber-200/20 bg-amber-300/10 p-3 text-sm text-amber-50">
                  {rumiMessage}
                </div>
                {cookingLogs.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded-lg bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                      조리 {cookingLogs.length}회
                    </span>
                    <span className="rounded-lg bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                      {modeLabel(mode)}
                    </span>
                  </div>
                )}
              </div>

              {globalError ? (
                <div className="rounded-3xl border border-rose-300/40 bg-rose-500/10 p-4 text-sm text-rose-100">
                  {globalError}
                </div>
              ) : null}
            </aside>
          )}
        </section>
      </main>
    </div>
  );
}
