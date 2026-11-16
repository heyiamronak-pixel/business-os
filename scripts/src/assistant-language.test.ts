import test from "node:test";
import assert from "node:assert/strict";
import {
  assistantLabel,
  detectAssistantLanguage,
  toHinglish,
} from "../../artifacts/business-os/src/lib/assistant-language.ts";

test("detects Devanagari Hindi and selects Hinglish responses", () => {
  assert.equal(detectAssistantLanguage("मेरा स्टॉक कितना है?"), "hinglish");
});

test("detects Roman Hindi and common Hinglish phrasing", () => {
  assert.equal(detectAssistantLanguage("Mera stock kahan kam ho raha hai?"), "hinglish");
  assert.equal(detectAssistantLanguage("Mujhe pending customer payments dikhao"), "hinglish");
});

test("keeps English questions in English", () => {
  assert.equal(detectAssistantLanguage("How much revenue did we make this month?"), "english");
  assert.equal(detectAssistantLanguage("Show my inventory status"), "english");
});

test("converts common assistant introductions into Hinglish", () => {
  const value = toHinglish("This answer is based on your current workspace data.");
  assert.match(value, /Yeh answer tumhare current workspace data par based hai/);
});

test("localises assistant labels without changing English mode", () => {
  assert.equal(assistantLabel("Next steps", "english"), "Next steps");
  assert.equal(assistantLabel("Next steps", "hinglish"), "Aage kya karein");
});
