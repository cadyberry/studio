"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Copy, Code2, Braces, FileJson, FileText, Printer, Link2, AlertTriangle, LayoutGrid, Moon, Sun, Smartphone, Tablet, Layers, Sparkles, Loader2, Check, RefreshCw, ShoppingBag, Tag, Shapes, FileCode2, List } from "lucide-react";
import { exportAsPngStrip, exportAsCsv, exportAsMoodBoard, exportAsDarkMoodBoard, exportAsPortraitMoodBoard, exportAsDarkPortraitMoodBoard, copyCssVariables, copyHexList, copyFlatHexList, copyTailwindConfig, getJsonExport, copyCmykList, getPaletteShareUrl, exportAsProcreateSwatches, exportAsAse, exportAsFigmaTokensJson, copyAsFigmaTokensJson, exportAsStoryMoodBoard, exportAsLightStoryMoodBoard, getGradientCss, exportAsGradientPng, copyGradientSvg, exportAsCvdStrip, type GradientDirection, type GradientOrder } from "@/lib/exportPalette";
import Button from "@/components/ui/Button";
import type { Palette, ColorStory } from "@/types";
import { getContrastColor, simulateCmykPrint, simulateColorBlind, type ColorBlindType } from "@/lib/utils";
import { usePaletteStore } from "@/store/paletteStore";

interface ExportModalProps {
  palette: Palette | null;
  onClose: () => void;
}

