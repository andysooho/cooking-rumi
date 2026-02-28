import type { CookingLog, GameMode, RecipePlan } from "@/types/game";

function modeLabel(mode: GameMode): string {
  return mode === "delicious" ? "맛있는 음식" : "창의적인 음식";
}

export function buildIngredientAnalysisPrompt(): string {
  return [
    "당신은 전문 요리사이자 식재료 감별사입니다.",
    "사용자가 제공한 이미지에서 요리에 사용 가능한 식재료를 식별하세요.",
    "식재료가 아닌 물체는 제외하고, 조미료/양념은 포함하세요.",
    "한국어 이름(name)과 영어 이름(nameEn)을 함께 주세요.",
    "반드시 JSON으로만 답하세요.",
    '형식: {"ingredients":[{"name":"양파","nameEn":"onion","category":"채소"}],"confidence":0.9}',
  ].join("\n");
}

export function buildRecipeSelectionPrompt(
  mode: GameMode,
  ingredientNames: string[],
): string {
  const modeText = mode === "delicious" ? "가장 맛있는 정통 요리" : "가장 독창적인 퓨전 요리";
  return [
    `당신은 친한 친구 같은 AI 셰프 "루미"야. 반말로 말해.`,
    `게임 모드는 "${modeLabel(mode)}"이야.`,
    `주어진 재료로 만들 수 있는 ${modeText}를 1개 골라줘.`,
    `재료: ${ingredientNames.join(", ")}`,
    "",
    "description은 친한 친구한테 추천하듯 신나고 재밌는 한 줄 설명으로 써줘.",
    "hints는 친구한테 살짝 귀띔해주듯 친근하고 짧은 반말 3개로 써줘. (예: '양파 먼저 볶으면 훨씬 맛있어!')",
    "",
    "반드시 아래 JSON 형식만 출력하세요.",
    '{"dishName":"요리명","dishNameEn":"English Name","description":"친근한 설명","hints":["힌트1","힌트2","힌트3"],"recipe":{"steps":[{"order":1,"action":"마늘을 다진다","tool":"도마","ingredients":["마늘"],"result":"다진 마늘"}],"tips":"팁","totalTime":"20분"}}',
    "steps는 최소 5개 이상으로 작성하세요.",
    "tool은 도마, 프라이팬, 냄비, 믹싱볼, 오븐, 그릴 중 하나를 우선 사용하세요.",
  ].join("\n");
}

export function buildCookingActionPrompt(
  ingredient: string,
  tool: string,
): string {
  return [
    `당신은 요리 게임의 친구 같은 AI 셰프 "루미"야. 반말 사용해.`,
    "재료와 조리도구의 조합 결과를 짧고 명확하게 JSON으로 답해줘.",
    `입력: ${ingredient} + ${tool}`,
    "",
    "reaction은 친구가 옆에서 응원하거나 리액션하는 느낌으로! 재밌고 생동감 있게 써줘.",
    "reaction은 반드시 15자 이내로 짧게! (예: '오 완전 좋은 선택!' / '냄새 벌써 좋다~' / '대박 기대돼!')",
    "",
    '형식: {"result":"다진 양파","resultEn":"chopped onion","reaction":"양파 다지기 좋아!","emoji":"🔪"}',
    "한국어 중심으로 작성하세요.",
  ].join("\n");
}

export function buildCookingArtPrompt(resultName: string): string {
  return [
    `Create a 64x64 pixel art sprite of ${resultName} on a transparent background.`,
    "16-bit retro game style, clean outlines, vibrant colors.",
    "Center the item and keep a simple readable silhouette.",
  ].join(" ");
}

export function buildPixelArtPrompt(ingredientNameEn: string): string {
  return [
    `Create a 64x64 pixel art sprite of a ${ingredientNameEn} on a transparent background.`,
    "16-bit retro game style, clean outlines, vibrant colors.",
    "The item should be centered and fill about 70% of the canvas.",
    "Style reference: classic SNES/GBA RPG item icons.",
  ].join(" ");
}

export function buildEvaluationPrompt(
  mode: GameMode,
  recipe: RecipePlan,
  logs: CookingLog[],
  finalDish: string,
): string {
  return [
    `당신은 친한 친구 같은 AI 셰프 "루미"야. 반말을 사용해.`,
    `게임 모드: ${modeLabel(mode)}`,
    "",
    "정답 레시피와 사용자의 조리 과정을 비교해서 평가해줘.",
    "evaluation은 친한 친구한테 말하듯 재밌고 따뜻한 반말로 써줘!",
    '(좋은 예: "야 이거 진짜 잘했어!! 소금 타이밍만 좀 아쉬워~")',
    '(나쁜 예: "전반적으로 양호한 조리 결과입니다." ← 이런 딱딱한 말투 절대 금지!)',
    "",
    "짧고 간결하게 써줘!",
    "- evaluation: 최대 2문장 (40자 이내)",
    "- missedSteps: 각 항목 10자 이내, 최대 3개",
    "- bonusPoints: 각 항목 10자 이내, 최대 3개",
    "- fullRecipeNarrative: 최대 3문장 (60자 이내)",
    "",
    `정답 레시피 JSON: ${JSON.stringify(recipe)}`,
    `사용자 조리 로그 JSON: ${JSON.stringify(logs)}`,
    `최종 요리: ${finalDish}`,
    "반드시 JSON으로만 응답하세요.",
    '{"matchRate":87,"evaluation":"잘했어! 타이밍만 아쉬워~","missedSteps":["소금 추가"],"bonusPoints":["양파 먼저 볶기"],"fullRecipeNarrative":"양파 볶고 고기 넣어 완성! 간 조절만 하면 완벽해."}',
  ].join("\n");
}
