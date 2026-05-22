"use client";

import type { Palette } from "@/types";
import { hexToRgb, rgbToCmyk } from "./utils";

export function getPaletteShareUrl(palette: Palette): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const colors = palette.colors.map((c) => c.hex.replace("#", "")).join(",");
  return `${base}/p?n=${encodeURIComponent(palette.name)}&c=${colors}`;
}

export function exportAsPngStrip(palette: Palette): void {
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
  if (!ctx) return;

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
  palette.colors.forEach((color, i) => {
    const w = i === n - 1 ? CARD_W - Math.round(cx) : Math.round(SW);
    ctx.fillStyle = color.hex;
    ctx.fillRect(Math.round(cx), HEADER_H, w, SWATCH_H);
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

    ctx.fillStyle = "#1c1c19";
    ctx.font = `bold 12px ${MONO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(color.hex.toUpperCase(), centerX, labelY + 11);

    ctx.fillStyle = "#7c7c74";
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
  ctx.fillStyle = "#aaaaa0";
  ctx.font = `10px ${SANS}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Made with Palette · color intelligence for creators", CARD_W / 2, fy + FOOTER_H / 2);

  const link = document.createElement("a");
  link.download = `${palette.name.replace(/\s+/g, "-").toLowerCase()}-palette.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
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
