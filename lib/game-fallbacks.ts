import type {
  CookingActionResponse,
  CookingEvaluation,
  CookingLog,
  GameMode,
  Ingredient,
  RecipePlan,
  RecipeStep,
} from "@/types/game";

const ACTION_MAP: Record<string, CookingActionResponse> = {
  "양파|도마": {
    result: "다진 양파",
    resultEn: "chopped onion",
    reaction: "양파를 먼저 정리하면 조리 흐름이 깔끔해져!",
    emoji: "🔪",
  },
  "마늘|도마": {
    result: "다진 마늘",
    resultEn: "minced garlic",
    reaction: "좋아, 향을 내기 좋은 준비가 됐어.",
    emoji: "🔪",
  },
  "토마토|도마": {
    result: "다진 토마토",
    resultEn: "diced tomato",
    reaction: "토마토를 잘게 썰면 소스가 더 빨리 완성돼.",
    emoji: "🔪",
  },
  "달걀|프라이팬": {
    result: "스크램블 에그",
    resultEn: "scrambled eggs",
    reaction: "부드럽게 익혔네. 타이밍이 좋아.",
    emoji: "🍳",
  },
  "파스타면|냄비": {
    result: "삶은 파스타면",
    resultEn: "boiled pasta",
    reaction: "면을 먼저 삶아두는 선택, 아주 안정적이야.",
    emoji: "🫕",
  },
  "다진 마늘|프라이팬": {
    result: "볶은 마늘",
    resultEn: "sauteed garlic",
    reaction: "향이 올라오기 시작했어. 좋은 출발이야!",
    emoji: "🔥",
  },
  "다진 양파|프라이팬": {
    result: "볶은 양파",
    resultEn: "sauteed onion",
    reaction: "양파 단맛을 끌어내는 중이야.",
    emoji: "🔥",
  },
  "다진 토마토|냄비": {
    result: "토마토 소스",
    resultEn: "tomato sauce",
    reaction: "소스 베이스가 완성됐어.",
    emoji: "🍅",
  },
  "삶은 파스타면|믹싱볼": {
    result: "버무린 파스타면",
    resultEn: "mixed pasta",
    reaction: "이제 소스와 합치면 마무리 단계야.",
    emoji: "🥣",
  },
  "버무린 파스타면|냄비": {
    result: "토마토 파스타",
    resultEn: "tomato pasta",
    reaction: "좋아, 메인 요리 형태가 잡혔어!",
    emoji: "🍝",
  },
  "볶은 양파|냄비": {
    result: "양파 베이스 소스",
    resultEn: "onion base sauce",
    reaction: "깊은 맛을 만드는 좋은 베이스야.",
    emoji: "🫕",
  },
  "생선|그릴": {
    result: "구운 생선",
    resultEn: "grilled fish",
    reaction: "생선 결이 좋아. 접시에 올리기 직전이야.",
    emoji: "🐟",
  },
  "생선|프라이팬": {
    result: "팬 시어드 생선",
    resultEn: "pan-seared fish",
    reaction: "겉면 색이 잘 나왔어.",
    emoji: "🐟",
  },
};

const TOOL_HINT: Record<string, { suffix: string; emoji: string }> = {
  도마: { suffix: "손질 재료", emoji: "🔪" },
  프라이팬: { suffix: "볶은 재료", emoji: "🍳" },
  냄비: { suffix: "끓인 재료", emoji: "🫕" },
  믹싱볼: { suffix: "버무린 재료", emoji: "🥣" },
  오븐: { suffix: "구운 재료", emoji: "🔥" },
  그릴: { suffix: "그릴 재료", emoji: "🔥" },
  화로: { suffix: "익힌 재료", emoji: "🔥" },
};

function hasIngredient(ingredients: Ingredient[], target: string): boolean {
  return ingredients.some((item) => item.name === target);
}

function dishNameFromIngredients(mode: GameMode, ingredients: Ingredient[]): string {
  const hasPasta = hasIngredient(ingredients, "파스타면");
  const hasTomato = hasIngredient(ingredients, "토마토");
  const hasFish = hasIngredient(ingredients, "생선");
  const hasEgg = hasIngredient(ingredients, "달걀");

  if (hasPasta && hasTomato && hasFish) {
    return mode === "delicious"
      ? "생선을 곁들인 토마토 파스타"
      : "바다향 토마토 퓨전 파스타";
  }
  if (hasEgg && hasTomato) {
    return mode === "delicious" ? "토마토 에그 스크램블" : "선라이즈 에그 퓨전";
  }
  return mode === "delicious" ? "냉장고 스페셜 볶음" : "루미의 실험적 퓨전 한 접시";
}

