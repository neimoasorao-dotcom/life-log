export type CategoryIcon =
  | "book"
  | "train"
  | "utensils"
  | "school"
  | "graduation"
  | "bath"
  | "coffee"
  | "sun"
  | "dots"
  | "work"
  | "music"
  | "walk";
export type CategoryColor =
  "sage" | "blue" | "sand" | "lavender" | "rose" | "gray";
export type CategoryKind =
  "study" | "school" | "lesson" | "travel" | "meal" | "rest" | "other";
export interface Category {
  id: string;
  name: string;
  icon: CategoryIcon;
  color: CategoryColor;
  kind: CategoryKind;
}
export interface Activity {
  id: string;
  categoryId: string;
  startTime: number;
  endTime: number | null;
  source: "stopwatch" | "manual" | "template";
  templateKey?: string;
}
export interface WeekTemplate {
  id: string;
  weekday: number;
  categoryId: string;
  startMinutes: number;
  endMinutes: number;
  createdDay: string;
}
export interface AppData {
  version: 1;
  categories: Category[];
  records: Activity[];
  templates: WeekTemplate[];
  generatedKeys: string[];
  mainRecordId: string | null;
}
export const categoryIcons: CategoryIcon[] = [
  "book",
  "train",
  "utensils",
  "school",
  "graduation",
  "bath",
  "coffee",
  "sun",
  "dots",
  "work",
  "music",
  "walk",
];
export const categoryColors: CategoryColor[] = [
  "sage",
  "blue",
  "sand",
  "lavender",
  "rose",
  "gray",
];
export const initialCategories: Category[] = [
  { id: "study", name: "勉強", icon: "book", color: "sage", kind: "study" },
  { id: "travel", name: "移動", icon: "train", color: "blue", kind: "travel" },
  { id: "meal", name: "食事", icon: "utensils", color: "sand", kind: "meal" },
  { id: "rest", name: "休憩", icon: "coffee", color: "gray", kind: "rest" },
  {
    id: "school",
    name: "学校",
    icon: "school",
    color: "lavender",
    kind: "school",
  },
  {
    id: "lesson",
    name: "塾の授業",
    icon: "graduation",
    color: "rose",
    kind: "lesson",
  },
  { id: "prepare", name: "身支度", icon: "sun", color: "sand", kind: "other" },
  { id: "bath", name: "風呂", icon: "bath", color: "blue", kind: "other" },
  { id: "other", name: "その他", icon: "dots", color: "gray", kind: "other" },
];
export const emptyData = (): AppData => ({
  version: 1,
  categories: initialCategories.map((c) => ({ ...c })),
  records: [],
  templates: [],
  generatedKeys: [],
  mainRecordId: null,
});
