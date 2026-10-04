export const CATEGORIES = [
  { id: "food", label: "食費", emoji: "🥬" },
  { id: "eating_out", label: "外食", emoji: "🍽️" },
  { id: "daily", label: "日用品", emoji: "🧻" },
  { id: "rent", label: "家賃", emoji: "🏠" },
  { id: "utilities", label: "光熱費", emoji: "💡" },
  { id: "internet", label: "通信", emoji: "📶" },
  { id: "transport", label: "交通", emoji: "🚃" },
  { id: "leisure", label: "娯楽", emoji: "🎡" },
  { id: "medical", label: "医療", emoji: "💊" },
  { id: "transfer", label: "送金", emoji: "💸" },
  { id: "other", label: "その他", emoji: "📦" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [
  CategoryId,
  ...CategoryId[],
];

export function categoryOf(id: string) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

export function isCategoryId(id: string): id is CategoryId {
  return CATEGORIES.some((c) => c.id === id);
}
