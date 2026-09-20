// src/types/state.ts

export type ItemOrigin =
  | "generated"
  | "user_added"
  | "user_edited";

export interface StateMeta {
  origin: ItemOrigin;
  isPinned: boolean;
}

export interface ManageableQuestion {
  id: string;
  requirement_ids: string[];
  category:
    | "technical"
    | "behavioural"
    | "system-design"
    | "company-fit";
  prompt: string;
  answer_outline: string;
  difficulty: 1 | 2 | 3;
  _meta: StateMeta;
}

export interface ManageableFlashcard {
  id: string;
  front: string;
  back: string;
  requirement_ids: string[];
  _meta: StateMeta;
}