export function generateSku(name: string, existing: string[]): string {
  const letters = name
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.slice(0, 3).toUpperCase())
    .join("")
    .slice(0, 8);
  const base = letters || "SKU";
  const set = new Set(existing.map((s) => s.toUpperCase()));
  for (let i = 1; i < 10000; i++) {
    const candidate = `${base}-${String(i).padStart(3, "0")}`;
    if (!set.has(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Hardware barcode scanners (USB/Bluetooth) typically act as a keyboard wedge:
 * they type digits rapidly and end with Enter. This listener captures that
 * burst without stealing focus from normal typing.
 */
export function attachKeyboardWedgeScanner(onCode: (code: string) => void): () => void {
  let buffer = "";
  let last = 0;
  const onKey = (e: KeyboardEvent) => {
    const now = Date.now();
    if (now - last > 80) buffer = "";
    last = now;
    if (e.key === "Enter") {
      if (buffer.length >= 4) onCode(buffer);
      buffer = "";
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      buffer += e.key;
    }
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}

export async function scanWithCamera(): Promise<string | null> {
  const Detector = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (src: ImageBitmapSource) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
  if (!Detector) return null;
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
  const video = document.createElement("video");
  video.srcObject = stream;
  video.setAttribute("playsinline", "true");
  await video.play();
  const detector = new Detector({ formats: ["ean_13", "ean_8", "code_128", "qr_code", "upc_a", "upc_e"] });
  const started = Date.now();
  try {
    while (Date.now() - started < 12000) {
      const codes = await detector.detect(video);
      const value = codes[0]?.rawValue;
      if (value) return value;
      await new Promise((r) => setTimeout(r, 180));
    }
    return null;
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}

export function cameraScanSupported(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia;
}
