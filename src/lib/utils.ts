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

export function formatRelativeAge(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return diffMin === 1 ? "1 min ago" : `${diffMin} min ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return diffHour === 1 ? "1 hour ago" : `${diffHour} hours ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return diffDay === 1 ? "yesterday" : `${diffDay} days ago`;
  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 5) return diffWeek === 1 ? "1 week ago" : `${diffWeek} weeks ago`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return diffMonth === 1 ? "1 month ago" : `${diffMonth} months ago`;
  const diffYear = Math.floor(diffDay / 365);
  return diffYear === 1 ? "1 year ago" : `${diffYear} years ago`;
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

// Assigns semantic UI roles to palette colors using luminance + saturation.
// dark=true inverts luminance priority: darkest→background, lightest→text.
export function assignColorRoles(colors: { hex: string }[], dark = false): RoleAssignment[] {
  if (colors.length === 0) return [];

  const analyzed = colors.map((c) => {
    const rgb = hexToRgb(c.hex) ?? { r: 128, g: 128, b: 128 };
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const lum = getRelativeLuminance(c.hex);
    return { hex: c.hex, hsl, lum };
  });

  // In dark mode, sort ascending (darkest first); in light mode, descending (lightest first)
  const byLuminance = [...analyzed].sort((a, b) => dark ? a.lum - b.lum : b.lum - a.lum);
  const results: RoleAssignment[] = [];
  const used = new Set<string>();

  const assign = (hex: string, role: ColorRole) => {
    results.push({ hex, role });
    used.add(hex);
  };

  const unused = () => byLuminance.filter((c) => !used.has(c.hex));

  // Background: lightest in light mode, darkest in dark mode (first after sort)
  assign(byLuminance[0].hex, "background");

  // Text: opposite end of luminance spectrum
  if (byLuminance.length >= 2) {
    assign(byLuminance[byLuminance.length - 1].hex, "text");
  }

  // accent: most saturated of remaining
  const r1 = unused();
  if (r1.length > 0) {
    const mostSat = r1.reduce((best, c) => (c.hsl.s > best.hsl.s ? c : best));
    assign(mostSat.hex, "accent");
  }

  // surface: next in luminance direction (second darkest in dark, second lightest in light)
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

// ─── Palette Mood ─────────────────────────────────────────────────────────────

export type PaletteMood = "vivid" | "muted" | "warm" | "earthy" | "cool" | "dreamy";

export function getPaletteMood(colors: { hex: string }[]): PaletteMood {
  if (colors.length === 0) return "muted";
  const hsls = colors
    .map((c) => { const rgb = hexToRgb(c.hex); return rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null; })
    .filter((v): v is { h: number; s: number; l: number } => v !== null);
  if (hsls.length === 0) return "muted";

  const sinSum = hsls.reduce((s, h) => s + Math.sin((h.h * Math.PI) / 180), 0);
  const cosSum = hsls.reduce((s, h) => s + Math.cos((h.h * Math.PI) / 180), 0);
  const meanHue = ((Math.atan2(sinSum / hsls.length, cosSum / hsls.length) * 180) / Math.PI + 360) % 360;
  const meanS = hsls.reduce((s, h) => s + h.s, 0) / hsls.length;

  if (meanS > 55) return "vivid";
  if (meanS < 22) return "muted";
  if (meanHue >= 330 || meanHue < 40) return "warm";
  if (meanHue >= 40 && meanHue < 160) return "earthy";
  if (meanHue >= 160 && meanHue < 265) return "cool";
  return "dreamy";
}

// ─── Harmony Color Derivation ────────────────────────────────────────────────

export interface HarmonyColor {
  hex: string;
  label: string;
  role: "analogous" | "complement" | "split" | "triadic";
}

// Derives harmony colors from the most saturated color in a palette.
// Preserves saturation and lightness; shifts hue to standard harmony positions.
// Filters out hues already present in the palette (within ±8°).
export function getHarmonyColors(colors: { hex: string }[]): HarmonyColor[] {
  if (colors.length === 0) return [];

  const analyzed = colors.map((c) => {
    const rgb = hexToRgb(c.hex) ?? { r: 128, g: 128, b: 128 };
    return { hex: c.hex, hsl: rgbToHsl(rgb.r, rgb.g, rgb.b) };
  });

  // Use the most saturated color as the harmony anchor
  const anchor = analyzed.reduce((best, c) => (c.hsl.s > best.hsl.s ? c : best));
  const { h, s, l } = anchor.hsl;

  const existingHues = analyzed.map((c) => c.hsl.h);
  const hueConflicts = (targetH: number) =>
    existingHues.some((eh) => {
      const diff = Math.abs(((targetH - eh + 540) % 360) - 180);
      return diff < 8;
    });

  const derive = (shift: number, label: string, role: HarmonyColor["role"]): HarmonyColor | null => {
    const targetH = (h + shift + 360) % 360;
    if (hueConflicts(targetH)) return null;
    return { hex: hslToHex(targetH, Math.max(s, 30), l), label, role };
  };

  return [
    derive(-30, "analog −30°", "analogous"),
    derive(30, "analog +30°", "analogous"),
    derive(150, "split −", "split"),
    derive(180, "complement", "complement"),
    derive(210, "split +", "split"),
    derive(120, "triadic", "triadic"),
    derive(240, "triadic", "triadic"),
  ].filter((c): c is HarmonyColor => c !== null).slice(0, 5);
}

// ─── Collection Cohesion Score ────────────────────────────────────────────────

// Returns an overall cohesion score (0–100) for a set of palettes using the
// same three-axis formula as CohesionModal: hue harmony (50%), saturation
// consistency (30%), lightness balance (20%).
export function computeCohesionScore(palettes: { colors: { hex: string }[] }[]): number {
  const allHsl = palettes.flatMap((p) =>
    p.colors
      .map((c) => { const rgb = hexToRgb(c.hex); return rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null; })
      .filter((v): v is { h: number; s: number; l: number } => v !== null)
  );
  if (allHsl.length === 0) return 0;

  const hueRads = allHsl.map((h) => (h.h * Math.PI) / 180);
  const meanSin = hueRads.reduce((s, r) => s + Math.sin(r), 0) / hueRads.length;
  const meanCos = hueRads.reduce((s, r) => s + Math.cos(r), 0) / hueRads.length;
  const R = Math.sqrt(meanSin ** 2 + meanCos ** 2);
  const hueScore = Math.round(R * 100);

  const sats = allHsl.map((h) => h.s);
  const satMean = sats.reduce((a, b) => a + b, 0) / sats.length;
  const satStd = Math.sqrt(sats.reduce((sum, s) => sum + (s - satMean) ** 2, 0) / sats.length);
  const satScore = Math.max(0, Math.round(100 - (satStd / 35) * 100));

  const lights = allHsl.map((h) => h.l);
  const lightMean = lights.reduce((a, b) => a + b, 0) / lights.length;
  const lightStd = Math.sqrt(lights.reduce((sum, l) => sum + (l - lightMean) ** 2, 0) / lights.length);
  const lightScore = Math.max(0, Math.round(100 - (lightStd / 35) * 100));

  return Math.round(hueScore * 0.5 + satScore * 0.3 + lightScore * 0.2);
}

// ─── Shade Scale Generator ────────────────────────────────────────────────────

export interface ShadeStop {
  stop: number;
  hex: string;
  isSource: boolean;
}

// Reference lightness targets per stop, tuned to Tailwind-style ramps
const SHADE_STOP_L: Record<number, number> = {
  50: 97, 100: 93, 200: 86, 300: 76, 400: 65, 500: 52, 600: 42, 700: 32, 800: 22, 900: 12,
};

// Generates a 10-stop shade scale (50–900) anchored to the source color.
// Finds the stop whose reference lightness is closest to the source, pegs the
// source there, and interpolates toward near-white (L=97) and near-black (L=8).
export function generateShadeScale(sourceHex: string): ShadeStop[] {
  const rgb = hexToRgb(sourceHex);
  if (!rgb) return [];
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const stops = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

  const anchorStop = stops.reduce((best, stop) =>
    Math.abs(SHADE_STOP_L[stop] - l) < Math.abs(SHADE_STOP_L[best] - l) ? stop : best
  , 500);
  const anchorIdx = stops.indexOf(anchorStop);

  return stops.map((stop, i) => {
    if (stop === anchorStop) return { stop, hex: sourceHex, isSource: true };
    let targetL: number;
    let targetS: number;
    if (i < anchorIdx) {
      const t = anchorIdx > 0 ? (anchorIdx - i) / anchorIdx : 0;
      targetL = l + t * (97 - l);
      targetS = s * (1 - t * 0.85);
    } else {
      const remaining = stops.length - 1 - anchorIdx;
      const t = remaining > 0 ? (i - anchorIdx) / remaining : 0;
      targetL = l - t * (l - 8);
      targetS = s * (1 - t * 0.28);
    }
    return {
      stop,
      hex: hslToHex(h, Math.max(0, Math.min(100, Math.round(targetS))), Math.max(0, Math.min(100, Math.round(targetL)))),
      isSource: false,
    };
  });
}
