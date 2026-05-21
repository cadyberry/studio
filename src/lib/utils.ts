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

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h = h / 360; s = s / 100; l = l / 100;
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

export function hslToHex(h: number, s: number, l: number): string {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

export function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
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

// ─── CMYK & Print Simulation ──────────────────────────────────────────────────

export interface CmykValues {
  c: number; // 0-100
  m: number;
  y: number;
  k: number;
}

export function rgbToCmyk(r: number, g: number, b: number): CmykValues {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
  const denom = 1 - k;
  return {
    c: Math.round(((1 - rn - k) / denom) * 100),
    m: Math.round(((1 - gn - k) / denom) * 100),
    y: Math.round(((1 - bn - k) / denom) * 100),
    k: Math.round(k * 100),
  };
}

export function cmykToRgb(c: number, m: number, y: number, k: number): { r: number; g: number; b: number } {
  const cn = c / 100, mn = m / 100, yn = y / 100, kn = k / 100;
  return {
    r: Math.round(255 * (1 - cn) * (1 - kn)),
    g: Math.round(255 * (1 - mn) * (1 - kn)),
    b: Math.round(255 * (1 - yn) * (1 - kn)),
  };
}

// Apply total area coverage limit (standard offset print is 300%)
function applyInkLimit(c: number, m: number, y: number, k: number): CmykValues {
  const limit = 300;
  const total = c + m + y + k;
  if (total <= limit) return { c, m, y, k };
  const cmy = c + m + y;
  if (cmy === 0) return { c, m, y, k: Math.min(k, limit) };
  const scale = (limit - k) / cmy;
  return {
    c: Math.round(c * scale),
    m: Math.round(m * scale),
    y: Math.round(y * scale),
    k,
  };
}

function toLinearRgb(v: number): number {
  const n = v / 255;
  return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
}

function rgbToLab(r: number, g: number, b: number): { L: number; a: number; b: number } {
  const rl = toLinearRgb(r), gl = toLinearRgb(g), bl = toLinearRgb(b);
  // sRGB D65 matrix
  const x = rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375;
  const y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750;
  const z = rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041;
  // D65 white point
  const f = (t: number) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const fx = f(x / 0.95047);
  const fy = f(y / 1.00000);
  const fz = f(z / 1.08883);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

export function deltaE(hex1: string, hex2: string): number {
  const a = hexToRgb(hex1);
  const b = hexToRgb(hex2);
  if (!a || !b) return 0;
  const lab1 = rgbToLab(a.r, a.g, a.b);
  const lab2 = rgbToLab(b.r, b.g, b.b);
  return Math.sqrt((lab1.L - lab2.L) ** 2 + (lab1.a - lab2.a) ** 2 + (lab1.b - lab2.b) ** 2);
}

export interface PrintSimResult {
  printHex: string;
  cmyk: CmykValues;
  deltaE: number;
  risk: "safe" | "caution" | "high";
}

export function simulateCmykPrint(hex: string): PrintSimResult {
  const rgb = hexToRgb(hex);
  if (!rgb) return { printHex: hex, cmyk: { c: 0, m: 0, y: 0, k: 0 }, deltaE: 0, risk: "safe" };
  const raw = rgbToCmyk(rgb.r, rgb.g, rgb.b);
  const capped = applyInkLimit(raw.c, raw.m, raw.y, raw.k);
  const printRgb = cmykToRgb(capped.c, capped.m, capped.y, capped.k);
  const printHex = rgbToHex(printRgb.r, printRgb.g, printRgb.b);
  const dE = deltaE(hex, printHex);
  return {
    printHex,
    cmyk: capped,
    deltaE: Math.round(dE * 10) / 10,
    risk: dE < 3 ? "safe" : dE < 10 ? "caution" : "high",
  };
}
