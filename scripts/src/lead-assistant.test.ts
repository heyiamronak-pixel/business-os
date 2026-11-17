import test from "node:test";
import assert from "node:assert/strict";
import { draftLeadFollowUp, suggestLeadNextStep } from "../../artifacts/business-os/src/lib/lead-assistant.ts";

test("lead assistant suggestions are stage-specific and explain the next action", () => {
  assert.equal(suggestLeadNextStep("new").title, "Make the first contact");
  assert.match(suggestLeadNextStep("proposal").reason, /objections/);
  assert.equal(suggestLeadNextStep("won").title, "Start customer onboarding");
});

test("lead follow-up drafts use the lead name and company without inventing facts", () => {
  const message = draftLeadFollowUp({ name: "Asha", company: "North Star Hotel", stage: "proposal" });
  assert.match(message, /Asha/);
  assert.match(message, /North Star Hotel/);
  assert.match(message, /proposal/);
});