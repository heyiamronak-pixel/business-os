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

test("keeps numeric values intact while expressing sales metrics in Hinglish", () => {
  const value = toHinglish("Booked revenue: ₹1,600 across 2 sales.");
  assert.equal(value, "Booked revenue ₹1,600 hai (2 sales mein).");
});

test("expresses stock risk in Hinglish without changing product names", () => {
  const value = toHinglish("2 products are out of stock and 3 are at or below minimum stock.");
  assert.equal(value, "2 products ka stock khatam hai aur 3 products minimum stock level par ya usse neeche hain.");
});

test("expresses ROAS in Hinglish while preserving its metric value", () => {
  assert.equal(toHinglish("ROAS: 2.00x."), "ROAS 2.00x hai.");
});