function buildStepsForDish(dishName: string): RecipeStep[] {
  if (dishName.includes("파스타")) {
    return [
      {
        order: 1,
        action: "마늘을 잘게 다진다",
        tool: "도마",
        ingredients: ["마늘"],
        result: "다진 마늘",
      },
      {
        order: 2,
        action: "양파를 다진다",
        tool: "도마",
        ingredients: ["양파"],
        result: "다진 양파",
      },
      {
        order: 3,
        action: "파스타면을 삶는다",
        tool: "냄비",
        ingredients: ["파스타면"],
        result: "삶은 파스타면",
      },
      {
        order: 4,
        action: "다진 양파와 다진 마늘을 볶는다",
        tool: "프라이팬",
        ingredients: ["다진 양파", "다진 마늘"],
        result: "향긋한 소테",
      },
      {
        order: 5,
        action: "토마토를 다져 소스를 만든다",
        tool: "냄비",
        ingredients: ["토마토"],
        result: "토마토 소스",
      },
      {
        order: 6,
        action: "면과 소스를 섞어 마무리한다",
        tool: "믹싱볼",
        ingredients: ["삶은 파스타면", "토마토 소스"],
        result: "토마토 파스타",
      },
      {
        order: 7,
        action: "생선을 노릇하게 굽는다",
        tool: "그릴",
        ingredients: ["생선"],
        result: "구운 생선",
      },
    ];
  }

  return [
    {
      order: 1,
      action: "양파를 다진다",
      tool: "도마",
      ingredients: ["양파"],
      result: "다진 양파",
    },
    {
      order: 2,
      action: "토마토를 다진다",
      tool: "도마",
      ingredients: ["토마토"],
      result: "다진 토마토",
    },
    {
      order: 3,
      action: "양파를 팬에서 볶는다",
      tool: "프라이팬",
      ingredients: ["다진 양파"],
      result: "볶은 양파",
    },
    {
      order: 4,
      action: "토마토를 냄비에서 졸인다",
      tool: "냄비",
      ingredients: ["다진 토마토"],
      result: "토마토 베이스",
    },
    {
      order: 5,
      action: "달걀을 팬에서 익힌다",
      tool: "프라이팬",
      ingredients: ["달걀"],
      result: "스크램블 에그",
    },
    {
      order: 6,
      action: "재료를 믹싱볼에 섞어 완성한다",
      tool: "믹싱볼",
      ingredients: ["볶은 양파", "토마토 베이스", "스크램블 에그"],
      result: "루미 스페셜",
    },
  ];
}

export function fallbackIngredientsFromFileNames(fileNames: string[]): Ingredient[] {
  const keywordMap: Array<{ keyword: string; name: string; nameEn: string; category: string }> = [
    { keyword: "onion", name: "양파", nameEn: "onion", category: "채소" },
    { keyword: "egg", name: "달걀", nameEn: "egg", category: "유제품/계란" },
    { keyword: "pasta", name: "파스타면", nameEn: "pasta", category: "면" },
    { keyword: "tomato", name: "토마토", nameEn: "tomato", category: "채소" },
    { keyword: "fish", name: "생선", nameEn: "fish", category: "해산물" },
    { keyword: "garlic", name: "마늘", nameEn: "garlic", category: "채소" },
  ];
  const lowered = fileNames.map((name) => name.toLowerCase());
  const fromNames = keywordMap
    .filter((item) => lowered.some((name) => name.includes(item.keyword)))
    .map((item) => ({
      id: item.nameEn,
      name: item.name,
      nameEn: item.nameEn,
      category: item.category,
      source: "fridge" as const,
    }));

  if (fromNames.length > 0) {
    return fromNames;
  }

  return [
    { id: "onion", name: "양파", nameEn: "onion", category: "채소", source: "fridge" },
    { id: "egg", name: "달걀", nameEn: "egg", category: "유제품/계란", source: "fridge" },
    { id: "pasta", name: "파스타면", nameEn: "pasta", category: "면", source: "fridge" },
    { id: "tomato", name: "토마토", nameEn: "tomato", category: "채소", source: "fridge" },
    { id: "fish", name: "생선", nameEn: "fish", category: "해산물", source: "fridge" },
    { id: "garlic", name: "마늘", nameEn: "garlic", category: "채소", source: "fridge" },
  ];
}

