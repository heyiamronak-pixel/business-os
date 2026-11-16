import type { Appearance, Business, ThemePreset } from "@/lib/domain";

export interface Palette {
  bg: string;
  bgElevated: string;
  bgSubtle: string;
  fg: string;
  fgMuted: string;
  fgSubtle: string;
  border: string;
  primary: string;
  primaryFg: string;
  success: string;
  warning: string;
  danger: string;
}

const LIGHT_BASE: Omit<Palette, "primary" | "primaryFg"> = {
  bg: "#F4F7FB",
  bgElevated: "#FFFFFF",
  bgSubtle: "#EAF0F6",
  fg: "#17263A",
  fgMuted: "#53657B",
  fgSubtle: "#8190A4",
  border: "color-mix(in oklab, #24364D 10%, transparent)",
  success: "#16835D",
  warning: "#A66B1D",
  danger: "#C24E5A",
};

const DARK_BASE: Omit<Palette, "primary" | "primaryFg"> = {
  bg: "#0C1421",
  bgElevated: "#131F2D",
  bgSubtle: "#1D2C3D",
  fg: "#EDF4FA",
  fgMuted: "#B6C4D4",
  fgSubtle: "#8395AA",
  border: "color-mix(in oklab, #DDE9F5 11%, transparent)",
  success: "#65C99A",
  warning: "#E5B35F",
  danger: "#F18A92",
};

export const PRESET_ACCENTS: Record<Exclude<ThemePreset, "brand">, { light: string; dark: string }> = {
  professional: { light: "#2B526B", dark: "#93C4DC" },
  modern: { light: "#176B73", dark: "#55C5BC" },
  contrast: { light: "#17263A", dark: "#F2F6FA" },
};

export function luminance(hex: string): number {
  const c = parseHex(hex);
  if (!c) return 0;
  const lin = [c.r, c.g, c.b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

export function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace("#", "").trim();
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    };
  }
  if (h.length !== 6 || Number.isNaN(parseInt(h, 16))) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function contrastFg(hex: string): string {
  return luminance(hex) > 0.45 ? "#17263A" : "#FFFFFF";
}

export function resolveAppearance(appearance: Appearance, prefersDark: boolean): "light" | "dark" {
  if (appearance === "auto") return prefersDark ? "dark" : "light";
  return appearance;
}

export function resolvePrimary(business: Pick<Business, "themePreset" | "brandColors">, mode: "light" | "dark"): string {
  if (business.themePreset === "brand") {
    const c = business.brandColors.find((x) => parseHex(x));
    if (c) return c;
  }
  const preset = business.themePreset === "brand" ? "modern" : business.themePreset;
  return PRESET_ACCENTS[preset][mode];
}

export function buildPalette(
  business: Pick<Business, "themePreset" | "brandColors" | "appearance"> | null,
  prefersDark: boolean,
): Palette {
  const appearance = business?.appearance ?? "light";
  const mode = resolveAppearance(appearance, prefersDark);
  const base = mode === "dark" ? DARK_BASE : LIGHT_BASE;
  const primary = business ? resolvePrimary(business, mode) : PRESET_ACCENTS.modern[mode];
  const contrast = business?.themePreset === "contrast";
  return {
    ...base,
    bg: contrast ? (mode === "dark" ? "#000000" : "#FAFAF8") : base.bg,
    fg: contrast ? (mode === "dark" ? "#FFFFFF" : "#0A0A0A") : base.fg,
    border: contrast
      ? mode === "dark"
        ? "color-mix(in oklab, #FFFFFF 32%, transparent)"
        : "color-mix(in oklab, #0A0A0A 28%, transparent)"
      : base.border,
    primary,
    primaryFg: contrastFg(primary),
  };
}

export function applyPalette(p: Palette) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--background", p.bg);
  root.style.setProperty("--card", p.bgElevated);
  root.style.setProperty("--surface-subtle", p.bgSubtle);
  root.style.setProperty("--foreground", p.fg);
  root.style.setProperty("--muted-foreground", p.fgMuted);
  root.style.setProperty("--subtle-foreground", p.fgSubtle);
  root.style.setProperty("--border", p.border);
  root.style.setProperty("--primary", p.primary);
  root.style.setProperty("--primary-foreground", p.primaryFg);
  root.style.setProperty("--success", p.success);
  root.style.setProperty("--warning", p.warning);
  root.style.setProperty("--danger", p.danger);
  root.style.setProperty("--ring", p.primary);
  root.dataset.theme = luminance(p.bg) > 0.5 ? "light" : "dark";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", p.bg);
}

function saturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  if (max === min) return 0;
  const l = (max + min) / 2;
  const d = max - min;
  return l > 0.5 ? d / (2 - max - min) : d / (max + min);
}

export async function extractLogoColors(dataUrl: string, count = 5): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const size = 64;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve([]);
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        const buckets = new Map<string, { n: number; r: number; g: number; b: number; sat: number }>();
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 140) continue;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const key = `${r >> 4}:${g >> 4}:${b >> 4}`;
          const sat = saturation(r, g, b);
          const prev = buckets.get(key);
          if (prev) {
            prev.n += 1;
            prev.r += r;
            prev.g += g;
            prev.b += b;
            prev.sat += sat;
          } else {
            buckets.set(key, { n: 1, r, g, b, sat });
          }
        }
        const ranked = Array.from(buckets.values())
          .map((x) => ({
            n: x.n,
            r: x.r / x.n,
            g: x.g / x.n,
            b: x.b / x.n,
            sat: x.sat / x.n,
          }))
          .filter((x) => {
            const lum = (0.2126 * x.r + 0.7152 * x.g + 0.0722 * x.b) / 255;
            return lum > 0.08 && lum < 0.94;
          })
          .sort((a, b) => b.n * (0.4 + b.sat) - a.n * (0.4 + a.sat));
        const colors: string[] = [];
        for (const c of ranked) {
          const hex = rgbToHex(c.r, c.g, c.b);
          if (colors.some((existing) => colorDistance(existing, hex) < 40)) continue;
          colors.push(hex);
          if (colors.length >= count) break;
        }
        resolve(colors);
      } catch {
        resolve([]);
      }
    };
    img.onerror = () => resolve([]);
    img.src = dataUrl;
  });
}

function colorDistance(a: string, b: string): number {
  const A = parseHex(a);
  const B = parseHex(b);
  if (!A || !B) return 999;
  return Math.hypot(A.r - B.r, A.g - B.g, A.b - B.b);
}

export async function fileToDataUrl(file: File, max = 512, quality = 0.82): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  return resizeDataUrl(raw, max, quality);
}

export async function resizeDataUrl(dataUrl: string, max: number, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
