"use client";

import type { Palette } from "@/types";
import { hexToRgb, rgbToCmyk } from "./utils";

export function getPaletteShareUrl(palette: Palette): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const colors = palette.colors.map((c) => c.hex.replace("#", "")).join(",");
  return `${base}/p?n=${encodeURIComponent(palette.name)}&c=${colors}`;
}

export function exportAsPngStrip(palette: Palette): void {
  const SWATCH_W = 120;
  const SWATCH_H = 80;
  const LABEL_H = 28;
  const canvas = document.createElement("canvas");
  canvas.width = SWATCH_W * palette.colors.length;
  canvas.height = SWATCH_H + LABEL_H;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  palette.colors.forEach((color, i) => {
    ctx.fillStyle = color.hex;
    ctx.fillRect(i * SWATCH_W, 0, SWATCH_W, SWATCH_H);

    // Label background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(i * SWATCH_W, SWATCH_H, SWATCH_W, LABEL_H);

    // Hex text
    ctx.fillStyle = "#1a1a18";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(color.hex.toUpperCase(), i * SWATCH_W + SWATCH_W / 2, SWATCH_H + 18);
  });

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
