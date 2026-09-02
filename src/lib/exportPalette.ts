"use client";

import type { Palette, ColorStory } from "@/types";
import { hexToRgb, rgbToHsl, rgbToCmyk, hexToOklch, simulateCmykPrint, getPaletteMood, simulateColorBlind, type ColorBlindType } from "./utils";

const MOOD_DOTS: Record<string, string> = {
  warm: "#f59e0b",
  cool: "#0ea5e9",
  earthy: "#84cc16",
  vivid: "#f43f5e",
  muted: "#71717a",
  dreamy: "#8b5cf6",
};

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function getPaletteShareUrl(palette: Palette): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const colors = palette.colors.map((c) => c.hex.replace("#", "")).join(",");
  let url = `${base}/p?n=${encodeURIComponent(palette.name)}&c=${colors}`;
  if (palette.notes) url += `&no=${encodeURIComponent(palette.notes)}`;
  if (palette.colors.some((c) => c.name)) {
    url += `&s=${palette.colors.map((c) => encodeURIComponent(c.name ?? "")).join(",")}`;
  }
  return url;
}

function buildPaletteCanvas(palette: Palette): HTMLCanvasElement | null {
  const n = palette.colors.length;
  const CARD_W = 800;
  const SW = CARD_W / n;
  const HEADER_H = 64;
  const SWATCH_H = 190;
  const hasNames = palette.colors.some((c) => c.name);
  const LABEL_H = hasNames ? 106 : 84;
  const FOOTER_H = 30;
  const TOTAL_H = HEADER_H + SWATCH_H + LABEL_H + FOOTER_H;

  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = TOTAL_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Background
  ctx.fillStyle = "#fafaf8";
  ctx.fillRect(0, 0, CARD_W, TOTAL_H);

  // Header — gradient logo mark
  const grd = ctx.createLinearGradient(20, 20, 44, 44);
  grd.addColorStop(0, "#fda4af");
  grd.addColorStop(0.5, "#c4b5fd");
  grd.addColorStop(1, "#93c5fd");
  ctx.fillStyle = grd;
  const [mx, my, mw, mh, mr] = [20, 20, 24, 24, 5];
  ctx.beginPath();
  ctx.moveTo(mx + mr, my);
  ctx.lineTo(mx + mw - mr, my);
  ctx.quadraticCurveTo(mx + mw, my, mx + mw, my + mr);
  ctx.lineTo(mx + mw, my + mh - mr);
  ctx.quadraticCurveTo(mx + mw, my + mh, mx + mw - mr, my + mh);
  ctx.lineTo(mx + mr, my + mh);
  ctx.quadraticCurveTo(mx, my + mh, mx, my + mh - mr);
  ctx.lineTo(mx, my + mr);
  ctx.quadraticCurveTo(mx, my, mx + mr, my);
  ctx.closePath();
  ctx.fill();

  const SANS = "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";
  const MONO = "'Courier New', Courier, monospace";

  ctx.fillStyle = "#1c1c19";
  ctx.font = `bold 17px ${SANS}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const displayName = palette.name.length > 60 ? palette.name.slice(0, 60) + "…" : palette.name;
  ctx.fillText(displayName, 52, HEADER_H / 2);

  ctx.fillStyle = "#9a9a90";
  ctx.font = `12px ${SANS}`;
  ctx.textAlign = "right";
  ctx.fillText(`${n} color${n !== 1 ? "s" : ""}`, CARD_W - 20, HEADER_H / 2);

  ctx.fillStyle = "#e2e2da";
  ctx.fillRect(0, HEADER_H - 1, CARD_W, 1);

  // Swatches
  let cx = 0;
  const printSims = palette.colors.map((c) => simulateCmykPrint(c.hex));

  palette.colors.forEach((color, i) => {
    const w = i === n - 1 ? CARD_W - Math.round(cx) : Math.round(SW);
    ctx.fillStyle = color.hex;
    ctx.fillRect(Math.round(cx), HEADER_H, w, SWATCH_H);
    cx += SW;
  });

  // CMYK risk badges overlaid on swatches
  cx = 0;
  palette.colors.forEach((color, i) => {
    const w = i === n - 1 ? CARD_W - Math.round(cx) : Math.round(SW);
    const sim = printSims[i];

    if (sim.risk !== "safe") {
      const badgeColor = sim.risk === "high" ? "rgba(225,29,72,0.92)" : "rgba(217,119,6,0.92)";
      const label = w >= 54 ? `ΔE ${sim.deltaE}` : "!";
      ctx.font = `bold 8px ${SANS}`;
      const textW = ctx.measureText(label).width;
      const badgeW = textW + 8;
      const badgeH = 15;
      const bx = Math.round(cx) + w - badgeW - 4;
      const by = HEADER_H + 5;
      const br = 3;

      ctx.fillStyle = badgeColor;
      ctx.beginPath();
      ctx.moveTo(bx + br, by);
      ctx.lineTo(bx + badgeW - br, by);
      ctx.quadraticCurveTo(bx + badgeW, by, bx + badgeW, by + br);
      ctx.lineTo(bx + badgeW, by + badgeH - br);
      ctx.quadraticCurveTo(bx + badgeW, by + badgeH, bx + badgeW - br, by + badgeH);
      ctx.lineTo(bx + br, by + badgeH);
      ctx.quadraticCurveTo(bx, by + badgeH, bx, by + badgeH - br);
      ctx.lineTo(bx, by + br);
      ctx.quadraticCurveTo(bx, by, bx + br, by);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = `bold 8px ${SANS}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, bx + badgeW / 2, by + badgeH / 2);
    }

    if (sim.risk !== "safe") {
      ctx.fillStyle = sim.printHex;
      ctx.fillRect(Math.round(cx), HEADER_H + SWATCH_H - 10, w, 10);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = `7px ${SANS}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("print", Math.round(cx) + w / 2, HEADER_H + SWATCH_H - 5);
    }

    cx += SW;
  });

  // Label area
  const labelY = HEADER_H + SWATCH_H;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, labelY, CARD_W, LABEL_H);
  ctx.fillStyle = "#e2e2da";
  ctx.fillRect(0, labelY, CARD_W, 1);

  cx = 0;
  palette.colors.forEach((color, i) => {
    const w = i === n - 1 ? CARD_W - Math.round(cx) : Math.round(SW);
    const centerX = Math.round(cx) + w / 2;

    if (i > 0) {
      ctx.fillStyle = "#e2e2da";
      ctx.fillRect(Math.round(cx), labelY, 1, LABEL_H);
    }

    const rgb = hexToRgb(color.hex);
    const cmyk = rgb ? rgbToCmyk(rgb.r, rgb.g, rgb.b) : { c: 0, m: 0, y: 0, k: 100 };
    const sim = printSims[i];
    const cmykColor = sim.risk === "high" ? "#c8192e" : sim.risk === "caution" ? "#b45309" : "#7c7c74";

    ctx.fillStyle = "#1c1c19";
    ctx.font = `bold 12px ${MONO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(color.hex.toUpperCase(), centerX, labelY + 11);

    ctx.fillStyle = cmykColor;
    ctx.font = `10px ${MONO}`;
    ctx.fillText(`C${cmyk.c}  M${cmyk.m}`, centerX, labelY + 29);
    ctx.fillText(`Y${cmyk.y}  K${cmyk.k}`, centerX, labelY + 44);

    if (rgb) {
      ctx.fillStyle = "#b4b4aa";
      ctx.font = `9px ${MONO}`;
      ctx.fillText(`${rgb.r} ${rgb.g} ${rgb.b}`, centerX, labelY + 61);
    }

    if (hasNames && color.name) {
      ctx.font = `italic 10px ${SANS}`;
      ctx.fillStyle = "#9a9a90";
      let swName = color.name;
      const maxW = w - 8;
      while (swName.length > 3 && ctx.measureText(swName).width > maxW) {
        swName = swName.slice(0, -1);
      }
      if (swName.length < color.name.length) swName += "…";
      ctx.fillText(swName, centerX, labelY + 78);
    }

    cx += SW;
  });

  // Footer
  const fy = labelY + LABEL_H;
  ctx.fillStyle = "#f0f0e8";
  ctx.fillRect(0, fy, CARD_W, FOOTER_H);
  ctx.fillStyle = "#e2e2da";
  ctx.fillRect(0, fy, CARD_W, 1);

  const hasRisk = printSims.some((s) => s.risk !== "safe");
  if (hasRisk) {
    ctx.font = `9px ${SANS}`;
    ctx.textBaseline = "middle";
    const midY = fy + FOOTER_H / 2;
    ctx.textAlign = "left";
    ctx.fillStyle = "#aaaaa0";
    ctx.fillText("CMYK:", 16, midY);
    ctx.fillStyle = "#b45309";
    ctx.fillText("amber = caution (ΔE 3–10)", 52, midY);
    ctx.fillStyle = "#aaaaa0";
    ctx.fillText("·", 196, midY);
    ctx.fillStyle = "#c8192e";
    ctx.fillText("red = high risk (ΔE > 10)", 204, midY);
    ctx.fillStyle = "#aaaaa0";
    ctx.textAlign = "right";
    ctx.fillText("Made with Palette", CARD_W - 16, midY);
  } else {
    ctx.fillStyle = "#aaaaa0";
    ctx.font = `10px ${SANS}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Made with Palette · color intelligence for creators", CARD_W / 2, fy + FOOTER_H / 2);
  }

  return canvas;
}

export function exportAsPngStrip(palette: Palette): void {
  const canvas = buildPaletteCanvas(palette);
  if (!canvas) return;
  const link = document.createElement("a");
  link.download = `${palette.name.replace(/\s+/g, "-").toLowerCase()}-palette.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export function exportCollectionSheet(palettes: Palette[], collectionName: string): void {
  if (palettes.length === 0) return;

  const SANS = "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";
  const MONO = "'Courier New', Courier, monospace";

  const W = 1200;
  const HEADER_H = 72;
  const FOOTER_H = 36;
  const ROW_SWATCH_H = 52;
  const ROW_LABEL_H = 30;
  const ROW_H = ROW_SWATCH_H + ROW_LABEL_H;
  const ROW_GAP = 1; // separator line between rows
  const PAD_X = 32;

  const totalH = HEADER_H + palettes.length * (ROW_H + ROW_GAP) + FOOTER_H;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = totalH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background
  ctx.fillStyle = "#fafaf8";
  ctx.fillRect(0, 0, W, totalH);

  // Header
  const grd = ctx.createLinearGradient(PAD_X, 18, PAD_X + 28, 46);
  grd.addColorStop(0, "#fda4af");
  grd.addColorStop(0.5, "#c4b5fd");
  grd.addColorStop(1, "#93c5fd");
  ctx.fillStyle = grd;
  const [mx, my, mw, mh, mr] = [PAD_X, 18, 28, 28, 6];
  ctx.beginPath();
  ctx.moveTo(mx + mr, my);
  ctx.lineTo(mx + mw - mr, my);
  ctx.quadraticCurveTo(mx + mw, my, mx + mw, my + mr);
  ctx.lineTo(mx + mw, my + mh - mr);
  ctx.quadraticCurveTo(mx + mw, my + mh, mx + mw - mr, my + mh);
  ctx.lineTo(mx + mr, my + mh);
  ctx.quadraticCurveTo(mx, my + mh, mx, my + mh - mr);
  ctx.lineTo(mx, my + mr);
  ctx.quadraticCurveTo(mx, my, mx + mr, my);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#1c1c19";
  ctx.font = `bold 20px ${SANS}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const displayName = collectionName.length > 80 ? collectionName.slice(0, 80) + "…" : collectionName;
  ctx.fillText(displayName, PAD_X + mw + 12, HEADER_H / 2);

  ctx.fillStyle = "#9a9a90";
  ctx.font = `13px ${SANS}`;
  ctx.textAlign = "right";
  ctx.fillText(`${palettes.length} palette${palettes.length !== 1 ? "s" : ""}`, W - PAD_X, HEADER_H / 2);

  ctx.fillStyle = "#e2e2da";
  ctx.fillRect(0, HEADER_H - 1, W, 1);

  // Palette rows
  let rowY = HEADER_H;
  palettes.forEach((palette, idx) => {
    const n = palette.colors.length;
    const swatchAreaW = W - PAD_X * 2;
    const SW = swatchAreaW / Math.max(n, 1);

    // Swatch strip
    let cx = PAD_X;
    palette.colors.forEach((color, i) => {
      const w = i === n - 1 ? PAD_X + swatchAreaW - Math.round(cx) : Math.round(SW);
      ctx.fillStyle = color.hex;
      ctx.fillRect(Math.round(cx), rowY, w, ROW_SWATCH_H);
      cx += SW;
    });

    // Label row
    const labelY = rowY + ROW_SWATCH_H;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, labelY, W, ROW_LABEL_H);

    ctx.fillStyle = "#e2e2da";
    ctx.fillRect(0, labelY, W, 1); // top border of label area

    // CMYK print-risk indicator
    const sims = palette.colors.map((c) => simulateCmykPrint(c.hex));
    const hasHighRisk = sims.some((s) => s.risk === "high");
    const hasCautionRisk = sims.some((s) => s.risk === "caution");
    const riskLevel = hasHighRisk ? "high" : hasCautionRisk ? "caution" : "safe";
    const DOT_R = 4;
    const dotCY = labelY + ROW_LABEL_H / 2;
    const dotCX = PAD_X + DOT_R;
    const nameX = riskLevel !== "safe" ? dotCX + DOT_R + 7 : PAD_X;

    if (riskLevel !== "safe") {
      ctx.beginPath();
      ctx.arc(dotCX, dotCY, DOT_R, 0, Math.PI * 2);
      ctx.fillStyle = riskLevel === "high" ? "#e11d48" : "#d97706";
      ctx.fill();
    }

    // Palette name
    ctx.fillStyle = "#1c1c19";
    ctx.font = `500 12px ${SANS}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const nameTrunc = palette.name.length > 90 ? palette.name.slice(0, 90) + "…" : palette.name;
    ctx.fillText(nameTrunc, nameX, labelY + ROW_LABEL_H / 2);

    // Hex codes (first 5) + color count
    const hexStr = palette.colors.slice(0, 5).map((c) => c.hex.toUpperCase()).join("  ");
    const more = palette.colors.length > 5 ? `  +${palette.colors.length - 5}` : "";
    ctx.fillStyle = "#9a9a90";
    ctx.font = `10px ${MONO}`;
    ctx.textAlign = "right";
    ctx.fillText(`${hexStr}${more}`, W - PAD_X, labelY + ROW_LABEL_H / 2);

    // Row separator
    if (idx < palettes.length - 1) {
      ctx.fillStyle = "#e8e8e0";
      ctx.fillRect(0, labelY + ROW_LABEL_H, W, ROW_GAP);
    }

    rowY += ROW_H + ROW_GAP;
  });

  // Footer
  ctx.fillStyle = "#f0f0e8";
  ctx.fillRect(0, rowY, W, FOOTER_H);
  ctx.fillStyle = "#e2e2da";
  ctx.fillRect(0, rowY, W, 1);
  ctx.fillStyle = "#aaaaa0";
  ctx.font = `10px ${SANS}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Made with Palette · color intelligence for creators", W / 2, rowY + FOOTER_H / 2);

  // Risk legend — only if any palette has a risk dot
  const anyRisk = palettes.some((p) => p.colors.some((c) => simulateCmykPrint(c.hex).risk !== "safe"));
  if (anyRisk) {
    const legendDots: { color: string; label: string }[] = [
      { color: "#e11d48", label: "high CMYK shift" },
      { color: "#d97706", label: "caution" },
    ];
    let lx = PAD_X;
    const ly = rowY + FOOTER_H / 2;
    legendDots.forEach(({ color, label }) => {
      ctx.beginPath();
      ctx.arc(lx + 4, ly, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.fillStyle = "#aaaaa0";
      ctx.font = `10px ${SANS}`;
      ctx.textAlign = "left";
      ctx.fillText(label, lx + 11, ly);
      const textW = ctx.measureText(label).width;
      lx += 11 + textW + 16;
    });
  }

  const link = document.createElement("a");
  const slug = collectionName.replace(/\s+/g, "-").toLowerCase().replace(/[^a-z0-9-]/g, "") || "collection";
  link.download = `${slug}-palette-sheet.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export async function batchExportZip(palettes: Palette[], zipName?: string): Promise<void> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  const toBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
    new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas.toBlob failed"))), "image/png")
    );

  // Track duplicate filenames and append index to disambiguate
  const nameCounts = new Map<string, number>();
  for (const palette of palettes) {
    const slug = palette.name.replace(/\s+/g, "-").toLowerCase();
    nameCounts.set(slug, (nameCounts.get(slug) ?? 0) + 1);
  }
  const nameUsed = new Map<string, number>();

  for (const palette of palettes) {
    const canvas = buildPaletteCanvas(palette);
    if (!canvas) continue;
    const blob = await toBlob(canvas);
    const slug = palette.name.replace(/\s+/g, "-").toLowerCase();
    const total = nameCounts.get(slug) ?? 1;
    let filename: string;
    if (total > 1) {
      const idx = (nameUsed.get(slug) ?? 0) + 1;
      nameUsed.set(slug, idx);
      filename = `${slug}-${idx}-palette.png`;
    } else {
      filename = `${slug}-palette.png`;
    }
    zip.file(filename, blob);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  const baseName = zipName
    ? `${zipName.replace(/\s+/g, "-").toLowerCase()}-${date}`
    : `palette-export-${date}`;
  link.download = `${baseName}.zip`;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function copyCssVariables(palette: Palette): void {
  const vars = palette.colors
    .map((c, i) => {
      let varName: string;
      if (c.name) {
        const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        varName = slug || `color-${i + 1}`;
      } else {
        varName = `color-${i + 1}`;
      }
      return `  --${varName}: ${c.hex};`;
    })
    .join("\n");
  const css = `:root {\n${vars}\n}`;
  navigator.clipboard.writeText(css);
}

export function copyHexList(palette: Palette): void {
  const hexes = palette.colors.map((c) => c.hex).join(", ");
  navigator.clipboard.writeText(hexes);
}

export function copyFlatHexList(palette: Palette): void {
  const hexes = palette.colors.map((c) => c.hex).join("\n");
  navigator.clipboard.writeText(hexes);
}

export function copyCollectionHexList(palettes: Palette[], collectionName: string): void {
  const header = `# ${collectionName}`;
  const body = palettes.flatMap((p) => [
    `## ${p.name}`,
    ...p.colors.map((c) => c.hex.toUpperCase()),
  ]);
  navigator.clipboard.writeText([header, ...body].join("\n"));
}

export function copyTailwindConfig(palette: Palette): void {
  const slugPalette = palette.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "palette";

  // Deduplicate key collisions (e.g. two unnamed swatches after slugification)
  const seenSlugs = new Map<string, number>();
  const keys = palette.colors.map((c, i) => {
    let base: string;
    if (c.name) {
      const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      base = slug || `color-${i + 1}`;
    } else {
      base = `color-${i + 1}`;
    }
    const count = seenSlugs.get(base) ?? 0;
    seenSlugs.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  });

  const inner = keys.map((key, i) => `    "${key}": "${palette.colors[i].hex}",`).join("\n");
  const output = `// Paste into tailwind.config.js → theme.extend.colors\n"${slugPalette}": {\n${inner}\n},`;
  navigator.clipboard.writeText(output);
}

export type GradientDirection = "to right" | "135deg" | "to bottom" | "radial";
export type GradientOrder = "palette" | "light-dark" | "dark-light" | "hue";

function sortedGradientColors(palette: Palette, order: GradientOrder): string[] {
  const hexes = palette.colors.map((c) => c.hex);
  if (order === "palette") return hexes;
  const withMeta = hexes.map((hex) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return { hex, l: 0, h: 0 };
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return { hex, l: hsl.l, h: hsl.h };
  });
  if (order === "light-dark") return [...withMeta].sort((a, b) => b.l - a.l).map((c) => c.hex);
  if (order === "dark-light") return [...withMeta].sort((a, b) => a.l - b.l).map((c) => c.hex);
  return [...withMeta].sort((a, b) => a.h - b.h).map((c) => c.hex);
}

