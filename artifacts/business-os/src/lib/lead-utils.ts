import type { LeadStage } from "./domain";

export interface LeadInputValues {
  name: string; email?: string; value: number; stage: LeadStage;
}

export function normaliseLeadInput(input: LeadInputValues): { name: string; email?: string; value: number; stage: LeadStage } {
  const name = input.name.trim();
  if (!name) throw new Error("Lead name is required.");
  const email = input.email?.trim().toLowerCase() || undefined;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid lead email address.");
  if (!Number.isFinite(input.value) || input.value < 0) throw new Error("Lead value must be a non-negative amount.");
  return { name, email, value: Math.round(input.value * 100) / 100, stage: input.stage };
}