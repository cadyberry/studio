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
  if (chroma < 20) return false;
  return true;
}

function hslToHex(h: number, s: number, l: number): string | null {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60)       { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else              { r = c; b = x; }
  const ri = Math.round((r + m) * 255);
  const gi = Math.round((g + m) * 255);
  const bi = Math.round((b + m) * 255);
  return normalizeHex(
    "#" +
      ri.toString(16).padStart(2, "0") +
      gi.toString(16).padStart(2, "0") +
      bi.toString(16).padStart(2, "0")
  );
}

function mineColors(text: string, counts: Map<string, number>): void {
  const bump = (raw: string) => {
    const hex = normalizeHex(raw);
    if (hex) counts.set(hex, (counts.get(hex) ?? 0) + 1);
  };

  // 6-digit hex
  for (const m of text.matchAll(/#([0-9a-fA-F]{6})\b/g)) bump("#" + m[1]);
  // 3-digit hex (only when not followed by more hex digits)
  for (const m of text.matchAll(/#([0-9a-fA-F]{3})\b(?![0-9a-fA-F])/g)) bump("#" + m[1]);

  // rgb() — comma syntax
  for (const m of text.matchAll(/\brgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/gi)) {
    const r = parseInt(m[1], 10).toString(16).padStart(2, "0");
    const g = parseInt(m[2], 10).toString(16).padStart(2, "0");
    const b = parseInt(m[3], 10).toString(16).padStart(2, "0");
    const hex = normalizeHex("#" + r + g + b);
    if (hex) counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }

  // hsl() — comma syntax: hsl(H, S%, L%)
  for (const m of text.matchAll(/\bhsl\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*\)/gi)) {
    const hex = hslToHex(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
    if (hex) counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }

  // hsl() — space syntax: hsl(H S% L%)
  for (const m of text.matchAll(/\bhsl\(\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\s*\)/gi)) {
    const hex = hslToHex(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
    if (hex) counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }
}

function extractStylesheetHrefs(html: string, baseUrl: string): string[] {
  const hrefs: string[] = [];
  for (const m of html.matchAll(/<link\b([^>]+)>/gi)) {
    const attrs = m[1];
    if (!/\brel\s*=\s*["']stylesheet["']/i.test(attrs)) continue;
    const hrefMatch = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i);
    if (!hrefMatch) continue;
    try {
      hrefs.push(new URL(hrefMatch[1], baseUrl).href);
    } catch { /* skip unparseable hrefs */ }
  }
  return hrefs;
}

// Extract @import URLs from a CSS text, resolved relative to the CSS file's own URL.
// Handles: @import "url", @import 'url', @import url("url"), @import url('url')
function extractImportUrls(css: string, baseCssUrl: string): string[] {
  const urls: string[] = [];
  for (const m of css.matchAll(/@import\s+(?:url\s*\(\s*)?["']([^"'\)]+)["']/gi)) {
    try {
      urls.push(new URL(m[1], baseCssUrl).href);
    } catch { /* skip unparseable */ }
  }
  return urls;
}

async function fetchCssSafe(cssUrl: string): Promise<string> {
  try {
    const res = await fetch(cssUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PaletteExtractor/1.0; +https://palette.tool)",
      },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return "";
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/css") && !ct.includes("text/plain") && !ct.includes("application/x-www-form-urlencoded")) return "";
    return await res.text();
  } catch {
    return "";
  }
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
  let isCssOnly = false;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PaletteExtractor/1.0; +https://palette.tool)",
        Accept: "text/html,text/css,*/*",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("text/css")) isCssOnly = true;
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

  // Step 1: Fetch linked CSS stylesheets from <link rel="stylesheet"> (skip for direct CSS URLs)
  const fetchedUrls = new Set<string>([url]);
  let linkedCssTexts: Array<{ text: string; url: string }> = [];
  let cssCount = 0;

  if (!isCssOnly) {
    const styleHrefs = extractStylesheetHrefs(html, url).slice(0, 5);
    if (styleHrefs.length > 0) {
      const results = await Promise.all(
        styleHrefs.map(async (href) => {
          fetchedUrls.add(href);
          return { text: await fetchCssSafe(href), url: href };
        })
      );
      linkedCssTexts = results.filter((r) => r.text.length > 0);
      cssCount = linkedCssTexts.length;
    }
  }

  // Step 2: Follow one level of @import from the linked stylesheets.
  // Collect all @import URLs found across every successfully-fetched stylesheet,
  // skip any URL already fetched, cap at 8 additional files.
  let importCount = 0;
  const importCssTexts: string[] = [];

  if (linkedCssTexts.length > 0) {
    const importUrls: string[] = [];
    for (const { text, url: cssUrl } of linkedCssTexts) {
      for (const importUrl of extractImportUrls(text, cssUrl)) {
        if (!fetchedUrls.has(importUrl) && importUrls.length < 8) {
          fetchedUrls.add(importUrl);
          importUrls.push(importUrl);
        }
      }
    }
    if (importUrls.length > 0) {
      const importTexts = await Promise.all(importUrls.map(fetchCssSafe));
      for (const t of importTexts) {
        if (t) {
          importCssTexts.push(t);
          importCount++;
        }
      }
    }
  }

  const counts = new Map<string, number>();
  mineColors(html, counts);
  for (const { text } of linkedCssTexts) mineColors(text, counts);
  for (const text of importCssTexts) mineColors(text, counts);

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

  return NextResponse.json({ colors: selected, cssCount, importCount });
}
