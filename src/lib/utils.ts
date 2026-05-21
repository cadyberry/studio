import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function getContrastColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#000000";
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? "#1a1a18" : "#fafaf8";
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

export function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(isoString));
}

// WCAG relative luminance
export function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const toLinear = (v: number) => {
    const n = v / 255;
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
}

// WCAG contrast ratio (1–21)
export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export type ColorRole = "background" | "surface" | "accent" | "secondary" | "text";

export interface RoleAssignment {
  hex: string;
  role: ColorRole;
}

// Assigns semantic UI roles to palette colors using luminance + saturation
export function assignColorRoles(colors: { hex: string }[]): RoleAssignment[] {
  if (colors.length === 0) return [];

  const analyzed = colors.map((c) => {
    const rgb = hexToRgb(c.hex) ?? { r: 128, g: 128, b: 128 };
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const lum = getRelativeLuminance(c.hex);
    return { hex: c.hex, hsl, lum };
  });

  const byLuminance = [...analyzed].sort((a, b) => b.lum - a.lum);
  const results: RoleAssignment[] = [];
  const used = new Set<string>();

  const assign = (hex: string, role: ColorRole) => {
    results.push({ hex, role });
    used.add(hex);
  };

  const unused = () => byLuminance.filter((c) => !used.has(c.hex));

  assign(byLuminance[0].hex, "background");

  if (byLuminance.length >= 2) {
    assign(byLuminance[byLuminance.length - 1].hex, "text");
  }

  // accent: most saturated of remaining
  const r1 = unused();
  if (r1.length > 0) {
    const mostSat = r1.reduce((best, c) => (c.hsl.s > best.hsl.s ? c : best));
    assign(mostSat.hex, "accent");
  }

  // surface: lightest remaining (byLuminance already sorted high→low)
  const r2 = unused();
  if (r2.length > 0) {
    assign(r2[0].hex, "surface");
  }

  // secondary: next most saturated remaining
  const r3 = unused();
  if (r3.length > 0) {
    const nextSat = r3.reduce((best, c) => (c.hsl.s > best.hsl.s ? c : best));
    assign(nextSat.hex, "secondary");
  }

  // remaining colors
  unused().forEach((c) => assign(c.hex, "secondary"));

  return results;
}
