"use client";

import type { Palette } from "@/types";
import { hexToRgb, rgbToCmyk, simulateCmykPrint, getPaletteMood } from "./utils";

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

export function exportAsMoodBoard(palette: Palette): void {
  const n = palette.colors.length;
  if (n === 0) return;

  const W = 1080, H = 1080;
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
  if (!ctx) return;

  // Background: warm cream gradient
  const bgGrd = ctx.createLinearGradient(0, 0, W, H);
  bgGrd.addColorStop(0, "#FAFAF7");
  bgGrd.addColorStop(1, "#F1F1EB");
  ctx.fillStyle = bgGrd;
  ctx.fillRect(0, 0, W, H);

  // ---- Header ----
  const titleY = PAD + 56;

  // Palette name
  ctx.font = `bold 52px ${SANS}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const maxTitleW = W - PAD * 2 - 200;
  let title = palette.name;
  while (ctx.measureText(title).width > maxTitleW && title.length > 5) {
    title = title.slice(0, -1);
  }
  if (title.length < palette.name.length) title += "…";
  ctx.fillStyle = "#1A1A14";
  ctx.fillText(title, PAD, titleY);

  // Color count pill (right-aligned)
  ctx.font = `500 18px ${SANS}`;
  const pillText = `${n} color${n !== 1 ? "s" : ""}`;
  const pillTextW = ctx.measureText(pillText).width;
  const pillW = pillTextW + 24;
  const pillH = 30;
  const pillX = W - PAD - pillW;
  const pillY = titleY - pillH / 2;
  roundRectPath(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fillStyle = "#E2E2DA";
  ctx.fill();
  ctx.fillStyle = "#6A6A60";
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
  ctx.fillStyle = "#6A6A60";
  ctx.fillText(mood, PAD + 22, moodY);

  if (palette.notes) {
    const moodTextW = ctx.measureText(mood).width;
    const sepX = PAD + 22 + moodTextW + 12;
    ctx.fillStyle = "#C8C8C0";
    ctx.fillText("·", sepX, moodY);
    const noteStartX = sepX + ctx.measureText("· ").width + 4;
    ctx.font = `italic 17px ${SANS}`;
    ctx.fillStyle = "#AAAAAA";
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

    // Swatch with drop shadow
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.10)";
    ctx.shadowBlur = 28;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = color.hex;
    roundRectPath(ctx, cx, cy, cellW, swatchH, RADIUS);
    ctx.fill();
    ctx.restore();

    // Hex label
    const labelCy = cy + swatchH;
    ctx.font = `bold 18px ${MONO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#1A1A14";
    ctx.fillText(color.hex.toUpperCase(), cx + cellW / 2, labelCy + 12);

    // Swatch name (if exists)
    if (color.name) {
      ctx.font = `15px ${SANS}`;
      ctx.fillStyle = "#8A8A80";
      // Truncate name to fit cell width
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
  ctx.fillStyle = "#DEDED6";
  ctx.fillRect(PAD, footerTop + 10, gridW, 1);

  // Gradient logo mark
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
  ctx.fillStyle = "#3A3A30";
  ctx.fillText("Palette", lx + lw + 10, ly + lh / 2);

  ctx.font = `500 15px ${SANS}`;
  ctx.fillStyle = "#AAAAAA";
  ctx.fillText("color intelligence for creators", lx + lw + 84, ly + lh / 2);

  // Date on right
  const dateStr = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date());
  ctx.font = `15px ${SANS}`;
  ctx.textAlign = "right";
  ctx.fillStyle = "#BBBBAA";
  ctx.fillText(dateStr, W - PAD, ly + lh / 2);

  // Download
  const link = document.createElement("a");
  link.download = `${palette.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-moodboard.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
