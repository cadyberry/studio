"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RotateCcw } from "lucide-react";
import { usePaletteStore } from "@/store/paletteStore";
import Button from "@/components/ui/Button";
import type { Palette } from "@/types";
import {
  hexToRgb,
  rgbToHsl,
  hslToHex,
  isValidHex,
  getContrastRatio,
} from "@/lib/utils";

interface SwatchEditorProps {
  palette: Palette | null;
  swatchIndex: number;
  onClose: () => void;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return rgbToHsl(rgb.r, rgb.g, rgb.b);
}

export default function SwatchEditor({ palette, swatchIndex, onClose }: SwatchEditorProps) {
  const updatePalette = usePaletteStore((s) => s.updatePalette);

  const originalHex = palette?.colors[swatchIndex]?.hex ?? "#888888";

  const [hex, setHex] = useState(originalHex);
  const [hexInput, setHexInput] = useState(originalHex);
  const [hsl, setHsl] = useState<{ h: number; s: number; l: number }>({ h: 0, s: 0, l: 50 });

  useEffect(() => {
    if (palette) {
      const initial = palette.colors[swatchIndex]?.hex ?? "#888888";
      const initialHsl = hexToHsl(initial) ?? { h: 0, s: 0, l: 50 };
      setHex(initial);
      setHexInput(initial);
      setHsl(initialHsl);
    }
  }, [palette, swatchIndex]);

  const applyHex = useCallback((newHex: string) => {
    const parsed = hexToHsl(newHex);
    if (parsed) {
      setHex(newHex);
      setHexInput(newHex);
      setHsl(parsed);
    }
  }, []);

  const updateFromHsl = useCallback((newHsl: { h: number; s: number; l: number }) => {
    setHsl(newHsl);
    const newHex = hslToHex(newHsl.h, newHsl.s, newHsl.l);
    setHex(newHex);
    setHexInput(newHex);
  }, []);

  const handleSave = () => {
    if (!palette) return;
    const newColors = palette.colors.map((c, i) =>
      i === swatchIndex ? { ...c, hex } : c
    );
    updatePalette(palette.id, { colors: newColors });
    onClose();
  };

  if (!palette) return null;

  const contrastWhite = getContrastRatio(hex, "#ffffff");
  const contrastBlack = getContrastRatio(hex, "#000000");

  const previewColors = palette.colors.map((c, i) =>
    i === swatchIndex ? { ...c, hex } : c
  );

  const hueGradient =
    "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)";
  const satGradient = `linear-gradient(to right, hsl(${hsl.h},0%,${hsl.l}%), hsl(${hsl.h},100%,${hsl.l}%))`;
  const litGradient = `linear-gradient(to right, #000, hsl(${hsl.h},${hsl.s}%,50%), #fff)`;

  const sliders = [
    { label: "H", value: hsl.h, max: 360, unit: "°", gradient: hueGradient, key: "h" as const },
    { label: "S", value: hsl.s, max: 100, unit: "%", gradient: satGradient, key: "s" as const },
    { label: "L", value: hsl.l, max: 100, unit: "%", gradient: litGradient, key: "l" as const },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
          className="bg-[var(--surface)] rounded-[var(--radius)] w-full max-w-sm shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div>
              <h2 className="text-sm font-semibold">Edit color</h2>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                {palette.name} · swatch {swatchIndex + 1} of {palette.colors.length}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X size={14} />
            </Button>
          </div>

          <div className="px-5 pb-5 space-y-4">
            {/* Color preview + native picker + original */}
            <div className="flex gap-3">
              <div
                className="flex-1 h-20 rounded-[var(--radius-sm)] transition-colors duration-100"
                style={{ backgroundColor: hex }}
              />
              <div className="flex flex-col gap-2">
                <input
                  type="color"
                  value={hex}
                  onChange={(e) => applyHex(e.target.value)}
                  className="w-9 h-9 rounded-[var(--radius-sm)] cursor-pointer border border-[var(--border)] p-0.5 bg-transparent"
                  title="Open color picker"
                />
                <div
                  className="w-9 h-9 rounded-[var(--radius-sm)] border border-[var(--border)] flex-shrink-0"
                  style={{ backgroundColor: originalHex }}
                  title={`Original: ${originalHex}`}
                />
              </div>
            </div>

            {/* HSL Sliders */}
            <div className="space-y-2.5">
              {sliders.map(({ label, value, max, unit, gradient, key }) => (
                <div key={key} className="flex items-center gap-2.5">
                  <span className="text-[10px] font-mono font-bold w-3 text-[var(--muted)] select-none">
                    {label}
                  </span>
                  <div className="relative flex-1 h-3.5 flex items-center">
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{ background: gradient }}
                    />
                    <input
                      type="range"
                      min={0}
                      max={max}
                      value={value}
                      onChange={(e) =>
                        updateFromHsl({ ...hsl, [key]: Number(e.target.value) })
                      }
                      className="relative w-full h-3.5 appearance-none bg-transparent cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-3.5
                        [&::-webkit-slider-thumb]:h-3.5
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-white
                        [&::-webkit-slider-thumb]:border-2
                        [&::-webkit-slider-thumb]:border-[var(--accent)]
                        [&::-webkit-slider-thumb]:shadow"
                    />
                  </div>
                  <span className="text-[10px] font-mono w-9 text-right tabular-nums text-[var(--muted)] select-none">
                    {value}{unit}
                  </span>
                </div>
              ))}
            </div>

            {/* Hex input + contrast */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-[var(--muted)] select-none">HEX</span>
              <input
                type="text"
                value={hexInput}
                onChange={(e) => setHexInput(e.target.value)}
                onBlur={() => {
                  const v = hexInput.startsWith("#") ? hexInput : `#${hexInput}`;
                  if (isValidHex(v)) applyHex(v);
                  else setHexInput(hex);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const v = hexInput.startsWith("#") ? hexInput : `#${hexInput}`;
                    if (isValidHex(v)) applyHex(v);
                  }
                }}
                className="flex-1 text-xs font-mono bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-1.5 outline-none focus:border-[var(--accent)] transition-colors uppercase"
                maxLength={7}
                spellCheck={false}
              />
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded select-none ${
                  contrastWhite >= 4.5
                    ? "bg-sky-100 text-sky-700"
                    : "bg-[var(--surface-2)] text-[var(--muted)]"
                }`}
                title={`Contrast on white: ${contrastWhite.toFixed(1)}:1`}
              >
                ◻{contrastWhite.toFixed(1)}
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded select-none ${
                  contrastBlack >= 4.5
                    ? "bg-neutral-800 text-white"
                    : "bg-[var(--surface-2)] text-[var(--muted)]"
                }`}
                title={`Contrast on black: ${contrastBlack.toFixed(1)}:1`}
              >
                ◼{contrastBlack.toFixed(1)}
              </span>
            </div>

            {/* Live palette preview */}
            <div>
              <p className="text-[10px] text-[var(--muted)] mb-1.5 uppercase tracking-widest font-semibold select-none">
                Preview
              </p>
              <div className="flex h-8 rounded-[var(--radius-sm)] overflow-hidden border border-[var(--border)]">
                {previewColors.map((c, i) => (
                  <div
                    key={i}
                    className={`flex-1 transition-colors duration-100 ${
                      i === swatchIndex
                        ? "ring-2 ring-inset ring-white/70"
                        : ""
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => applyHex(originalHex)}
                title="Reset to original"
                disabled={hex === originalHex}
              >
                <RotateCcw size={12} />
                <span className="ml-1">Reset</span>
              </Button>
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
