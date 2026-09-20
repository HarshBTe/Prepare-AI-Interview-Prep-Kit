// src/web/app/lib/kits.ts

import api from "./api";

import type { InterviewKit } from "../types/kit";

import type { BuilderMeta } from "../../types/builder";

export interface GenerateKitInput {
  jd: string;
  company_url: string;
  days: number;
  role?: string;
  location?: string;
}

export interface GenerateKitResponse {
  success: boolean;
  kitId: string;
  kit: InterviewKit;
}

export interface KitSummary {
  id: string;
  title: string;
  status: "generating" | "ready" | "failed";
  createdAt: string;
  updatedAt: string;
}

export interface KitListResponse {
  success: boolean;
  kits: KitSummary[];
}

export interface KitResponse {
  success: boolean;
  kit: {
    id: string;
    title: string;
    status: "generating" | "ready" | "failed";
    data: InterviewKit | null;
    builderMeta: BuilderMeta;
    createdAt: string;
    updatedAt: string;
  };
}

export async function generateKit(
  input: GenerateKitInput
): Promise<GenerateKitResponse> {
  const response =
    await api.post<GenerateKitResponse>(
      "/api/kits/generate",
      input
    );

  return response.data;
}

export async function getKits(): Promise<KitSummary[]> {
  const response =
    await api.get<KitListResponse>(
      "/api/kits"
    );

  return response.data.kits;
}

export async function getKit(
  id: string
): Promise<KitResponse["kit"]> {
  const response =
    await api.get<KitResponse>(
      `/api/kits/${id}`
    );

  return response.data.kit;
}


export async function updateKit(
  id: string,
  kit: InterviewKit,
  builderMeta: BuilderMeta
): Promise<KitResponse["kit"]> {
  const response = await api.patch<KitResponse>(
    `/api/kits/${id}`,
    {
      kit,
      builderMeta,
    }
  );

  return response.data.kit;
}

export async function regenerateKitSection(
  kitId: string,
  section:
    | "technical"
    | "behavioural"
    | "system-design"
    | "company-fit"
) {
  const response = await api.post(
    `/api/kits/${kitId}/regenerate`,
    {
      section,
    }
  );

  return response.data;
}