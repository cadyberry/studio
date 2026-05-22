"use client";

import type { Palette } from "@/types";
import { hexToRgb, rgbToCmyk, simulateCmykPrint } from "./utils";

export function getPaletteShareUrl(palette: Palette): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const colors = palette.colors.map((c) => c.hex.replace("#", "")).join(",");
  return `${base}/p?n=${encodeURIComponent(palette.name)}&c=${colors}`;
}

function buildPaletteCanvas(palette: Palette): HTMLCanvasElement | null {
  const n = palette.colors.length;
  const CARD_W = 800;
  const SW = CARD_W / n;
  const HEADER_H = 64;
  const SWATCH_H = 190;
  const LABEL_H = 84;
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

export async function batchExportZip(palettes: Palette[]): Promise<void> {
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
  link.download = `palette-export-${date}.zip`;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function copyCssVariables(palette: Palette): void {
  const vars = palette.colors
    .map((c, i) => `  --color-${i + 1}: ${c.hex};`)
    .join("\n");
  const css = `:root {\n${vars}\n}`;
  navigator.clipboard.writeText(css);
}

export function copyHexList(palette: Palette): void {
  const hexes = palette.colors.map((c) => c.hex).join(", ");
  navigator.clipboard.writeText(hexes);
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

export function getJsonExport(palette: Palette): string {
  return JSON.stringify(
    {
      name: palette.name,
      colors: palette.colors.map((c) => {
        const rgb = hexToRgb(c.hex);
        return { hex: c.hex, rgb };
      }),
    },
    null,
    2
  );
}
