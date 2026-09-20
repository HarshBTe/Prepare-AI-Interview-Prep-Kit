export type BuilderOrigin =
  | "generated"
  | "user_added"
  | "user_edited";

export interface BuilderItemMeta {
  origin: BuilderOrigin;
  isPinned: boolean;
}

export interface BuilderMeta {
  questions: Record<string, BuilderItemMeta>;
  flashcards: Record<string, BuilderItemMeta>;
  companyBrief: BuilderItemMeta;
}