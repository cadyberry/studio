"use client";

import { rgbToHex } from "./utils";
import type { ColorSwatch } from "@/types";

// Quantize colors from an image using median cut algorithm
export async function extractColorsFromImage(
  file: File,
  count: number = 6
): Promise<{ colors: ColorSwatch[]; thumbnail: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX_DIM = 200;
      const scale = Math.min(MAX_DIM / img.width, MAX_DIM / img.height, 1);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("No canvas context")); return; }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = samplePixels(imageData.data, 2000);
      const palette = medianCut(pixels, count);
      const thumbnail = canvas.toDataURL("image/jpeg", 0.6);

      URL.revokeObjectURL(url);
      resolve({
        colors: palette.map((rgb) => ({ hex: rgbToHex(rgb[0], rgb[1], rgb[2]) })),
        thumbnail,
      });
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
    img.src = url;
  });
}

function samplePixels(data: Uint8ClampedArray, maxSamples: number): [number, number, number][] {
  const pixels: [number, number, number][] = [];
  const step = Math.max(1, Math.floor(data.length / 4 / maxSamples));
  for (let i = 0; i < data.length; i += step * 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 128) continue; // skip transparent
    pixels.push([r, g, b]);
  }
  return pixels;
}

function medianCut(pixels: [number, number, number][], numColors: number): [number, number, number][] {
  if (pixels.length === 0) return [];

  let buckets: [number, number, number][][] = [pixels];

  while (buckets.length < numColors) {
    const largest = buckets.reduce((a, b) => (bucketRange(a) > bucketRange(b) ? a : b));
    buckets = buckets.filter((b) => b !== largest);
    const [a, bSplit] = splitBucket(largest);
    buckets.push(a, bSplit);
    if (buckets.some((b) => b.length === 0)) break;
  }

  return buckets
    .filter((b) => b.length > 0)
    .map(averageColor)
    .sort((a, b) => {
      // Sort by perceived brightness for pleasing display order
      const la = 0.299 * a[0] + 0.587 * a[1] + 0.114 * a[2];
      const lb = 0.299 * b[0] + 0.587 * b[1] + 0.114 * b[2];
      return la - lb;
    });
}

function bucketRange(bucket: [number, number, number][]): number {
  let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
  for (const [r, g, b] of bucket) {
    rMin = Math.min(rMin, r); rMax = Math.max(rMax, r);
    gMin = Math.min(gMin, g); gMax = Math.max(gMax, g);
    bMin = Math.min(bMin, b); bMax = Math.max(bMax, b);
  }
  return Math.max(rMax - rMin, gMax - gMin, bMax - bMin);
}

function splitBucket(bucket: [number, number, number][]): [[number, number, number][], [number, number, number][]] {
  let rRange = 0, gRange = 0, bRange = 0;
  let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
  for (const [r, g, b] of bucket) {
    rMin = Math.min(rMin, r); rMax = Math.max(rMax, r);
    gMin = Math.min(gMin, g); gMax = Math.max(gMax, g);
    bMin = Math.min(bMin, b); bMax = Math.max(bMax, b);
  }
  rRange = rMax - rMin; gRange = gMax - gMin; bRange = bMax - bMin;

  const ch = rRange >= gRange && rRange >= bRange ? 0 : gRange >= bRange ? 1 : 2;
  const sorted = [...bucket].sort((a, b) => a[ch] - b[ch]);
  const mid = Math.floor(sorted.length / 2);
  return [sorted.slice(0, mid), sorted.slice(mid)];
}

function averageColor(bucket: [number, number, number][]): [number, number, number] {
  const sum = bucket.reduce(([ar, ag, ab], [r, g, b]) => [ar + r, ag + g, ab + b], [0, 0, 0]);
  return [Math.round(sum[0] / bucket.length), Math.round(sum[1] / bucket.length), Math.round(sum[2] / bucket.length)];
}
