"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RotateCcw, Minus, Plus, Copy, Check } from "lucide-react";
import { usePaletteStore } from "@/store/paletteStore";
import Button from "@/components/ui/Button";
import type { Palette } from "@/types";
import {
  hexToRgb,
  rgbToHsl,
  hslToHex,
  isValidHex,
  getContrastRatio,
  hexToOklch,
  oklchToHex,
  isOklchOutOfSrgbGamut,
  getColorNameSuggestions,
  hexToCmyk,
  type OklchValues,
  type CmykValues,
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
  const [swatchName, setSwatchName] = useState(palette?.colors[swatchIndex]?.name ?? "");
  const [suggestions, setSuggestions] = useState<string[]>(() => getColorNameSuggestions(originalHex));
  const [hexCopied, setHexCopied] = useState(false);
  const [oklchState, setOklchState] = useState<OklchValues>(
    () => hexToOklch(originalHex) ?? { l: 50, c: 0.1, h: 0 }
  );

  useEffect(() => {
    if (palette) {
      const initial = palette.colors[swatchIndex]?.hex ?? "#888888";
      const initialHsl = hexToHsl(initial) ?? { h: 0, s: 0, l: 50 };
      setHex(initial);
      setHexInput(initial);
      setHsl(initialHsl);
      setOklchState(hexToOklch(initial) ?? { l: 50, c: 0.1, h: 0 });
      setSwatchName(palette.colors[swatchIndex]?.name ?? "");
      setSuggestions(getColorNameSuggestions(initial));
    }
  }, [palette, swatchIndex]);

  // Debounce suggestion updates so they don't flash on every slider tick.
  useEffect(() => {
    const timer = setTimeout(() => setSuggestions(getColorNameSuggestions(hex)), 380);
    return () => clearTimeout(timer);
  }, [hex]);

  const applyHex = useCallback((newHex: string) => {
    const parsed = hexToHsl(newHex);
    if (parsed) {
      setHex(newHex);
      setHexInput(newHex);
      setHsl(parsed);
      setOklchState(hexToOklch(newHex) ?? { l: 50, c: 0.1, h: 0 });
    }
  }, []);

  const updateFromHsl = useCallback((newHsl: { h: number; s: number; l: number }) => {
    setHsl(newHsl);
    const newHex = hslToHex(newHsl.h, newHsl.s, newHsl.l);
    setHex(newHex);
    setHexInput(newHex);
    setOklchState(hexToOklch(newHex) ?? { l: 50, c: 0.1, h: 0 });
  }, []);

  const nudge = useCallback((key: "h" | "s" | "l", dir: 1 | -1, step = 5) => {
    setHsl((prev) => {
      let next: number;
      if (key === "h") {
        next = ((prev.h + dir * step) % 360 + 360) % 360;
      } else {
        next = Math.max(0, Math.min(100, prev[key] + dir * step));
      }
      const updated = { ...prev, [key]: Math.round(next) };
      const newHex = hslToHex(updated.h, updated.s, updated.l);
      setHex(newHex);
      setHexInput(newHex);
      setOklchState(hexToOklch(newHex) ?? { l: 50, c: 0.1, h: 0 });
      return updated;
    });
  }, []);

  const updateFromOklch = useCallback((newOklch: OklchValues) => {
    setOklchState(newOklch);
    const newHex = oklchToHex(newOklch.l, newOklch.c, newOklch.h);
    setHex(newHex);
    setHexInput(newHex);
    const parsed = hexToHsl(newHex);
    if (parsed) setHsl(parsed);
  }, []);

  const nudgeOklch = useCallback((key: "l" | "c" | "h", dir: 1 | -1, step?: number) => {
    const defaults: Record<"l" | "c" | "h", number> = { l: 2.5, c: 0.01, h: 5 };
    const actualStep = step ?? defaults[key];
    setOklchState((prev) => {
      let next: number;
      if (key === "h") {
        next = ((prev.h + dir * actualStep) % 360 + 360) % 360;
      } else if (key === "l") {
        next = Math.max(0, Math.min(100, prev.l + dir * actualStep));
      } else {
        next = parseFloat(Math.max(0, Math.min(0.4, prev.c + dir * actualStep)).toFixed(3));
      }
      const updated = { ...prev, [key]: next };
      const newHex = oklchToHex(updated.l, updated.c, updated.h);
      setHex(newHex);
      setHexInput(newHex);
      const parsed = hexToHsl(newHex);
      if (parsed) setHsl(parsed);
      return updated;
    });
  }, []);

  const handleSave = () => {
    if (!palette) return;
    const trimmedName = swatchName.trim();
    const newColors = palette.colors.map((c, i) =>
      i === swatchIndex ? { ...c, hex, name: trimmedName || undefined } : c
    );
    updatePalette(palette.id, { colors: newColors });
    onClose();
  };

  if (!palette) return null;

  const contrastWhite = getContrastRatio(hex, "#ffffff");
  const contrastBlack = getContrastRatio(hex, "#000000");

  // Oklch slider gradients — representative L/C for gradient endpoints when current value is near zero
  const gradC = Math.max(0.12, oklchState.c);
  const gradL = Math.min(68, Math.max(32, oklchState.l));
  const oklchLGrad = `linear-gradient(to right, ${[0, 33, 67, 100].map((l) => oklchToHex(l, gradC, oklchState.h)).join(", ")})`;
  const oklchCGrad = `linear-gradient(to right, ${oklchToHex(gradL, 0, oklchState.h)}, ${oklchToHex(gradL, 0.4, oklchState.h)})`;
  const oklchHGrad = `linear-gradient(to right, ${[0, 60, 120, 180, 240, 300, 360].map((h) => oklchToHex(gradL, gradC, h)).join(", ")})`;

  const outOfGamut = isOklchOutOfSrgbGamut(oklchState.l, oklchState.c, oklchState.h);

  const cmyk: CmykValues | null = hexToCmyk(hex);
  const inkCoverage = cmyk ? cmyk.c + cmyk.m + cmyk.y + cmyk.k : 0;
  // oklch chroma is the best single proxy for print gamut risk:
  // high C = far from gray = likely outside CMYK gamut
  const printRisk = oklchState.c > 0.25 ? "high" : oklchState.c > 0.12 ? "moderate" : "low";

  const oklchSliders = [
    {
      key: "l" as const,
      label: "L",
      value: oklchState.l,
      max: 100,
      step: 0.5,
      unit: "",
      gradient: oklchLGrad,
      display: oklchState.l.toFixed(1),
      displayW: "w-8",
      nudgeStep: 2.5,
      nudgeLarge: 10,
      title: "Perceptual lightness — 0 (black) to 100 (white). A Δ10 looks the same at any hue.",
    },
    {
      key: "c" as const,
      label: "C",
      value: oklchState.c,
      max: 0.4,
      step: 0.002,
      unit: "",
      gradient: oklchCGrad,
      display: oklchState.c.toFixed(3),
      displayW: "w-10",
      nudgeStep: 0.01,
      nudgeLarge: 0.05,
      title: "Absolute chroma — 0 (neutral gray) to ~0.4 (max saturation). Not relative to lightness like HSL S.",
    },
    {
      key: "h" as const,
      label: "H",
      value: oklchState.h,
      max: 360,
      step: 1,
      unit: "°",
      gradient: oklchHGrad,
      display: String(Math.round(oklchState.h)),
      displayW: "w-8",
      nudgeStep: 5,
      nudgeLarge: 15,
      title: "Hue angle — 0°=red, ~120°=green, ~240°=blue.",
    },
  ];

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
          className="bg-[var(--surface)] rounded-[var(--radius)] w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto"
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
                <div key={key} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold w-3 text-[var(--muted)] select-none shrink-0">
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
                      onKeyDown={(e) => {
                        if (!e.shiftKey) return;
                        if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                          e.preventDefault();
                          nudge(key, -1, 10);
                        } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                          e.preventDefault();
                          nudge(key, 1, 10);
                        }
                      }}
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
                  {/* Nudge controls ± 5 step (Shift+Arrow = 10 step) */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => nudge(key, -1)}
                      className="w-5 h-5 flex items-center justify-center rounded text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
                      title={`−5${unit} (Shift+← for −10${unit})`}
                    >
                      <Minus size={9} />
                    </button>
                    <span className="text-[10px] font-mono w-8 text-center tabular-nums text-[var(--muted)] select-none">
                      {value}{unit}
                    </span>
                    <button
                      onClick={() => nudge(key, 1)}
                      className="w-5 h-5 flex items-center justify-center rounded text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
                      title={`+5${unit} (Shift+→ for +10${unit})`}
                    >
                      <Plus size={9} />
                    </button>
                  </div>
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
              <button
                onClick={() => {
                  navigator.clipboard.writeText(hex);
                  setHexCopied(true);
                  setTimeout(() => setHexCopied(false), 1500);
                }}
                className="w-6 h-6 flex items-center justify-center rounded text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors shrink-0"
                title="Copy hex to clipboard"
              >
                {hexCopied
                  ? <Check size={11} className="text-emerald-500" />
                  : <Copy size={11} />}
              </button>
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

            {/* Oklch sliders */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-[var(--border)]" />
                <span
                  className="text-[9px] font-mono font-bold text-[var(--muted)] uppercase tracking-widest select-none cursor-default"
                  title="Oklch — a perceptually uniform color space. L/C/H sliders here move lightness and chroma in visually equal steps, unlike HSL."
                >
                  oklch
                </span>
                {outOfGamut && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded select-none bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                    title="This oklch color falls outside sRGB gamut — the displayed hex is the nearest clipped color. Reduce chroma (C) to bring it in-gamut."
                  >
                    ⚠ gamut
                  </span>
                )}
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>
              {oklchSliders.map(({ key, label, value, max, step, unit, gradient, display, displayW, nudgeStep, nudgeLarge, title }) => (
                <div key={key} className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-mono font-bold w-3 text-[var(--muted)] select-none shrink-0"
                    title={title}
                  >
                    {label}
                  </span>
                  <div className="relative flex-1 h-3.5 flex items-center">
                    <div className="absolute inset-0 rounded-full" style={{ background: gradient }} />
                    <input
                      type="range"
                      min={0}
                      max={max}
                      step={step}
                      value={value}
                      onChange={(e) => updateFromOklch({ ...oklchState, [key]: Number(e.target.value) })}
                      onKeyDown={(e) => {
                        if (!e.shiftKey) return;
                        if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                          e.preventDefault();
                          nudgeOklch(key, -1, nudgeLarge);
                        } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                          e.preventDefault();
                          nudgeOklch(key, 1, nudgeLarge);
                        }
                      }}
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
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => nudgeOklch(key, -1)}
                      className="w-5 h-5 flex items-center justify-center rounded text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
                      title={`−${nudgeStep}${unit}`}
                    >
                      <Minus size={9} />
                    </button>
                    <span className={`text-[10px] font-mono ${displayW} text-center tabular-nums text-[var(--muted)] select-none`}>
                      {display}{unit}
                    </span>
                    <button
                      onClick={() => nudgeOklch(key, 1)}
                      className="w-5 h-5 flex items-center justify-center rounded text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
                      title={`+${nudgeStep}${unit}`}
                    >
                      <Plus size={9} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* CMYK Print Reference */}
            {cmyk && (
              <div className="space-y-2.5">
                {/* Divider */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-[var(--border)]" />
                  <span
                    className="text-[9px] font-mono font-bold text-[var(--muted)] uppercase tracking-widest select-none cursor-default"
                    title="Approximate CMYK values for offset printing. Computed from sRGB without an ICC profile — use as a guide, not a press specification."
                  >
                    print
                  </span>
                  {printRisk === "high" && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded select-none bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400"
                      title={`Oklch chroma C ${oklchState.c.toFixed(3)} — highly vivid. CMYK presses often cannot fully reproduce this saturation; expect hue and/or lightness shift in print.`}
                    >
                      ⚠ vivid
                    </span>
                  )}
                  {printRisk === "moderate" && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded select-none bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                      title={`Oklch chroma C ${oklchState.c.toFixed(3)} — moderately vivid. Slight color shift is possible in print, especially on uncoated stock.`}
                    >
                      moderate
                    </span>
                  )}
                  <div className="flex-1 h-px bg-[var(--border)]" />
                </div>

                {/* C / M / Y / K values */}
                <div className="flex items-center">
                  {(
                    [
                      { label: "C", value: cmyk.c, title: "Cyan ink percentage" },
                      { label: "M", value: cmyk.m, title: "Magenta ink percentage" },
                      { label: "Y", value: cmyk.y, title: "Yellow ink percentage" },
                      { label: "K", value: cmyk.k, title: "Key (black) ink percentage" },
                    ] as const
                  ).map(({ label, value, title }, i, arr) => (
                    <div
                      key={label}
                      className={`flex-1 flex flex-col items-center gap-0.5 ${i < arr.length - 1 ? "border-r border-[var(--border)]" : ""}`}
                      title={title}
                    >
                      <span className="text-[9px] font-mono font-bold text-[var(--muted)]">{label}</span>
                      <span className="text-[11px] font-mono tabular-nums font-semibold">{value}%</span>
                    </div>
                  ))}
                </div>

                {/* Total Area Coverage bar */}
                <div className="flex items-center gap-2">
                  <span
                    className="text-[9px] font-mono font-bold text-[var(--muted)] shrink-0 select-none"
                    title="Total Area Coverage (TAC) = C+M+Y+K. Offset printing typically caps TAC at 300% to prevent ink smearing and slow drying."
                  >
                    TAC
                  </span>
                  <div className="flex-1 relative h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                      style={{
                        width: `${(inkCoverage / 300) * 100}%`,
                        backgroundColor:
                          inkCoverage > 280 ? "#f43f5e" :
                          inkCoverage > 220 ? "#f59e0b" :
                          "#10b981",
                      }}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-mono tabular-nums shrink-0 ${
                      inkCoverage > 280 ? "text-rose-600 dark:text-rose-400" :
                      inkCoverage > 220 ? "text-amber-600 dark:text-amber-400" :
                      "text-[var(--muted)]"
                    }`}
                    title={`Total area coverage: ${inkCoverage}% (C+M+Y+K). Over 300% risks wet trapping on offset press.`}
                  >
                    {inkCoverage}%
                  </span>
                </div>
              </div>
            )}

            {/* Color name */}
            <div>
              <p className="text-[10px] text-[var(--muted)] mb-1.5 uppercase tracking-widest font-semibold select-none">
                Name
              </p>
              <input
                type="text"
                value={swatchName}
                onChange={(e) => setSwatchName(e.target.value)}
                placeholder="Name this color…"
                className="w-full text-xs font-medium bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-1.5 outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--muted)] placeholder:font-normal"
                maxLength={40}
              />
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {suggestions.map((name) => (
                  <button
                    key={name}
                    onClick={() => setSwatchName(name)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                      swatchName === name
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--foreground)] font-medium"
                        : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                    }`}
                    title={`Use "${name}" as this color's name`}
                  >
                    {name}
                  </button>
                ))}
              </div>
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

            {/* Swatch contrast pairings */}
            {palette.colors.length > 1 && (() => {
              const pairs = palette.colors
                .map((c, i) => {
                  if (i === swatchIndex) return null;
                  const ratio = getContrastRatio(hex, c.hex);
                  const tier =
                    ratio >= 7 ? { label: "AAA", bg: "bg-emerald-100 text-emerald-700" } :
                    ratio >= 4.5 ? { label: "AA", bg: "bg-sky-100 text-sky-700" } :
                    ratio >= 3 ? { label: "AA lg", bg: "bg-amber-100 text-amber-700" } :
                    { label: "Fail", bg: "bg-rose-100 text-rose-600" };
                  return { hex: c.hex, name: c.name, ratio, tier, i };
                })
                .filter((x): x is NonNullable<typeof x> => x !== null)
                .sort((a, b) => b.ratio - a.ratio);

              return (
                <div>
                  <p className="text-[10px] text-[var(--muted)] mb-1.5 uppercase tracking-widest font-semibold select-none">
                    Contrast pairings
                  </p>
                  <div className="space-y-1">
                    {pairs.map(({ hex: swHex, name, ratio, tier, i }) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--surface-2)]"
                      >
                        <div
                          className="w-5 h-5 rounded-sm flex-shrink-0 border border-[var(--border)]"
                          style={{ backgroundColor: swHex }}
                        />
                        <span className="text-[10px] font-mono flex-1 truncate text-[var(--muted)]">
                          {name || swHex}
                        </span>
                        <span className="text-[10px] font-mono tabular-nums text-[var(--foreground)]">
                          {ratio.toFixed(1)}:1
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded select-none ${tier.bg}`}>
                          {tier.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

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