export function fallbackRecipe(mode: GameMode, ingredients: Ingredient[]): RecipePlan {
  const dishName = dishNameFromIngredients(mode, ingredients);
  const hints =
    mode === "delicious"
      ? [
          "풍미를 쌓기 위해 향채를 먼저 다루는 요리야.",
          "소스가 요리의 중심이 되는 한 접시야.",
          "중간 단계 재료를 조합하면 완성에 가까워져.",
        ]
      : [
          "재료의 경계를 섞어 새로운 질감을 만드는 요리야.",
          "불 조절과 조합 순서가 창의성을 결정해.",
          "기본 재료를 두 번 이상 변형해보면 힌트가 보여.",
        ];

  return {
    dishName,
    dishNameEn: mode === "delicious" ? "Chef's Fridge Signature" : "Rumi Fusion Special",
    description:
      mode === "delicious"
        ? "냉장고 재료를 정석 순서로 쌓아 올린 풍미 중심 레시피입니다."
        : "익숙한 재료를 새로운 단계로 변형해 만든 실험적 퓨전 레시피입니다.",
    hints,
    recipe: {
      steps: buildStepsForDish(dishName),
      tips:
        mode === "delicious"
          ? "향채를 먼저 볶아 향을 충분히 올린 뒤 메인 재료를 넣으세요."
          : "한 번 처리한 재료를 다른 도구로 다시 변형해 독창성을 높이세요.",
      totalTime: "20~30분",
    },
  };
}

export function fallbackCookingAction(
  ingredient: string,
  tool: string,
): CookingActionResponse {
  const direct = ACTION_MAP[`${ingredient}|${tool}`];
  if (direct) {
    return direct;
  }

  const hint = TOOL_HINT[tool] ?? { suffix: "조리된 재료", emoji: "🍽️" };
  return {
    result: `${ingredient} ${hint.suffix}`,
    reaction: `${tool}을(를) 활용해 새로운 형태로 바꿨어. 다음 단계로 이어가 보자!`,
    emoji: hint.emoji,
  };
}

function normalizeText(input: string): string {
  return input.toLowerCase().replace(/\s+/g, "");
}

export function estimateMatchRate(recipe: RecipePlan, logs: CookingLog[]): number {
  if (logs.length === 0) {
    return 0;
  }
  const expectedActions = recipe.recipe.steps.map((step) => normalizeText(step.action));
  const actualActions = logs.map((log) => normalizeText(log.action));

  let matched = 0;
  for (const expected of expectedActions) {
    if (actualActions.some((actual) => actual.includes(expected.slice(0, 6)))) {
      matched += 1;
    }
  }

  const coverage = Math.round((matched / expectedActions.length) * 100);
  const depthBonus = Math.min(20, logs.length * 3);
  return Math.max(10, Math.min(99, Math.round((coverage * 0.8) + depthBonus)));
}

export function fallbackEvaluation(
  mode: GameMode,
  recipe: RecipePlan,
  logs: CookingLog[],
  finalDish: string,
): CookingEvaluation {
  const matchRate = estimateMatchRate(recipe, logs);
  const missedSteps = recipe.recipe.steps
    .filter((step) => !logs.some((log) => log.tool === step.tool))
    .slice(0, 3)
    .map((step) => step.action);
  const bonusPoints = [
    logs.length >= 4 ? "조리 단계를 여러 번 이어가며 요리 체인을 만든 점이 좋아." : "",
    finalDish.includes("파스타") ? "최종 요리 이름이 테마와 잘 맞아." : "",
    mode === "creative" ? "창의 모드답게 재료를 다양하게 변형했어." : "정석 조리 순서를 지키려는 시도가 좋았어.",
  ].filter(Boolean);

  return {
    matchRate,
    evaluation:
      matchRate >= 80
        ? `호호호~ 굉장히 훌륭했어! '${finalDish}'는 내가 생각한 방향과 매우 가깝네.`
        : `좋은 시도였어! '${finalDish}'까지 도달했지만 몇 단계만 다듬으면 더 완성도가 높아져.`,
    missedSteps:
      missedSteps.length > 0
        ? missedSteps
        : ["핵심 향미 단계를 조금 더 살리면 완성도가 올라가."],
    bonusPoints,
    fullRecipeNarrative: recipe.recipe.steps
      .map((step) => `${step.order}. ${step.action}`)
      .join("\n"),
  };
}

export function pickFinalDishFromLogs(logs: CookingLog[]): string {
  if (logs.length === 0) {
    return "미완성 요리";
  }
  return logs[logs.length - 1]?.result ?? "미완성 요리";
}

export function fallbackImageDataUrl(label: string, tone = "#ffb347"): string {
  const safe = label.slice(0, 14);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
<rect width="128" height="128" rx="18" fill="#1f2430"/>
<rect x="8" y="8" width="112" height="112" rx="14" fill="${tone}"/>
<text x="64" y="68" text-anchor="middle" font-size="14" font-family="monospace" fill="#1f2430">${safe}</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

