import type { LeadStage } from "./domain";

export interface LeadAssistSuggestion { title: string; reason: string; }
export function suggestLeadNextStep(stage: LeadStage): LeadAssistSuggestion {
  switch (stage) {
    case "new": return { title: "Make the first contact", reason: "Confirm the enquiry, understand the requirement and agree on a clear next step." };
    case "contacted": return { title: "Qualify the opportunity", reason: "Capture the decision-maker, budget range, need and expected decision date." };
    case "qualified": return { title: "Prepare a tailored proposal", reason: "Connect the prospect’s stated needs to a specific scope, outcome and price." };
    case "proposal": return { title: "Follow up on the proposal", reason: "Ask what needs clarification, address objections and agree on a decision date." };
    case "won": return { title: "Start customer onboarding", reason: "Confirm the handover, expectations, first milestone and primary contact." };
    case "lost": return { title: "Record the loss reason", reason: "Capture why the opportunity was lost and whether a future follow-up is appropriate." };
  }
}

export function draftLeadFollowUp(input: { name: string; company?: string; stage: LeadStage }): string {
  const name = input.name.trim() || "there";
  const company = input.company?.trim();
  const greeting = "Hi " + name + ",";
  const context = company ? " regarding " + company : "";
  if (input.stage === "new") return greeting + "\n\nThank you for reaching out" + context + ". I’d be happy to understand what you’re looking for and help with the right next step. Would a quick call work for you?\n\nRegards";
  if (input.stage === "contacted") return greeting + "\n\nThank you for speaking with us" + context + ". Could you share a little more about your requirements and expected timeline so I can suggest the most suitable option?\n\nRegards";
  if (input.stage === "qualified") return greeting + "\n\nBased on what we discussed" + context + ", I’m putting together an option aligned with your requirements. Is there anything specific you would like me to include?\n\nRegards";
  if (input.stage === "proposal") return greeting + "\n\nI wanted to follow up on the proposal shared" + context + ". Please let me know if you would like any clarification or changes. Happy to discuss the next steps.\n\nRegards";
  if (input.stage === "won") return greeting + "\n\nThank you for choosing us" + context + ". We’re looking forward to working together. I’ll coordinate the next steps and share the onboarding details shortly.\n\nRegards";
  return greeting + "\n\nThank you for considering us" + context + ". If your plans or requirements change in the future, I’d be glad to reconnect.\n\nRegards";
}