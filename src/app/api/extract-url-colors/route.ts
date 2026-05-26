import { NextResponse } from "next/server";

function hexToRgbNum(hex: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function rgbDistance(h1: string, h2: string): number {
  const a = hexToRgbNum(h1);
  const b = hexToRgbNum(h2);
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

function normalizeHex(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  const full = /^#[0-9a-f]{6}$/.test(trimmed)
    ? trimmed
    : /^#[0-9a-f]{3}$/.test(trimmed)
    ? "#" + trimmed[1] + trimmed[1] + trimmed[2] + trimmed[2] + trimmed[3] + trimmed[3]
    : null;
  return full;
}

function isInteresting(hex: string): boolean {
  const { r, g, b } = hexToRgbNum(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 510;
  if (lightness > 0.93 || lightness < 0.07) return false;
  const chroma = max - min;
  // Skip grays: chroma < 20 out of 255
  if (chroma < 20) return false;
  return true;
}

export async function POST(request: Request) {
  let url: string;
  try {
    const body = await request.json();
    url = body.url;
    if (!url || typeof url !== "string") throw new Error("bad input");
    new URL(url); // validate
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PaletteExtractor/1.0; +https://palette.tool)",
        Accept: "text/html,*/*",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html") && !ct.includes("text/css") && !ct.includes("text/plain")) {
      return NextResponse.json({ error: "URL does not return HTML content" }, { status: 422 });
    }
    html = await res.text();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    if (msg.includes("timeout") || msg.includes("abort")) {
      return NextResponse.json({ error: "Request timed out — the site took too long to respond" }, { status: 422 });
    }
    return NextResponse.json({ error: "Could not fetch that URL" }, { status: 422 });
  }

  const counts = new Map<string, number>();

  const bump = (raw: string) => {
    const hex = normalizeHex(raw);
    if (hex) counts.set(hex, (counts.get(hex) ?? 0) + 1);
  };

  // 6-digit hex
  for (const m of html.matchAll(/#([0-9a-fA-F]{6})\b/g)) bump("#" + m[1]);
  // 3-digit hex
  for (const m of html.matchAll(/#([0-9a-fA-F]{3})\b/g)) bump("#" + m[1]);
  // rgb()
  for (const m of html.matchAll(/rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/gi)) {
    const r = parseInt(m[1], 10).toString(16).padStart(2, "0");
    const g = parseInt(m[2], 10).toString(16).padStart(2, "0");
    const b = parseInt(m[3], 10).toString(16).padStart(2, "0");
    const hex = normalizeHex("#" + r + g + b);
    if (hex) counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }

  // Filter and sort by frequency
  const candidates = [...counts.entries()]
    .filter(([hex]) => isInteresting(hex))
    .sort((a, b) => b[1] - a[1]);

  // Deduplicate: keep colors that are visually distinct (> 40 RGB distance from anything selected)
  const selected: string[] = [];
  for (const [hex] of candidates) {
    if (selected.some((s) => rgbDistance(s, hex) < 40)) continue;
    selected.push(hex);
    if (selected.length >= 8) break;
  }

  if (selected.length < 2) {
    return NextResponse.json(
      { error: "Not enough distinctive colors found — try a page with a visible color palette" },
      { status: 422 }
    );
  }

  return NextResponse.json({ colors: selected });
}