export default function ExportModal({ palette, onClose }: ExportModalProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [hoveredSwatch, setHoveredSwatch] = useState<number | null>(null);
  const [storyLoading, setStoryLoading] = useState(false);
  const [story, setStory] = useState<ColorStory | null>(null);
  const [storyError, setStoryError] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [tagged, setTagged] = useState(false);
  const [taggedNewCount, setTaggedNewCount] = useState(0);
  const [gradDir, setGradDir] = useState<GradientDirection>("to right");
  const [gradOrder, setGradOrder] = useState<GradientOrder>("palette");
  const [gradCopied, setGradCopied] = useState(false);
  const [svgCopied, setSvgCopied] = useState(false);
  const [activeMockup, setActiveMockup] = useState<"canvas" | "mug" | "tote">("canvas");
  const [mockupDownloading, setMockupDownloading] = useState(false);
  const mockupContainerRef = useRef<HTMLDivElement>(null);

  const downloadMockupPng = useCallback(async () => {
    if (!palette || !mockupContainerRef.current) return;
    const svgEl = mockupContainerRef.current.querySelector("svg");
    if (!svgEl) return;
    setMockupDownloading(true);
    try {
      const viewBox = svgEl.getAttribute("viewBox")?.split(" ").map(Number) ?? [0, 0, 180, 140];
      const [, , vbW, vbH] = viewBox;
      const SCALE = 8;
      const W = vbW * SCALE;
      const H = vbH * SCALE;
      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svgEl);
      const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
      });
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#f5f5f0";
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, 0, 0, W, H);
      const link = document.createElement("a");
      const slug = palette.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "palette";
      link.download = `${slug}-${activeMockup}-mockup.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setMockupDownloading(false);
    }
  }, [palette, activeMockup]);

  const updatePalette = usePaletteStore((s) => s.updatePalette);
  const cachedStory = usePaletteStore((s) => s.colorStoryCache[palette?.id ?? ""] ?? null);
  const setColorStoryCache = usePaletteStore((s) => s.setColorStoryCache);
  const liveTags = usePaletteStore(
    (s) => s.palettes.find((p) => p.id === (palette?.id ?? ""))?.tags ?? palette?.tags ?? []
  );

  // Sync story from cache when palette changes (ExportModal is a persistent instance, not remounted)
  useEffect(() => {
    setStory(cachedStory);
    setStoryError(false);
  // cachedStory intentionally excluded — we only want to sync on palette change, not every cache update
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette?.id]);

  const printSims = useMemo(
    () => (palette?.colors ?? []).map((c) => simulateCmykPrint(c.hex)),
    [palette?.colors]
  );
  const highCount = printSims.filter((s) => s.risk === "high").length;
  const cautionCount = printSims.filter((s) => s.risk === "caution").length;
  const hasRisk = highCount + cautionCount > 0;

  if (!palette) return null;

  const generateStory = async () => {
    setStoryLoading(true);
    setStoryError(false);
    try {
      const res = await fetch("/api/color-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colors: palette.colors.map((c) => c.hex),
          name: palette.name,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as ColorStory;
      setStory(data);
      setColorStoryCache(palette.id, data);
    } catch {
      setStoryError(true);
    } finally {
      setStoryLoading(false);
    }
  };

  const copyPrompt = () => {
    if (!story) return;
    navigator.clipboard.writeText(story.prompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 1500);
  };

  const tagProducts = () => {
    if (!story || !palette) return;
    const existingLower = new Set(liveTags.map((t) => t.toLowerCase()));
    const newTags = story.products.filter((p) => !existingLower.has(p.toLowerCase()));
    updatePalette(palette.id, { tags: [...liveTags, ...newTags] });
    setTaggedNewCount(newTags.length);
    setTagged(true);
    setTimeout(() => setTagged(false), 2000);
  };

  const flash = (key: string) => {
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const riskDesc = hasRisk
    ? `PNG card with CMYK data · ${[highCount > 0 && `${highCount} high-risk`, cautionCount > 0 && `${cautionCount} caution`].filter(Boolean).join(", ")} flagged`
    : "PNG reference card — hex, RGB & CMYK per swatch";

  const downloadActions: { key: string; label: string; desc: string; icon: React.ElementType; onClick: () => void; disabled?: boolean }[] = [
    {
      key: "png",
      label: "Download Palette Card",
      desc: riskDesc,
      icon: Download,
      onClick: () => { exportAsPngStrip(palette); },
    },
    {
      key: "moodboard",
      label: "Download Mood Board",
      desc: "1080×1080 shareable image — swatches, hex codes & mood",
      icon: LayoutGrid,
      onClick: () => { exportAsMoodBoard(palette); },
    },
    {
      key: "moodboard-dark",
      label: "Download Dark Mood Board",
      desc: "Same layout on a near-black background — best for dark palettes",
      icon: Moon,
      onClick: () => { exportAsDarkMoodBoard(palette); },
    },
    {
      key: "moodboard-portrait",
      label: "Download Portrait Mood Board",
      desc: "1080×1350 Instagram 4:5 — more vertical breathing room",
      icon: Smartphone,
      onClick: () => { exportAsPortraitMoodBoard(palette); },
    },
    {
      key: "moodboard-portrait-dark",
      label: "Download Dark Portrait Mood Board",
      desc: "Portrait format on near-black — for dark palettes shared as Stories",
      icon: Smartphone,
      onClick: () => { exportAsDarkPortraitMoodBoard(palette); },
    },
    {
      key: "story-moodboard-light",
      label: "Story Mood Board — Light",
      desc: story ? "1080×1350 · swatches + story + AI art prompt" : "Generate a Color Story first",
      icon: Sun,
      disabled: !story,
      onClick: () => { if (story) exportAsLightStoryMoodBoard(palette, story); },
    },
    {
      key: "story-moodboard-dark",
      label: "Story Mood Board — Dark",
      desc: story ? "Dark background · 1080×1350 for social sharing" : "Generate a Color Story first",
      icon: Moon,
      disabled: !story,
      onClick: () => { if (story) exportAsStoryMoodBoard(palette, story); },
    },
    {
      key: "procreate",
      label: "Download Procreate Swatches",
      desc: "iPad-ready .swatches — import directly into Procreate",
      icon: Tablet,
      onClick: () => { void exportAsProcreateSwatches(palette); },
    },
    {
      key: "ase",
      label: "Download Adobe Swatches (.ase)",
      desc: "Imports into Illustrator, Photoshop & InDesign — swatch names included",
      icon: Layers,
      onClick: () => { exportAsAse(palette); },
    },
    {
      key: "figma-tokens",
      label: "Download Figma Tokens JSON",
      desc: "W3C design token format — import via the Figma Tokens plugin",
      icon: Shapes,
      onClick: () => { exportAsFigmaTokensJson(palette); },
    },
    {
      key: "csv",
      label: "Download CSV",
      desc: "Hex · RGB · HSL · CMYK · oklch — print-ready spreadsheet",
      icon: FileText,
      onClick: () => { exportAsCsv(palette); },
    },
  ];

  const copyActions: { key: string; label: string; desc: string; icon: React.ElementType; onClick: () => void; disabled?: boolean }[] = [
    {
      key: "hex",
      label: "Copy Hex Codes",
      desc: "Comma-separated list of all hex values",
      icon: Copy,
      onClick: () => { copyHexList(palette); flash("hex"); },
    },
    {
      key: "hex-flat",
      label: "Copy Hex List (one per line)",
      desc: "Newline-separated — paste into Notion, spreadsheets, or AI prompts",
      icon: List,
      onClick: () => { copyFlatHexList(palette); flash("hex-flat"); },
    },
    {
      key: "css",
      label: "Copy CSS Variables",
      desc: ":root { --color-1: #hex; … }",
      icon: Code2,
      onClick: () => { copyCssVariables(palette); flash("css"); },
    },
    {
      key: "tailwind",
      label: "Copy Tailwind Config",
      desc: "theme.extend.colors object — paste into tailwind.config.js",
      icon: Braces,
      onClick: () => { copyTailwindConfig(palette); flash("tailwind"); },
    },
    {
      key: "json",
      label: "Copy JSON",
      desc: "Structured palette data with hex + RGB",
      icon: FileJson,
      onClick: () => { navigator.clipboard.writeText(getJsonExport(palette)); flash("json"); },
    },
    {
      key: "cmyk",
      label: "Copy as CMYK",
      desc: "C/M/Y/K channel values — for print specs",
      icon: Printer,
      onClick: () => { copyCmykList(palette); flash("cmyk"); },
    },
    {
      key: "figma-tokens-copy",
      label: "Copy Figma Tokens JSON",
      desc: "W3C token format — paste directly into Figma Tokens plugin without a file",
      icon: Shapes,
      onClick: () => { copyAsFigmaTokensJson(palette); flash("figma-tokens-copy"); },
    },
    {
      key: "share",
      label: "Copy Share Link",
      desc: "Anyone with the link can view & fork this palette",
      icon: Link2,
      onClick: () => { navigator.clipboard.writeText(getPaletteShareUrl(palette)); flash("share"); },
    },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="bg-[var(--surface)] rounded-[var(--radius-lg)] w-full max-w-sm shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Palette preview with per-swatch risk indicators */}
          <div className="flex h-20 relative">
            {palette.colors.map((color, i) => {
              const sim = printSims[i];
              const isHigh = sim.risk === "high";
              const isCaution = sim.risk === "caution";
              return (
                <div
                  key={i}
                  className="flex-1 relative group"
                  style={{ backgroundColor: color.hex }}
                  onMouseEnter={() => setHoveredSwatch(i)}
                  onMouseLeave={() => setHoveredSwatch(null)}
                >
                  {(isHigh || isCaution) && (
                    <div
                      className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                      style={{ backgroundColor: isHigh ? "#e11d48" : "#d97706" }}
                    />
                  )}
                  <AnimatePresence>
                    {hoveredSwatch === i && (isHigh || isCaution) && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap text-[9px] font-bold px-1.5 py-0.5 rounded text-white"
                        style={{ backgroundColor: isHigh ? "rgba(225,29,72,0.92)" : "rgba(217,119,6,0.92)" }}
                      >
                        ΔE {sim.deltaE}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <div className="p-5 overflow-y-auto flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold flex items-center gap-2 flex-wrap leading-tight">
                  {palette.name}
                  <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)] tabular-nums tracking-tight select-none">
                    {palette.colors.length} color{palette.colors.length !== 1 ? "s" : ""}
                  </span>
                </h2>
                <p className="text-xs text-[var(--muted)]">choose an export format</p>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X size={14} />
              </Button>
            </div>

            {/* CMYK print risk warning banner */}
            <AnimatePresence>
              {hasRisk && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-[var(--radius-sm)] bg-amber-50 border border-amber-200 text-amber-900">
                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5 text-amber-600" />
                    <div className="text-xs leading-relaxed">
                      <span className="font-semibold">Print shift detected — </span>
                      {highCount > 0 && (
                        <span>
                          <span className="text-red-700 font-semibold">{highCount} high-risk</span>
                          {cautionCount > 0 && <span className="text-[var(--muted)]"> · </span>}
                        </span>
                      )}
                      {cautionCount > 0 && (
                        <span className="text-amber-700 font-semibold">{cautionCount} caution</span>
                      )}
                      <span className="text-[var(--muted)]"> color{highCount + cautionCount !== 1 ? "s" : ""} may look different when printed. Hover the swatches above to see ΔE shift values. The palette card PNG includes full CMYK details.</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {(["Download", "Copy"] as const).map((section) => {
              const list = section === "Download" ? downloadActions : copyActions;
              return (
                <div key={section}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted)] select-none">
                      {section}
                    </span>
                    <span className="text-[9px] font-bold tabular-nums text-[var(--muted)] bg-[var(--surface-2)] rounded-full px-1.5 py-0.5 select-none leading-none">
                      {list.length}
                    </span>
                    <div className="flex-1 h-px bg-[var(--border)]" />
                  </div>
                  <div className="space-y-1 mb-4">
                    {list.map((action) => (
                      <button
                        key={action.key}
                        onClick={action.disabled ? undefined : action.onClick}
                        disabled={action.disabled}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] transition-colors text-left group ${
                          action.disabled
                            ? "opacity-40 cursor-not-allowed"
                            : "hover:bg-[var(--surface-2)]"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-md bg-[var(--surface-2)] flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--border)] transition-colors">
                          <action.icon size={15} className="text-[var(--muted)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">
                            {copied === action.key ? "Copied!" : action.label}
                          </div>
                          <div className="text-xs text-[var(--muted)] truncate">{action.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* CMYK Shift Preview */}
            {(() => {
              return (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted)] select-none">Print</span>
                    <div className="flex-1 h-px bg-[var(--border)]" />
                  </div>
                  <div className="space-y-0.5">
                    {palette.colors.map((color, i) => {
                      const sim = printSims[i];
                      const tac = sim.cmyk.c + sim.cmyk.m + sim.cmyk.y + sim.cmyk.k;
                      const isHigh = sim.risk === "high";
                      const isCaution = sim.risk === "caution";
                      const badgeCls = isHigh
                        ? "text-red-600 bg-red-50 dark:bg-red-950/30"
                        : isCaution
                        ? "text-amber-600 bg-amber-50 dark:bg-amber-950/30"
                        : "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30";
                      return (
                        <div key={i} className="flex items-center gap-2 py-1">
                          {/* original → print-shifted swatch pair */}
                          <div className="flex items-center gap-1 shrink-0">
                            <div
                              className="w-5 h-5 rounded-[3px] border border-black/10 dark:border-white/10"
                              style={{ backgroundColor: color.hex }}
                              title={`Original: ${color.hex}`}
                            />
                            <svg width="10" height="7" viewBox="0 0 10 7" className="text-[var(--muted)] opacity-50" fill="none">
                              <path d="M0 3.5h7M4.5 1l2.5 2.5L4.5 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <div
                              className="w-5 h-5 rounded-[3px] border border-black/10 dark:border-white/10"
                              style={{ backgroundColor: sim.printHex }}
                              title={`Print shift: ${sim.printHex}`}
                            />
                          </div>
                          {/* CMYK values */}
                          <div className="flex-1 font-mono text-[9px] text-[var(--muted)] leading-none tracking-tight">
                            <span title="Cyan">C{sim.cmyk.c}</span>
                            <span className="mx-0.5 opacity-30">·</span>
                            <span title="Magenta">M{sim.cmyk.m}</span>
                            <span className="mx-0.5 opacity-30">·</span>
                            <span title="Yellow">Y{sim.cmyk.y}</span>
                            <span className="mx-0.5 opacity-30">·</span>
                            <span title="Key (Black)">K{sim.cmyk.k}</span>
                          </div>
                          {/* TAC */}
                          <div
                            className={`shrink-0 font-mono text-[9px] w-14 text-right ${tac > 280 ? "text-amber-600 font-semibold" : "text-[var(--muted)]"}`}
                            title="Total Area Coverage — offset print limit is 300%"
                          >
                            TAC {tac}%
                          </div>
                          {/* ΔE risk badge */}
                          <div className={`shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded-full leading-none ${badgeCls}`}>
                            ΔE {sim.deltaE}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-[var(--muted)] mt-2 leading-relaxed">
                    TAC capped at 300% (standard offset print) · arrows show simulated color shift on press
                  </p>
                </div>
              );
            })()}

            {/* CSS Gradient Generator */}
            {(() => {
              if (!palette) return null;
              const gradientCss = getGradientCss(palette, gradDir, gradOrder);

              const DIRS: { value: GradientDirection; label: string; title: string }[] = [
                { value: "to right", label: "→", title: "Left to right" },
                { value: "135deg",   label: "↘", title: "Diagonal (135°)" },
                { value: "to bottom", label: "↓", title: "Top to bottom" },
                { value: "radial",   label: "○", title: "Radial from center" },
              ];

              const ORDERS: { value: GradientOrder; label: string; title: string }[] = [
                { value: "palette",    label: "Original", title: "Palette swatch order" },
                { value: "light-dark", label: "☀→●",     title: "Light to dark" },
                { value: "dark-light", label: "●→☀",     title: "Dark to light" },
                { value: "hue",        label: "Hue",       title: "Sorted by hue (rainbow order)" },
              ];

              const copyGradient = () => {
                navigator.clipboard.writeText(`background: ${gradientCss};`);
                setGradCopied(true);
                setTimeout(() => setGradCopied(false), 1500);
              };

              const copySvg = () => {
                copyGradientSvg(palette, gradDir, gradOrder);
                setSvgCopied(true);
                setTimeout(() => setSvgCopied(false), 1500);
              };

              return (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted)] select-none">Gradient</span>
                    <div className="flex-1 h-px bg-[var(--border)]" />
                  </div>

                  {/* Live preview */}
                  <div
                    className="w-full h-12 rounded-[var(--radius-sm)] mb-2.5 border border-[var(--border)]"
                    style={{ background: gradientCss }}
                  />

                  {/* Controls */}
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-[var(--muted)] uppercase tracking-wider mr-0.5">Dir</span>
                      {DIRS.map(({ value, label, title }) => (
                        <button
                          key={value}
                          onClick={() => setGradDir(value)}
                          title={title}
                          className={`w-7 h-6 rounded text-sm flex items-center justify-center transition-colors ${
                            gradDir === value
                              ? "bg-[var(--accent)] text-white"
                              : "bg-[var(--surface-2)] text-[var(--muted)] hover:bg-[var(--border)]"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-[var(--muted)] uppercase tracking-wider mr-0.5">Order</span>
                      {ORDERS.map(({ value, label, title }) => (
                        <button
                          key={value}
                          onClick={() => setGradOrder(value)}
                          title={title}
                          className={`h-6 px-1.5 rounded text-[10px] font-medium flex items-center justify-center transition-colors ${
                            gradOrder === value
                              ? "bg-[var(--accent)] text-white"
                              : "bg-[var(--surface-2)] text-[var(--muted)] hover:bg-[var(--border)]"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* CSS string */}
                  <div className="font-mono text-[9px] text-[var(--muted)] bg-[var(--surface-2)] px-2.5 py-1.5 rounded mb-1.5 overflow-x-auto whitespace-nowrap select-all">
                    background: {gradientCss};
                  </div>

                  {/* Copy + Download buttons */}
                  <button
                    onClick={copyGradient}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-2)] transition-colors text-left group"
                  >
                    <div
                      className="w-8 h-8 rounded-md shrink-0 border border-[var(--border)]"
                      style={{ background: gradientCss }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{gradCopied ? "Copied!" : "Copy CSS Gradient"}</div>
                      <div className="text-xs text-[var(--muted)] truncate">background: linear-gradient(…) — paste anywhere</div>
                    </div>
                    <div className="text-[var(--muted)] shrink-0">
                      {gradCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </div>
                  </button>

                  <button
                    onClick={() => exportAsGradientPng(palette, gradDir, gradOrder)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-2)] transition-colors text-left group"
                  >
                    <div
                      className="w-8 h-8 rounded-md shrink-0 border border-[var(--border)] flex items-center justify-center bg-[var(--surface-2)] group-hover:bg-[var(--border)] transition-colors"
                    >
                      <Download size={14} className="text-[var(--muted)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">Download Gradient PNG</div>
                      <div className="text-xs text-[var(--muted)] truncate">1200×400 banner — swatches + hex codes overlaid</div>
                    </div>
                    <div className="text-[var(--muted)] shrink-0">
                      <Download size={14} />
                    </div>
                  </button>

                  <button
                    onClick={copySvg}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-2)] transition-colors text-left group"
                  >
                    <div className="w-8 h-8 rounded-md shrink-0 border border-[var(--border)] flex items-center justify-center bg-[var(--surface-2)] group-hover:bg-[var(--border)] transition-colors">
                      <FileCode2 size={14} className="text-[var(--muted)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{svgCopied ? "Copied!" : "Copy SVG Gradient"}</div>
                      <div className="text-xs text-[var(--muted)] truncate">Inline SVG — paste into Figma, Illustrator, or web</div>
                    </div>
                    <div className="text-[var(--muted)] shrink-0">
                      {svgCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </div>
                  </button>
                </div>
              );
            })()}

            {/* Product Preview */}
            {(() => {
              const colors = palette.colors;
              if (colors.length === 0) return null;

              // Evenly distribute palette colors across an index range
              const band = (arr: typeof colors, count: number) =>
                Array.from({ length: count }, (_, i) => arr[Math.round((i / (count - 1 || 1)) * (arr.length - 1))]);

              // Canvas mockup: framed art print with vertical color bands
              const CanvasMockup = () => {
                const artColors = colors;
                const n = artColors.length;
                const AW = 140; const AH = 100;
                const artX = 20; const artY = 20;
                return (
                  <svg viewBox="0 0 180 140" width="180" height="140" aria-label="Canvas print mockup">
                    {/* Wood frame */}
                    <rect x="0" y="0" width="180" height="140" rx="5" fill="#8B6914" />
                    <rect x="1.5" y="1.5" width="177" height="137" rx="4" fill="#7A5C12" opacity="0.6" />
                    {/* Mat */}
                    <rect x="8" y="8" width="164" height="124" rx="3" fill="#FAF9F6" />
                    {/* Art area — vertical color bands */}
                    <clipPath id={`canvasClip-${palette.id}`}>
                      <rect x={artX} y={artY} width={AW} height={AH} rx="1" />
                    </clipPath>
                    <g clipPath={`url(#canvasClip-${palette.id})`}>
                      {artColors.map((c, i) => (
                        <rect key={i} x={artX + (i * AW / n)} y={artY} width={AW / n} height={AH} fill={c.hex} />
                      ))}
                    </g>
                    {/* Art area border */}
                    <rect x={artX} y={artY} width={AW} height={AH} rx="1" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
                    {/* Frame corner accents */}
                    <rect x="0" y="0" width="180" height="140" rx="5" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" />
                  </svg>
                );
              };

              // Mug mockup: cylindrical mug with palette color body + design stripes
              const MugMockup = () => {
                const bodyColor = colors[0].hex;
                const stripeColors = colors.length > 1 ? band(colors.slice(1), Math.min(colors.length - 1, 4)) : [];
                const stripeH = stripeColors.length > 0 ? 36 / stripeColors.length : 0;
                return (
                  <svg viewBox="0 0 180 140" width="180" height="140" aria-label="Mug mockup">
                    {/* Shadow */}
                    <ellipse cx="84" cy="130" rx="52" ry="5" fill="rgba(0,0,0,0.08)" />
                    {/* Mug body */}
                    <rect x="24" y="20" width="100" height="98" rx="6" fill={bodyColor} />
                    {/* Rim (top ellipse) */}
                    <ellipse cx="74" cy="20" rx="50" ry="9" fill={bodyColor} />
                    <ellipse cx="74" cy="20" rx="50" ry="9" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
                    {/* Inner rim dark */}
                    <ellipse cx="74" cy="20" rx="40" ry="6" fill="rgba(0,0,0,0.12)" />
                    {/* Design stripe band */}
                    {stripeColors.length > 0 && (
                      <>
                        <clipPath id={`mugClip-${palette.id}`}>
                          <rect x="24" y="54" width="100" height="36" />
                        </clipPath>
                        <g clipPath={`url(#mugClip-${palette.id})`}>
                          {stripeColors.map((c, i) => (
                            <rect key={i} x="24" y={54 + i * stripeH} width="100" height={stripeH} fill={c.hex} opacity="0.9" />
                          ))}
                        </g>
                        <rect x="24" y="54" width="100" height="36" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="0.5" />
                      </>
                    )}
                    {/* Body highlight */}
                    <rect x="28" y="24" width="18" height="88" rx="3" fill="rgba(255,255,255,0.15)" />
                    {/* Handle */}
                    <path d="M124 42 Q158 42 158 69 Q158 96 124 96" fill="none" stroke={bodyColor} strokeWidth="14" strokeLinecap="round" />
                    <path d="M124 42 Q158 42 158 69 Q158 96 124 96" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1" strokeLinecap="round" />
                    {/* Bottom rim */}
                    <ellipse cx="74" cy="118" rx="50" ry="8" fill="rgba(0,0,0,0.08)" />
                  </svg>
                );
              };

              // Tote bag mockup: fabric bag with palette-color vertical stripes as print
              const ToteMockup = () => {
                const bagColor = colors[0].hex;
                const printColors = colors.length > 1 ? band(colors, Math.min(colors.length, 5)) : [colors[0]];
                const stripeW = 100 / printColors.length;
                return (
                  <svg viewBox="0 0 180 160" width="180" height="160" aria-label="Tote bag mockup">
                    {/* Shadow */}
                    <ellipse cx="90" cy="152" rx="55" ry="5" fill="rgba(0,0,0,0.08)" />
                    {/* Bag body */}
                    <path d="M30 48 Q28 148 88 148 Q148 148 150 48 Z" fill={bagColor} />
                    {/* Palette print design — centered vertical stripes */}
                    <clipPath id={`toteClip-${palette.id}`}>
                      <path d="M56 80 Q55 138 88 138 Q121 138 124 80 Z" />
                    </clipPath>
                    <g clipPath={`url(#toteClip-${palette.id})`}>
                      {printColors.map((c, i) => (
                        <rect key={i} x={56 + i * stripeW} y="70" width={stripeW} height="80" fill={c.hex} opacity="0.9" />
                      ))}
                    </g>
                    {/* Bag top edge */}
                    <path d="M30 48 Q88 56 150 48" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" />
                    {/* Bag outline */}
                    <path d="M30 48 Q28 148 88 148 Q148 148 150 48" fill="none" stroke="rgba(0,0,0,0.14)" strokeWidth="1.5" />
                    {/* Left handle */}
                    <path d="M52 48 Q52 14 72 14 Q92 14 92 48" fill="none" stroke={bagColor} strokeWidth="10" strokeLinecap="round" />
                    <path d="M52 48 Q52 14 72 14 Q92 14 92 48" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1.2" strokeLinecap="round" />
                    {/* Right handle */}
                    <path d="M88 48 Q88 14 108 14 Q128 14 128 48" fill="none" stroke={bagColor} strokeWidth="10" strokeLinecap="round" />
                    <path d="M88 48 Q88 14 108 14 Q128 14 128 48" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                );
              };

              return (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted)] select-none">Products</span>
                    <div className="flex-1 h-px bg-[var(--border)]" />
                  </div>

                  {/* Product type tabs */}
                  <div className="flex items-center gap-1 mb-3">
                    {([
                      { key: "canvas", label: "Canvas Print" },
                      { key: "mug",    label: "Mug" },
                      { key: "tote",   label: "Tote Bag" },
                    ] as const).map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setActiveMockup(key)}
                        className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                          activeMockup === key
                            ? "bg-[var(--accent)] text-white"
                            : "bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Mockup preview */}
                  <div ref={mockupContainerRef} className="flex items-center justify-center py-2 bg-[var(--surface-2)] rounded-[var(--radius-sm)] border border-[var(--border)]">
                    {activeMockup === "canvas" && <CanvasMockup />}
                    {activeMockup === "mug" && <MugMockup />}
                    {activeMockup === "tote" && <ToteMockup />}
                  </div>

                  {/* Download mockup PNG */}
                  <button
                    onClick={() => { void downloadMockupPng(); }}
                    disabled={mockupDownloading}
                    className="mt-2 w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-2)] transition-colors text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-8 h-8 rounded-md bg-[var(--surface-2)] flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--border)] transition-colors">
                      {mockupDownloading
                        ? <Loader2 size={15} className="text-[var(--muted)] animate-spin" />
                        : <Download size={15} className="text-[var(--muted)]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">Download Mockup PNG</div>
                      <div className="text-xs text-[var(--muted)] truncate">High-res PNG of the {activeMockup} preview — for quick reference</div>
                    </div>
                  </button>

                  <p className="text-[9px] text-[var(--muted)] mt-1 leading-relaxed text-center">
                    Simplified preview — first color sets the product base, remaining colors form the design
                  </p>
                </div>
              );
            })()}

            {/* Color Vision Simulation */}
            {(() => {
              const CVD_ROWS = [
                { key: "normal",       label: "Normal vision",  desc: null                        },
                { key: "deuteranopia", label: "Deuteranopia",   desc: "Green-blind · ~5% of men"  },
                { key: "protanopia",   label: "Protanopia",     desc: "Red-blind · ~1% of men"    },
                { key: "tritanopia",   label: "Tritanopia",     desc: "Blue-yellow blind · rare"  },
              ] as const;
              return (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted)] select-none">Vision</span>
                    <div className="flex-1 h-px bg-[var(--border)]" />
                  </div>
                  <div className="space-y-1.5">
                    {CVD_ROWS.map(({ key, label, desc }) => {
                      const hexes = key === "normal"
                        ? palette.colors.map((c) => c.hex)
                        : palette.colors.map((c) => simulateColorBlind(c.hex, key as ColorBlindType));
                      return (
                        <div key={key} className="flex items-center gap-2.5">
                          <div className="w-[108px] shrink-0">
                            <div className="text-[10px] font-medium leading-tight text-[var(--foreground)]">{label}</div>
                            {desc && <div className="text-[9px] text-[var(--muted)] leading-tight">{desc}</div>}
                          </div>
                          <div className="flex-1 h-6 rounded-[4px] overflow-hidden flex border border-black/[0.06] dark:border-white/[0.06]">
                            {hexes.map((hex, i) => (
                              <div key={i} style={{ flex: 1, backgroundColor: hex }} />
                            ))}
                          </div>
                          {key !== "normal" ? (
                            <button
                              onClick={() => exportAsCvdStrip(palette, key as ColorBlindType)}
                              title={`Download ${label} side-by-side strip — normal vs. simulated`}
                              className="shrink-0 flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--surface-2)] hover:bg-[var(--border)] transition-colors text-[var(--muted)] hover:text-[var(--foreground)]"
                            >
                              <Download size={13} />
                            </button>
                          ) : (
                            <div className="w-7 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-[var(--muted)] mt-2 leading-relaxed">
                    Simulates how viewers with color vision deficiency see your palette · Download strips for accessibility review
                  </p>
                </div>
              );
            })()}

            {/* AI Color Story */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted)] select-none">AI</span>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>

              <AnimatePresence mode="wait">
                {!story && !storyLoading && (
                  <motion.button
                    key="generate-btn"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={generateStory}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-2)] transition-colors text-left group"
                  >
                    <div className="w-8 h-8 rounded-md bg-gradient-to-br from-violet-100 to-rose-100 dark:from-violet-950/40 dark:to-rose-950/40 flex items-center justify-center flex-shrink-0 group-hover:from-violet-200 group-hover:to-rose-200 dark:group-hover:from-violet-900/50 dark:group-hover:to-rose-900/50 transition-all">
                      <Sparkles size={15} className="text-violet-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">
                        {storyError ? "Try again" : "Generate Color Story"}
                      </div>
                      <div className="text-xs text-[var(--muted)] truncate">
                        {storyError
                          ? "Something went wrong — click to retry"
                          : "Vibe · product ideas · AI art prompt"}
                      </div>
                    </div>
                    {storyError && <RefreshCw size={13} className="text-[var(--muted)] shrink-0" />}
                  </motion.button>
                )}

                {storyLoading && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2.5 px-3 py-3"
                  >
                    <Loader2 size={14} className="animate-spin text-violet-400 shrink-0" />
                    <span className="text-sm text-[var(--muted)]">Reading the palette&hellip;</span>
                  </motion.div>
                )}

                {story && !storyLoading && (
                  <motion.div
                    key="story-result"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-[var(--radius-sm)] border border-[var(--border)] overflow-hidden bg-[var(--surface-2)]"
                  >
                    {/* Vibe */}
                    <div className="px-3 pt-3 pb-2">
                      <p className="text-xs leading-relaxed text-[var(--foreground)]">{story.vibe}</p>
                    </div>

                    {/* Product suggestions */}
                    <div className="px-3 pb-2.5">
                      {(() => {
                        const existingLower = new Set(liveTags.map((t) => t.toLowerCase()));
                        const allTagged = story.products.every((p) => existingLower.has(p.toLowerCase()));
                        return (
                          <>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {story.products.map((product) => {
                                const isTagged = existingLower.has(product.toLowerCase());
                                return (
                                  <span
                                    key={product}
                                    className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors ${
                                      isTagged
                                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400"
                                        : "bg-[var(--surface)] border-[var(--border)] text-[var(--muted)]"
                                    }`}
                                  >
                                    {isTagged ? (
                                      <Check size={9} className="shrink-0" />
                                    ) : (
                                      <ShoppingBag size={9} className="shrink-0" />
                                    )}
                                    {product}
                                  </span>
                                );
                              })}
                            </div>
                            <AnimatePresence mode="wait">
                              {tagged ? (
                                <motion.p
                                  key="tagged-confirm"
                                  initial={{ opacity: 0, y: 2 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.15 }}
                                  className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium"
                                >
                                  <Check size={9} className="shrink-0" />
                                  {taggedNewCount > 0
                                    ? `${taggedNewCount} new tag${taggedNewCount !== 1 ? "s" : ""} added to palette`
                                    : "Already tagged"}
                                </motion.p>
                              ) : (
                                <motion.button
                                  key="tag-btn"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  onClick={tagProducts}
                                  disabled={allTagged}
                                  className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md border transition-all ${
                                    allTagged
                                      ? "opacity-40 cursor-not-allowed border-[var(--border)] text-[var(--muted)]"
                                      : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] hover:border-[var(--foreground)]/20"
                                  }`}
                                  title={allTagged ? "All suggestions are already tagged on this palette" : "Save product suggestions as palette tags"}
                                >
                                  <Tag size={9} className="shrink-0" />
                                  Tag these ideas
                                </motion.button>
                              )}
                            </AnimatePresence>
                          </>
                        );
                      })()}
                    </div>

                    {/* AI prompt — copyable */}
                    <div className="border-t border-[var(--border)] px-3 py-2.5 flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-[var(--muted)] mb-0.5 uppercase tracking-wider font-semibold">AI Prompt</p>
                        <p className="text-xs font-mono text-[var(--foreground)] leading-snug select-all">{story.prompt}</p>
                      </div>
                      <button
                        onClick={copyPrompt}
                        className={`shrink-0 flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md border transition-all mt-px ${
                          promptCopied
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400"
                            : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)]"
                        }`}
                        title="Copy prompt to clipboard"
                      >
                        {promptCopied ? <Check size={11} /> : <Copy size={11} />}
                        {promptCopied ? "Copied" : "Copy"}
                      </button>
                    </div>

                    {/* Regenerate */}
                    <div className="border-t border-[var(--border)] px-3 py-2 flex items-center justify-end">
                      <button
                        onClick={() => { setStory(null); generateStory(); }}
                        className="flex items-center gap-1 text-[10px] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                      >
                        <RefreshCw size={9} />
                        Regenerate
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
