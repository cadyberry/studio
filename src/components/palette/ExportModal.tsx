"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Copy, Code2, FileJson, FileText, Printer, Link2, AlertTriangle, LayoutGrid, Moon, Smartphone, Tablet, Sparkles, Loader2, Check, RefreshCw, ShoppingBag, Tag } from "lucide-react";
import { exportAsPngStrip, exportAsCsv, exportAsMoodBoard, exportAsDarkMoodBoard, exportAsPortraitMoodBoard, exportAsDarkPortraitMoodBoard, copyCssVariables, copyHexList, getJsonExport, copyCmykList, getPaletteShareUrl, exportAsProcreateSwatches } from "@/lib/exportPalette";
import Button from "@/components/ui/Button";
import type { Palette } from "@/types";
import { getContrastColor, simulateCmykPrint } from "@/lib/utils";
import { usePaletteStore } from "@/store/paletteStore";

interface ColorStory {
  vibe: string;
  products: string[];
  prompt: string;
}

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

  const updatePalette = usePaletteStore((s) => s.updatePalette);
  const liveTags = usePaletteStore(
    (s) => s.palettes.find((p) => p.id === (palette?.id ?? ""))?.tags ?? palette?.tags ?? []
  );

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

  const downloadActions = [
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
      key: "procreate",
      label: "Download Procreate Swatches",
      desc: "iPad-ready .swatches — import directly into Procreate",
      icon: Tablet,
      onClick: () => { void exportAsProcreateSwatches(palette); },
    },
    {
      key: "csv",
      label: "Download CSV",
      desc: "Hex · RGB · HSL · CMYK · oklch — print-ready spreadsheet",
      icon: FileText,
      onClick: () => { exportAsCsv(palette); },
    },
  ];

  const copyActions = [
    {
      key: "hex",
      label: "Copy Hex Codes",
      desc: "Comma-separated list of all hex values",
      icon: Copy,
      onClick: () => { copyHexList(palette); flash("hex"); },
    },
    {
      key: "css",
      label: "Copy CSS Variables",
      desc: ":root { --color-1: #hex; … }",
      icon: Code2,
      onClick: () => { copyCssVariables(palette); flash("css"); },
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
                <h2 className="text-base font-semibold">{palette.name}</h2>
                <p className="text-xs text-[var(--muted)]">{palette.colors.length} colors — choose an export format</p>
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
                    <div className="flex-1 h-px bg-[var(--border)]" />
                  </div>
                  <div className="space-y-1 mb-4">
                    {list.map((action) => (
                      <button
                        key={action.key}
                        onClick={action.onClick}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-2)] transition-colors text-left group"
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
                    <div className="border-t border-[var(--border)] px-3 py-1.5 flex justify-end">
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