export function getGradientCss(palette: Palette, direction: GradientDirection, order: GradientOrder): string {
  const colors = sortedGradientColors(palette, order);
  if (colors.length === 0) return "";
  if (direction === "radial") {
    return `radial-gradient(circle at center, ${colors.join(", ")})`;
  }
  return `linear-gradient(${direction}, ${colors.join(", ")})`;
}

export function exportAsGradientPng(
  palette: Palette,
  direction: GradientDirection,
  order: GradientOrder
): void {
  if (typeof document === "undefined") return;

  const W = 1200;
  const H = 400;
  const SANS = "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";
  const MONO = "'Courier New', Courier, monospace";

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const colors = sortedGradientColors(palette, order);

  // Full-canvas gradient background
  let grad: CanvasGradient;
  if (direction === "radial") {
    grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) / 2);
  } else {
    const coords: [number, number, number, number] =
      direction === "to right"  ? [0, 0, W, 0] :
      direction === "to bottom" ? [0, 0, 0, H] :
                                  [0, 0, W, H];
    grad = ctx.createLinearGradient(...coords);
  }
  const stops = colors.length > 1 ? colors.length - 1 : 1;
  colors.forEach((hex, i) => grad.addColorStop(i / stops, hex));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Bottom frosted panel
  const PANEL_H = 128;
  const panelY = H - PANEL_H;
  const panelGrad = ctx.createLinearGradient(0, panelY - 40, 0, H);
  panelGrad.addColorStop(0, "rgba(0,0,0,0)");
  panelGrad.addColorStop(0.35, "rgba(0,0,0,0.52)");
  panelGrad.addColorStop(1, "rgba(0,0,0,0.72)");
  ctx.fillStyle = panelGrad;
  ctx.fillRect(0, panelY - 40, W, PANEL_H + 40);

  // Palette name (left side of panel)
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.font = `bold 28px ${SANS}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 8;
  const nameTrunc = palette.name.length > 44 ? palette.name.slice(0, 44) + "…" : palette.name;
  ctx.fillText(nameTrunc, 44, panelY + 32);
  ctx.shadowBlur = 0;

  ctx.fillStyle = "rgba(255,255,255,0.50)";
  ctx.font = `14px ${SANS}`;
  ctx.fillText(`${palette.colors.length} color${palette.colors.length !== 1 ? "s" : ""}`, 44, panelY + 60);

  // Swatch row with hex labels (right side of panel)
  const SW = 36;
  const GAP = 8;
  const n = colors.length;
  const totalSwatchW = n * SW + (n - 1) * GAP;
  const swatchStartX = W - 44 - totalSwatchW;
  const swatchY = panelY + 18;
  const HEX_Y = swatchY + SW + 14;

  colors.forEach((hex, i) => {
    const sx = swatchStartX + i * (SW + GAP);
    // Swatch square with subtle shadow
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    roundRectPath(ctx, sx, swatchY, SW, SW, 6);
    ctx.fillStyle = hex;
    ctx.fill();
    ctx.restore();
    // White ring
    ctx.strokeStyle = "rgba(255,255,255,0.30)";
    ctx.lineWidth = 1;
    roundRectPath(ctx, sx, swatchY, SW, SW, 6);
    ctx.stroke();
    // Hex label
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = `9px ${MONO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(hex.slice(1).toUpperCase(), sx + SW / 2, HEX_Y);
  });

  // Branding watermark (top-right)
  ctx.fillStyle = "rgba(255,255,255,0.38)";
  ctx.font = `bold 12px ${SANS}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText("Palette", W - 28, 22);

  const slug = palette.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const dirSlug: Record<GradientDirection, string> = {
    "to right": "lr",
    "to bottom": "tb",
    "135deg": "diag",
    "radial": "radial",
  };
  const orderSlug: Record<GradientOrder, string> = {
    "palette": "orig",
    "light-dark": "light-dark",
    "dark-light": "dark-light",
    "hue": "hue",
  };
  const link = document.createElement("a");
  link.download = `${slug}-gradient-${dirSlug[direction]}-${orderSlug[order]}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export function copyGradientSvg(palette: Palette, direction: GradientDirection, order: GradientOrder): void {
  const colors = sortedGradientColors(palette, order);
  if (colors.length === 0) return;

  const stops = colors.length > 1 ? colors.length - 1 : 1;
  const stopTags = colors
    .map((hex, i) => `      <stop offset="${Math.round((i / stops) * 100)}%" stop-color="${hex}"/>`)
    .join("\n");

  const id = "palette-gradient";
  let gradDef: string;
  if (direction === "radial") {
    gradDef = `    <radialGradient id="${id}" cx="50%" cy="50%" r="70.7%" gradientUnits="objectBoundingBox">\n${stopTags}\n    </radialGradient>`;
  } else {
    const coords =
      direction === "to right"  ? ["0%", "50%", "100%", "50%"] :
      direction === "to bottom" ? ["50%", "0%", "50%", "100%"] :
                                  ["0%", "0%", "100%", "100%"];
    gradDef = `    <linearGradient id="${id}" x1="${coords[0]}" y1="${coords[1]}" x2="${coords[2]}" y2="${coords[3]}">\n${stopTags}\n    </linearGradient>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400" viewBox="0 0 1200 400">\n  <defs>\n${gradDef}\n  </defs>\n  <rect width="1200" height="400" fill="url(#${id})"/>\n</svg>`;
  navigator.clipboard.writeText(svg);
}

export function copyCmykList(palette: Palette): void {
  const lines = palette.colors
    .map((c) => {
      const rgb = hexToRgb(c.hex);
      if (!rgb) return `${c.hex.toUpperCase()}: C0 M0 Y0 K100`;
      const { c: cy, m, y, k } = rgbToCmyk(rgb.r, rgb.g, rgb.b);
      return `${c.hex.toUpperCase()}  C${cy} M${m} Y${y} K${k}`;
    })
    .join("\n");
  navigator.clipboard.writeText(lines);
}

export function exportAsCsv(palette: Palette): void {
  const headers = ["name", "hex", "r", "g", "b", "h", "s", "l", "c%", "m%", "y%", "k%", "oklch_l", "oklch_c", "oklch_h"];

  const rows = palette.colors.map((color) => {
    const rgb = hexToRgb(color.hex);
    const hsl = rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null;
    const cmyk = rgb ? rgbToCmyk(rgb.r, rgb.g, rgb.b) : null;
    const oklch = hexToOklch(color.hex);
    const name = color.name ? `"${color.name.replace(/"/g, '""')}"` : "";

    return [
      name,
      color.hex.toUpperCase(),
      rgb ? rgb.r : "",
      rgb ? rgb.g : "",
      rgb ? rgb.b : "",
      hsl ? Math.round(hsl.h) : "",
      hsl ? Math.round(hsl.s) : "",
      hsl ? Math.round(hsl.l) : "",
      cmyk ? cmyk.c : "",
      cmyk ? cmyk.m : "",
      cmyk ? cmyk.y : "",
      cmyk ? cmyk.k : "",
      oklch ? oklch.l.toFixed(3) : "",
      oklch ? oklch.c.toFixed(4) : "",
      oklch ? oklch.h.toFixed(1) : "",
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `${palette.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-palette.csv`;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function getJsonExport(palette: Palette): string {
  return JSON.stringify(
    {
      name: palette.name,
      colors: palette.colors.map((c) => {
        const rgb = hexToRgb(c.hex);
        const hsl = rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null;
        const cmyk = rgb ? rgbToCmyk(rgb.r, rgb.g, rgb.b) : null;
        const oklch = hexToOklch(c.hex);
        return {
          hex: c.hex,
          ...(c.name ? { name: c.name } : {}),
          rgb,
          hsl: hsl ? { h: Math.round(hsl.h), s: Math.round(hsl.s), l: Math.round(hsl.l) } : null,
          cmyk,
          oklch: oklch ? { l: parseFloat(oklch.l.toFixed(3)), c: parseFloat(oklch.c.toFixed(4)), h: parseFloat(oklch.h.toFixed(1)) } : null,
        };
      }),
    },
    null,
    2
  );
}

interface MoodBoardOptions {
  dark?: boolean;
  portrait?: boolean;
}

function buildMoodBoardCanvas(palette: Palette, options: MoodBoardOptions = {}): HTMLCanvasElement | null {
  const { dark = false, portrait = false } = options;
  const n = palette.colors.length;
  if (n === 0) return null;

  const W = 1080;
  const H = portrait ? 1350 : 1080;
  const PAD = 56;
  const HEADER_H = 148;
  const FOOTER_H = 76;
  const GAP = 14;
  const LABEL_H = 70;
  const RADIUS = 14;
  const SANS = "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";
  const MONO = "'Courier New', Courier, monospace";

  // Grid columns: 1→1, 2→2, 3-4→2, 5-6→3, 7-8→4
  const cols = n === 1 ? 1 : n === 2 ? 2 : n <= 4 ? 2 : n <= 6 ? 3 : 4;
  const rows = Math.ceil(n / cols);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Background
  const bgGrd = ctx.createLinearGradient(0, 0, W, H);
  if (dark) {
    bgGrd.addColorStop(0, "#1A1A14");
    bgGrd.addColorStop(1, "#0F0F0A");
  } else {
    bgGrd.addColorStop(0, "#FAFAF7");
    bgGrd.addColorStop(1, "#F1F1EB");
  }
  ctx.fillStyle = bgGrd;
  ctx.fillRect(0, 0, W, H);

  // ---- Header ----
  const titleY = PAD + 56;

  ctx.font = `bold 52px ${SANS}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const maxTitleW = W - PAD * 2 - 200;
  let title = palette.name;
  while (ctx.measureText(title).width > maxTitleW && title.length > 5) {
    title = title.slice(0, -1);
  }
  if (title.length < palette.name.length) title += "…";
  ctx.fillStyle = dark ? "#F5F5EF" : "#1A1A14";
  ctx.fillText(title, PAD, titleY);

  // Color count pill
  ctx.font = `500 18px ${SANS}`;
  const pillText = `${n} color${n !== 1 ? "s" : ""}`;
  const pillTextW = ctx.measureText(pillText).width;
  const pillW = pillTextW + 24;
  const pillH = 30;
  const pillX = W - PAD - pillW;
  const pillY = titleY - pillH / 2;
  roundRectPath(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fillStyle = dark ? "#2A2A22" : "#E2E2DA";
  ctx.fill();
  ctx.fillStyle = dark ? "#888880" : "#6A6A60";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(pillText, pillX + pillW / 2, titleY);

  // Mood + optional notes line
  const mood = getPaletteMood(palette.colors);
  const moodDot = MOOD_DOTS[mood] ?? "#8A8A80";
  const moodY = PAD + 108;

  ctx.beginPath();
  ctx.arc(PAD + 7, moodY, 7, 0, Math.PI * 2);
  ctx.fillStyle = moodDot;
  ctx.fill();

  ctx.font = `18px ${SANS}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = dark ? "#888880" : "#6A6A60";
  ctx.fillText(mood, PAD + 22, moodY);

  if (palette.notes) {
    const moodTextW = ctx.measureText(mood).width;
    const sepX = PAD + 22 + moodTextW + 12;
    ctx.fillStyle = dark ? "#3A3A30" : "#C8C8C0";
    ctx.fillText("·", sepX, moodY);
    const noteStartX = sepX + ctx.measureText("· ").width + 4;
    ctx.font = `italic 17px ${SANS}`;
    ctx.fillStyle = dark ? "#666660" : "#AAAAAA";
    let noteText = palette.notes.split("\n")[0];
    const maxNoteW = W - PAD - noteStartX;
    while (ctx.measureText(noteText).width > maxNoteW && noteText.length > 4) {
      noteText = noteText.slice(0, -1);
    }
    if (noteText.length < palette.notes.split("\n")[0].length) noteText += "…";
    ctx.fillText(`"${noteText}"`, noteStartX, moodY);
  }

  // ---- Swatch Grid ----
  const gridTop = PAD + HEADER_H;
  const gridW = W - PAD * 2;
  const gridH = H - gridTop - PAD - FOOTER_H;
  const cellW = (gridW - GAP * (cols - 1)) / cols;
  const cellH = (gridH - GAP * (rows - 1)) / rows;
  const swatchH = cellH - LABEL_H;

  palette.colors.forEach((color, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = PAD + col * (cellW + GAP);
    const cy = gridTop + row * (cellH + GAP);

    ctx.save();
    ctx.shadowColor = dark ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.10)";
    ctx.shadowBlur = dark ? 36 : 28;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = dark ? 10 : 8;
    ctx.fillStyle = color.hex;
    roundRectPath(ctx, cx, cy, cellW, swatchH, RADIUS);
    ctx.fill();
    ctx.restore();

    const labelCy = cy + swatchH;
    ctx.font = `bold 18px ${MONO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = dark ? "#F5F5EF" : "#1A1A14";
    ctx.fillText(color.hex.toUpperCase(), cx + cellW / 2, labelCy + 12);

    if (color.name) {
      ctx.font = `15px ${SANS}`;
      ctx.fillStyle = dark ? "#666660" : "#8A8A80";
      let swName = color.name;
      const maxSW = cellW - 8;
      while (ctx.measureText(swName).width > maxSW && swName.length > 3) {
        swName = swName.slice(0, -1);
      }
      if (swName.length < color.name.length) swName += "…";
      ctx.fillText(swName, cx + cellW / 2, labelCy + 38);
    }
  });

  // ---- Footer ----
  const footerTop = H - PAD - FOOTER_H;
  ctx.fillStyle = dark ? "#2A2A22" : "#DEDED6";
  ctx.fillRect(PAD, footerTop + 10, gridW, 1);

  const lx = PAD, ly = footerTop + 24;
  const lw = 26, lh = 26, lr = 6;
  const logoGrd = ctx.createLinearGradient(lx, ly, lx + lw, ly + lh);
  logoGrd.addColorStop(0, "#fda4af");
  logoGrd.addColorStop(0.5, "#c4b5fd");
  logoGrd.addColorStop(1, "#93c5fd");
  ctx.fillStyle = logoGrd;
  roundRectPath(ctx, lx, ly, lw, lh, lr);
  ctx.fill();

  ctx.font = `bold 17px ${SANS}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = dark ? "#C8C8C0" : "#3A3A30";
  ctx.fillText("Palette", lx + lw + 10, ly + lh / 2);

  ctx.font = `500 15px ${SANS}`;
  ctx.fillStyle = dark ? "#555550" : "#AAAAAA";
  ctx.fillText("color intelligence for creators", lx + lw + 84, ly + lh / 2);

  const dateStr = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date());
  ctx.font = `15px ${SANS}`;
  ctx.textAlign = "right";
  ctx.fillStyle = dark ? "#444440" : "#BBBBAA";
  ctx.fillText(dateStr, W - PAD, ly + lh / 2);

  return canvas;
}

export function exportAsMoodBoard(palette: Palette): void {
  const canvas = buildMoodBoardCanvas(palette, { dark: false, portrait: false });
  if (!canvas) return;
  const link = document.createElement("a");
  link.download = `${palette.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-moodboard.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export function exportAsDarkMoodBoard(palette: Palette): void {
  const canvas = buildMoodBoardCanvas(palette, { dark: true, portrait: false });
  if (!canvas) return;
  const link = document.createElement("a");
  link.download = `${palette.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-moodboard-dark.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export function exportAsPortraitMoodBoard(palette: Palette): void {
  const canvas = buildMoodBoardCanvas(palette, { dark: false, portrait: true });
  if (!canvas) return;
  const link = document.createElement("a");
  link.download = `${palette.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-moodboard-portrait.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export function exportAsDarkPortraitMoodBoard(palette: Palette): void {
  const canvas = buildMoodBoardCanvas(palette, { dark: true, portrait: true });
  if (!canvas) return;
  const link = document.createElement("a");
  link.download = `${palette.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-moodboard-portrait-dark.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function rgbToHsb(r: number, g: number, b: number): { h: number; s: number; b: number } {
  const nr = r / 255, ng = g / 255, nb = b / 255;
  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const delta = max - min;
  let h = 0;
  if (delta > 0) {
    if (max === nr) h = ((ng - nb) / delta) % 6;
    else if (max === ng) h = (nb - nr) / delta + 2;
    else h = (nr - ng) / delta + 4;
    h /= 6;
    if (h < 0) h += 1;
  }
  return { h, s: max > 0 ? delta / max : 0, b: max };
}

// Adobe Swatch Exchange (.ase) — binary format understood by Illustrator, Photoshop & InDesign.
// Structure: ASEF header → group-start block (palette name) → N color blocks → group-end block.
// Each color block stores the swatch name (UTF-16 BE, null-terminated) + linear-light RGB floats.
export function exportAsAse(palette: Palette): void {
  function utf16Units(str: string): number[] {
    const units: number[] = [];
    for (let i = 0; i < str.length; i++) units.push(str.charCodeAt(i));
    units.push(0);
    return units;
  }

  const groupUnits = utf16Units(palette.name);
  const entries = palette.colors.map((c) => {
    const nameUnits = utf16Units(c.name ?? c.hex.toUpperCase());
    const rgb = hexToRgb(c.hex);
    return { nameUnits, r: rgb ? rgb.r / 255 : 0, g: rgb ? rgb.g / 255 : 0, b: rgb ? rgb.b / 255 : 0 };
  });

  // Per-block body sizes
  const groupBodyLen = 2 + groupUnits.length * 2;
  // color body: 2 (name_len) + nameUnits*2 (UTF-16) + 4 (model) + 12 (3 RGB floats) + 2 (color type)
  const colorBodyLen = (e: { nameUnits: number[] }) => 2 + e.nameUnits.length * 2 + 4 + 12 + 2;

  // Header 12 + group_start (6+body) + colors (6+body each) + group_end (6)
  const totalSize =
    12 +
    (6 + groupBodyLen) +
    entries.reduce((s, e) => s + 6 + colorBodyLen(e), 0) +
    6;

  const buf = new ArrayBuffer(totalSize);
  const v = new DataView(buf);
  let o = 0;

  // "ASEF" magic
  v.setUint8(o++, 0x41); v.setUint8(o++, 0x53); v.setUint8(o++, 0x45); v.setUint8(o++, 0x46);
  // Version 1.0
  v.setUint16(o, 1, false); o += 2;
  v.setUint16(o, 0, false); o += 2;
  // Block count: group-start + N colors + group-end
  v.setUint32(o, 2 + entries.length, false); o += 4;

  // Group Start (0xC001)
  v.setUint16(o, 0xC001, false); o += 2;
  v.setUint32(o, groupBodyLen, false); o += 4;
  v.setUint16(o, groupUnits.length, false); o += 2;
  for (const u of groupUnits) { v.setUint16(o, u, false); o += 2; }

  // Color entries (0x0001)
  for (const e of entries) {
    v.setUint16(o, 0x0001, false); o += 2;
    v.setUint32(o, colorBodyLen(e), false); o += 4;
    v.setUint16(o, e.nameUnits.length, false); o += 2;
    for (const u of e.nameUnits) { v.setUint16(o, u, false); o += 2; }
    // Color model "RGB "
    v.setUint8(o++, 0x52); v.setUint8(o++, 0x47); v.setUint8(o++, 0x42); v.setUint8(o++, 0x20);
    // RGB float32 BE (0.0 – 1.0)
    v.setFloat32(o, e.r, false); o += 4;
    v.setFloat32(o, e.g, false); o += 4;
    v.setFloat32(o, e.b, false); o += 4;
    // Color type: 2 = normal
    v.setUint16(o, 2, false); o += 2;
  }

  // Group End (0xC002), body length 0
  v.setUint16(o, 0xC002, false); o += 2;
  v.setUint32(o, 0, false); o += 4;

  const blob = new Blob([buf], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `${palette.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ase`;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// Story Mood Board — 1080×1350 canvas combining swatches with the AI Color Story
function contrastForHex(hex: string): "#FFFFFF" | "#111111" {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? "#111111" : "#FFFFFF";
}

interface StoryMoodBoardOptions {
  dark?: boolean;
}

function buildStoryMoodBoardCanvas(palette: Palette, story: ColorStory, options: StoryMoodBoardOptions = {}): HTMLCanvasElement | null {
  const { dark = true } = options;
  const n = palette.colors.length;
  if (n === 0) return null;

  const W = 1080;
  const H = 1350;
  const PAD = 56;
  const SANS = "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";
  const MONO = "'Courier New', Courier, monospace";
  const CONTENT_W = W - PAD * 2;

  const t = dark ? {
    bg0: "#1A1A14", bg1: "#0F0F0A",
    name: "#F5F5EF",
    moodText: "#777770",
    divider: "#2D2D24",
    sectionLabel: "#484840",
    decorQuote: "#2A2A20",
    vibeText: "#C0C0B8",
    pillBg: "#252520", pillText: "#848480",
    promptBox: "#1C1C16", promptText: "#707068",
    footerLine: "#252520",
    footerBrand: "#B8B8B0", footerSub: "#484840", footerDate: "#3A3A30",
  } : {
    bg0: "#FAFAF7", bg1: "#F0F0E8",
    name: "#1A1A14",
    moodText: "#6A6A60",
    divider: "#D8D8CC",
    sectionLabel: "#A0A098",
    decorQuote: "#DEDED6",
    vibeText: "#3A3A30",
    pillBg: "#E8E8E0", pillText: "#6A6A60",
    promptBox: "#EDEDE5", promptText: "#787870",
    footerLine: "#C8C8C0",
    footerBrand: "#2A2A20", footerSub: "#A0A098", footerDate: "#B0B0A8",
  };

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctxOrNull = canvas.getContext("2d");
  if (!ctxOrNull) return null;
  const ctx: CanvasRenderingContext2D = ctxOrNull;

  // Background
  const bgGrd = ctx.createLinearGradient(0, 0, W, H);
  bgGrd.addColorStop(0, t.bg0);
  bgGrd.addColorStop(1, t.bg1);
  ctx.fillStyle = bgGrd;
  ctx.fillRect(0, 0, W, H);

  // Wrap text into lines fitting maxWidth given current ctx.font
  function wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const word of words) {
      const test = cur ? `${cur} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && cur) {
        lines.push(cur);
        cur = word;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  // === SWATCH STRIP ===
  const hasNames = palette.colors.some((c) => c.name);
  const STRIP_H = hasNames ? 296 : 272;
  const swatchW = W / n;
  palette.colors.forEach((color, i) => {
    ctx.fillStyle = color.hex;
    ctx.fillRect(Math.floor(i * swatchW), 0, Math.ceil(swatchW) + 1, STRIP_H);
  });

  // Swatch names (when present) — shown above the hex pill
  if (hasNames) {
    ctx.font = `italic 12px ${SANS}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    palette.colors.forEach((color, i) => {
      if (!color.name) return;
      const fg = contrastForHex(color.hex);
      const cx = Math.floor(i * swatchW) + swatchW / 2;
      let name = color.name;
      const maxW = swatchW - 20;
      while (ctx.measureText(name).width > maxW && name.length > 2) {
        name = name.slice(0, -1);
      }
      if (name.length < color.name.length) name += "…";
      ctx.fillStyle = fg === "#FFFFFF" ? "rgba(255,255,255,0.62)" : "rgba(0,0,0,0.40)";
      ctx.fillText(name, cx, STRIP_H - 44);
    });
  }

  // Hex labels at bottom of each swatch — pill overlay
  ctx.font = `bold 13px ${MONO}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  palette.colors.forEach((color, i) => {
    const fg = contrastForHex(color.hex);
    const cx = Math.floor(i * swatchW) + swatchW / 2;
    const cy = STRIP_H - 20;
    const hexStr = color.hex.slice(1).toUpperCase();
    const tw = ctx.measureText(hexStr).width;
    roundRectPath(ctx, cx - tw / 2 - 6, cy - 10, tw + 12, 20, 4);
    ctx.fillStyle = fg === "#FFFFFF" ? "rgba(0,0,0,0.42)" : "rgba(255,255,255,0.50)";
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.fillText(hexStr, cx, cy);
  });

  let y = STRIP_H + 50;

  // === PALETTE NAME ===
  ctx.font = `bold 56px ${SANS}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = t.name;
  const nameLines = wrapText(palette.name, CONTENT_W);
  nameLines.slice(0, 2).forEach((line, i) => {
    ctx.fillText(line, PAD, y + i * 68);
  });
  y += Math.min(nameLines.length, 2) * 68 + 14;

  // === MOOD + COUNT ===
  const mood = getPaletteMood(palette.colors);
  const moodDot = MOOD_DOTS[mood] ?? "#8A8A80";
  ctx.beginPath();
  ctx.arc(PAD + 8, y + 11, 8, 0, Math.PI * 2);
  ctx.fillStyle = moodDot;
  ctx.fill();
  ctx.font = `400 19px ${SANS}`;
  ctx.textBaseline = "top";
  ctx.fillStyle = t.moodText;
  ctx.fillText(`${mood}  ·  ${n} color${n !== 1 ? "s" : ""}`, PAD + 24, y + 2);
  y += 44;

  // === DIVIDER ===
  y += 14;
  ctx.fillStyle = t.divider;
  ctx.fillRect(PAD, y, CONTENT_W, 1);
  y += 26;

  // === VIBE SECTION ===
  ctx.font = `600 11px ${SANS}`;
  ctx.fillStyle = t.sectionLabel;
  ctx.letterSpacing = "0.1em";
  ctx.fillText("VIBE", PAD, y);
  ctx.letterSpacing = "0em";
  y += 22;

  // Opening curly quote — decorative
  ctx.font = `italic 72px ${SANS}`;
  ctx.fillStyle = t.decorQuote;
  ctx.textBaseline = "top";
  ctx.fillText("“", PAD - 4, y - 10);

  ctx.font = `italic 22px ${SANS}`;
  ctx.fillStyle = t.vibeText;
  const vibeLines = wrapText(story.vibe, CONTENT_W);
  vibeLines.slice(0, 4).forEach((line) => {
    ctx.fillText(line, PAD, y);
    y += 33;
  });
  y += 10;

  // === PRODUCT IDEAS SECTION ===
  ctx.font = `600 11px ${SANS}`;
  ctx.fillStyle = t.sectionLabel;
  ctx.letterSpacing = "0.1em";
  ctx.fillText("PERFECT FOR", PAD, y);
  ctx.letterSpacing = "0em";
  y += 22;

  ctx.font = `15px ${SANS}`;
  ctx.textBaseline = "middle";
  let px = PAD;
  const PILL_H = 34;
  const PILL_PAD = 14;
  const PILL_GAP = 8;
  const PILL_R = PILL_H / 2;
  story.products.slice(0, 9).forEach((product) => {
    const tw = ctx.measureText(product).width;
    const pw = tw + PILL_PAD * 2;
    if (px + pw > W - PAD + 4) {
      px = PAD;
      y += PILL_H + 8;
    }
    roundRectPath(ctx, px, y, pw, PILL_H, PILL_R);
    ctx.fillStyle = t.pillBg;
    ctx.fill();
    ctx.fillStyle = t.pillText;
    ctx.textAlign = "center";
    ctx.fillText(product, px + pw / 2, y + PILL_H / 2);
    ctx.textAlign = "left";
    px += pw + PILL_GAP;
  });
  y += PILL_H + 24;

  // === ART PROMPT SECTION ===
  ctx.textBaseline = "top";
  ctx.font = `600 11px ${SANS}`;
  ctx.fillStyle = t.sectionLabel;
  ctx.letterSpacing = "0.1em";
  ctx.fillText("ART PROMPT", PAD, y);
  ctx.letterSpacing = "0em";
  y += 22;

  ctx.font = `14px ${MONO}`;
  const promptLines = wrapText(story.prompt, CONTENT_W - 36);
  const promptBoxH = Math.min(promptLines.length, 6) * 22 + 36;
  roundRectPath(ctx, PAD, y, CONTENT_W, promptBoxH, 10);
  ctx.fillStyle = t.promptBox;
  ctx.fill();
  promptLines.slice(0, 6).forEach((line, i) => {
    ctx.fillStyle = t.promptText;
    ctx.fillText(line, PAD + 18, y + 18 + i * 22);
  });
  y += promptBoxH;

  // === FOOTER (anchored to bottom) ===
  const footerY = H - PAD - 30;
  ctx.fillStyle = t.footerLine;
  ctx.fillRect(PAD, footerY - 18, CONTENT_W, 1);

  const lw = 24, lh = 24, lr = 6;
  const logoGrd = ctx.createLinearGradient(PAD, footerY, PAD + lw, footerY + lh);
  logoGrd.addColorStop(0, "#fda4af");
  logoGrd.addColorStop(0.5, "#c4b5fd");
  logoGrd.addColorStop(1, "#93c5fd");
  ctx.fillStyle = logoGrd;
  roundRectPath(ctx, PAD, footerY, lw, lh, lr);
  ctx.fill();

  ctx.font = `bold 15px ${SANS}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = t.footerBrand;
  ctx.fillText("Palette", PAD + lw + 9, footerY + lh / 2);

  ctx.font = `500 13px ${SANS}`;
  ctx.fillStyle = t.footerSub;
  ctx.fillText("color intelligence for creators", PAD + lw + 78, footerY + lh / 2);

  const dateStr = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date());
  ctx.font = `13px ${SANS}`;
  ctx.textAlign = "right";
  ctx.fillStyle = t.footerDate;
  ctx.fillText(dateStr, W - PAD, footerY + lh / 2);

  return canvas;
}

export function exportAsStoryMoodBoard(palette: Palette, story: ColorStory): void {
  const canvas = buildStoryMoodBoardCanvas(palette, story, { dark: true });
  if (!canvas) return;
  const link = document.createElement("a");
  link.download = `${palette.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-story-dark.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export function exportAsLightStoryMoodBoard(palette: Palette, story: ColorStory): void {
  const canvas = buildStoryMoodBoardCanvas(palette, story, { dark: false });
  if (!canvas) return;
  const link = document.createElement("a");
  link.download = `${palette.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-story-light.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// W3C Design Token Community Group format — compatible with the Figma Tokens plugin (Token Studio).
// Structure: { "<palette-slug>": { "$description"?: "...", "<swatch-key>": { "$type": "color", "$value": "#hex", "$description"?: "..." } } }
function buildFigmaTokensJson(palette: Palette): string {
  const paletteSlug =
    palette.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "palette";

  const seenSlugs = new Map<string, number>();
  const group: Record<string, unknown> = {};
  if (palette.notes) group["$description"] = palette.notes;

  palette.colors.forEach((c, i) => {
    let base: string;
    if (c.name) {
      const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      base = slug || `color-${i + 1}`;
    } else {
      base = `color-${i + 1}`;
    }
    const count = seenSlugs.get(base) ?? 0;
    seenSlugs.set(base, count + 1);
    const key = count === 0 ? base : `${base}-${count + 1}`;

    const descParts = [c.name, c.note].filter(Boolean);
    const entry: Record<string, string> = { $type: "color", $value: c.hex };
    if (descParts.length > 0) entry["$description"] = descParts.join(" — ");
    group[key] = entry;
  });

  return JSON.stringify({ [paletteSlug]: group }, null, 2);
}

export function exportAsFigmaTokensJson(palette: Palette): void {
  const paletteSlug =
    palette.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "palette";
  const json = buildFigmaTokensJson(palette);
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `${paletteSlug}-tokens.json`;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function copyAsFigmaTokensJson(palette: Palette): void {
  navigator.clipboard.writeText(buildFigmaTokensJson(palette));
}

// Procreate .swatches — ZIP archive containing Swatches.json with HSB values.
// Padded to exactly 30 slots (Procreate's fixed palette size) with null.
export async function exportAsProcreateSwatches(palette: Palette): Promise<void> {
  const { default: JSZip } = await import("jszip");

  const MAX_SWATCHES = 30;
  const swatches: (object | null)[] = palette.colors.slice(0, MAX_SWATCHES).map((color) => {
    const rgb = hexToRgb(color.hex);
    if (!rgb) return null;
    const hsb = rgbToHsb(rgb.r, rgb.g, rgb.b);
    return { hue: hsb.h, saturation: hsb.s, brightness: hsb.b, alpha: 1.0, colorSpace: 0 };
  });
  while (swatches.length < MAX_SWATCHES) swatches.push(null);

  const json = JSON.stringify({ name: palette.name, swatches });
  const zip = new JSZip();
  zip.file("Swatches.json", json);

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `${palette.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.swatches`;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const CVD_LABELS: Record<ColorBlindType, { full: string; short: string; desc: string }> = {
  deuteranopia: { full: "Deuteranopia", short: "Deutan", desc: "Green-blind · ~5% of men" },
  protanopia:   { full: "Protanopia",   short: "Protan", desc: "Red-blind · ~1% of men"  },
  tritanopia:   { full: "Tritanopia",   short: "Tritan", desc: "Blue-yellow blind · rare" },
};

export function exportAsCvdStrip(palette: Palette, cvdType: ColorBlindType): void {
  if (typeof document === "undefined") return;

  const SANS = "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";
  const MONO = "'Courier New', Courier, monospace";

  const n = palette.colors.length;
  const W = 800;
  const HEADER_H = 56;
  const SWATCH_H = 90;
  const INFO_H = 40;
  const DIVIDER_H = 32;
  const FOOTER_H = 40;
  const TOTAL_H = HEADER_H + SWATCH_H + INFO_H + DIVIDER_H + SWATCH_H + INFO_H + FOOTER_H;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = TOTAL_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const cvdMeta = CVD_LABELS[cvdType];
  const simColors = palette.colors.map((c) => simulateColorBlind(c.hex, cvdType));
  const SW = W / n;

  ctx.fillStyle = "#fafaf8";
  ctx.fillRect(0, 0, W, TOTAL_H);

  // Header logo mark
  const grd = ctx.createLinearGradient(20, 14, 44, 38);
  grd.addColorStop(0, "#a78bfa");
  grd.addColorStop(0.5, "#818cf8");
  grd.addColorStop(1, "#60a5fa");
  ctx.fillStyle = grd;
  roundRectPath(ctx, 20, 14, 24, 24, 5);
  ctx.fill();

  ctx.fillStyle = "#1c1c19";
  ctx.font = `bold 17px ${SANS}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const displayName = palette.name.length > 55 ? palette.name.slice(0, 55) + "…" : palette.name;
  ctx.fillText(displayName, 52, HEADER_H / 2);

  ctx.fillStyle = "#9a9a90";
  ctx.font = `12px ${SANS}`;
  ctx.textAlign = "right";
  ctx.fillText(`${cvdMeta.full} · ${cvdMeta.desc}`, W - 20, HEADER_H / 2);

  ctx.fillStyle = "#e2e2da";
  ctx.fillRect(0, HEADER_H - 1, W, 1);

  function drawSwatchRow(startY: number, hexValues: string[]): void {
    let cx = 0;
    hexValues.forEach((hex, i) => {
      const w = i === n - 1 ? W - Math.round(cx) : Math.round(SW);
      ctx!.fillStyle = hex;
      ctx!.fillRect(Math.round(cx), startY, w, SWATCH_H);
      cx += SW;
    });
  }

  function drawLabelRow(startY: number, hexValues: string[], rowH: number): void {
    let cx = 0;
    hexValues.forEach((hex, i) => {
      const w = i === n - 1 ? W - Math.round(cx) : Math.round(SW);
      const centerX = Math.round(cx) + w / 2;
      ctx!.fillStyle = "#1c1c19";
      ctx!.font = `10px ${MONO}`;
      ctx!.textAlign = "center";
      ctx!.textBaseline = "middle";
      ctx!.fillText(hex.toUpperCase(), centerX, startY + rowH / 2);
      cx += SW;
    });
  }

  // Original row
  const origSwatchY = HEADER_H;
  const origLabelY = HEADER_H + SWATCH_H;
  drawSwatchRow(origSwatchY, palette.colors.map((c) => c.hex));
  ctx.fillStyle = "#fafaf8";
  ctx.fillRect(0, origLabelY, W, INFO_H);
  ctx.fillStyle = "#e2e2da";
  ctx.fillRect(0, origLabelY, W, 1);
  drawLabelRow(origLabelY, palette.colors.map((c) => c.hex), INFO_H);

  // Divider
  const dividerY = origLabelY + INFO_H;
  ctx.fillStyle = "#f0f0ec";
  ctx.fillRect(0, dividerY, W, DIVIDER_H);
  ctx.fillStyle = "#e2e2da";
  ctx.fillRect(0, dividerY, W, 1);
  ctx.fillRect(0, dividerY + DIVIDER_H - 1, W, 1);

  ctx.fillStyle = "#9a9a90";
  ctx.font = `bold 9px ${SANS}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("ORIGINAL", 20, dividerY + DIVIDER_H / 2);

  ctx.fillStyle = "#a78bfa";
  ctx.font = `bold 9px ${SANS}`;
  ctx.textAlign = "right";
  ctx.fillText(`${cvdMeta.full.toUpperCase()} SIMULATION`, W - 20, dividerY + DIVIDER_H / 2);

  ctx.fillStyle = "#c4c4bc";
  ctx.font = `13px ${SANS}`;
  ctx.textAlign = "center";
  ctx.fillText("↓", W / 2, dividerY + DIVIDER_H / 2);

  // Simulated row
  const simSwatchY = dividerY + DIVIDER_H;
  const simLabelY = simSwatchY + SWATCH_H;
  drawSwatchRow(simSwatchY, simColors);

  // Mark unchanged swatches with a subtle overlay
  {
    let cx = 0;
    palette.colors.forEach((c, i) => {
      const w = i === n - 1 ? W - Math.round(cx) : Math.round(SW);
      const same = simColors[i].toLowerCase() === c.hex.toLowerCase();
      if (same) {
        const centerX = Math.round(cx) + w / 2;
        ctx.fillStyle = "rgba(16,185,129,0.18)";
        ctx.fillRect(Math.round(cx), simSwatchY, w, SWATCH_H);
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = `bold 9px ${SANS}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("UNCHANGED", centerX, simSwatchY + SWATCH_H / 2);
      }
      cx += SW;
    });
  }

  ctx.fillStyle = "#fafaf8";
  ctx.fillRect(0, simLabelY, W, INFO_H);
  ctx.fillStyle = "#e2e2da";
  ctx.fillRect(0, simLabelY, W, 1);
  drawLabelRow(simLabelY, simColors, INFO_H);

  // Footer
  const footerY = simLabelY + INFO_H;
  ctx.fillStyle = "#fafaf8";
  ctx.fillRect(0, footerY, W, FOOTER_H);
  ctx.fillStyle = "#e2e2da";
  ctx.fillRect(0, footerY, W, 1);

  ctx.fillStyle = "#9a9a90";
  ctx.font = `10px ${SANS}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("palette.unavoided.com · Machado (2009) CVD simulation, severity 1.0", 20, footerY + FOOTER_H / 2);

  const dateStr = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date());
  ctx.textAlign = "right";
  ctx.fillText(dateStr, W - 20, footerY + FOOTER_H / 2);

  const slug = palette.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const downloadLink = document.createElement("a");
  downloadLink.download = `${slug}-${cvdMeta.short.toLowerCase()}-cvd.png`;
  downloadLink.href = canvas.toDataURL("image/png");
  downloadLink.click();
}
