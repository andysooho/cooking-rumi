export type GameMode = "delicious" | "creative";

export type IngredientSource = "fridge" | "cooked";

export type Ingredient = {
  id: string;
  name: string;
  nameEn?: string;
  category?: string;
  imageDataUrl?: string;
  source: IngredientSource;
};

export type RecipeStep = {
  order: number;
  action: string;
  tool: string;
  ingredients: string[];
  result?: string;
};

export type RecipePlan = {
  dishName: string;
  dishNameEn?: string;
  description: string;
  hints: string[];
  recipe: {
    steps: RecipeStep[];
    tips: string;
    totalTime: string;
  };
};

export type CookingLog = {
  id: string;
  action: string;
  ingredient: string;
  tool: string;
  result: string;
  reaction: string;
  createdAt: string;
};

export type CookingActionResponse = {
  result: string;
  resultEn?: string;
  reaction: string;
  emoji?: string;
};

export type CookingEvaluation = {
  matchRate: number;
  evaluation: string;
  missedSteps: string[];
  bonusPoints: string[];
  fullRecipeNarrative: string;
};

