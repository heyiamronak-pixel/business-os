import type { ThemeId } from '@/domain/types';

export type ThemeSuggestion = {
  id: ThemeId;
  name: string;
  description: string;
  primary: string;
  accent: string;
  background: string;
  foreground: string;
};

export function readImageDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read this image.'));
    reader.readAsDataURL(file);
  });
}

export function extractDominantColor(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 32;
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) return resolve('#1f2937');
      context.drawImage(image, 0, 0, size, size);
      const pixels = context.getImageData(0, 0, size, size).data;
      const colors = new Map<string, number>();
      for (let index = 0; index < pixels.length; index += 16) {
        const alpha = pixels[index + 3];
        if (alpha < 120) continue;
        const red = Math.round(pixels[index] / 32) * 32;
        const green = Math.round(pixels[index + 1] / 32) * 32;
        const blue = Math.round(pixels[index + 2] / 32) * 32;
        const color = `#${[red, green, blue].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
        colors.set(color, (colors.get(color) ?? 0) + 1);
      }
      resolve(
        [...colors.entries()].sort(([, a], [, b]) => b - a)[0]?.[0] ?? '#1f2937',
      );
    };
    image.onerror = () => resolve('#1f2937');
    image.src = dataUrl;
  });
}

function hexToHsl(hex: string) {
  const values = hex.replace('#', '').match(/.{2}/g)?.map((value) => parseInt(value, 16) / 255) ?? [0.12, 0.16, 0.22];
  const [red, green, blue] = values;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  let hue = 0;
  const lightness = (max + min) / 2;
  const saturation = max === min ? 0 : (max - min) / (1 - Math.abs(2 * lightness - 1));
  if (max !== min) {
    const delta = max - min;
    hue = max === red ? ((green - blue) / delta) % 6 : max === green ? (blue - red) / delta + 2 : (red - green) / delta + 4;
    hue = Math.round(hue * 60);
    if (hue < 0) hue += 360;
  }
  return `${hue} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}

export function themeSuggestions(brandColor: string): ThemeSuggestion[] {
  const brand = hexToHsl(brandColor || '#1f2937');
  return [
    {
      id: 'brand',
      name: 'Brand Match',
      description: 'Uses your logo color as the primary signal.',
      primary: brand,
      accent: brand,
      background: '42 28% 96%',
      foreground: '218 36% 16%',
    },
    {
      id: 'professional',
      name: 'Professional',
      description: 'High-contrast navy with a calm amber accent.',
      primary: '218 40% 15%',
      accent: '28 83% 66%',
      background: '42 28% 96%',
      foreground: '218 36% 16%',
    },
    {
      id: 'modern',
      name: 'Modern',
      description: 'Crisp slate with a focused teal accent.',
      primary: '220 28% 18%',
      accent: '178 54% 42%',
      background: '210 25% 97%',
      foreground: '220 28% 16%',
    },
  ];
}