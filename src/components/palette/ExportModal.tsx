"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Copy, Code2, FileJson, Printer, Link2, AlertTriangle, LayoutGrid, Moon, Smartphone } from "lucide-react";
import { exportAsPngStrip, exportAsMoodBoard, exportAsDarkMoodBoard, exportAsPortraitMoodBoard, exportAsDarkPortraitMoodBoard, copyCssVariables, copyHexList, getJsonExport, copyCmykList, getPaletteShareUrl } from "@/lib/exportPalette";
import Button from "@/components/ui/Button";
import type { Palette } from "@/types";
import { getContrastColor, simulateCmykPrint } from "@/lib/utils";

interface ExportModalProps {
  palette: Palette | null;
  onClose: () => void;
}

export default function ExportModal({ palette, onClose }: ExportModalProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [hoveredSwatch, setHoveredSwatch] = useState<number | null>(null);

  const printSims = useMemo(
    () => (palette?.colors ?? []).map((c) => simulateCmykPrint(c.hex)),
    [palette?.colors]
  );
  const highCount = printSims.filter((s) => s.risk === "high").length;
  const cautionCount = printSims.filter((s) => s.risk === "caution").length;
  const hasRisk = highCount + cautionCount > 0;

  if (!palette) return null;

  const flash = (key: string) => {
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const riskDesc = hasRisk
    ? `PNG card with CMYK data · ${[highCount > 0 && `${highCount} high-risk`, cautionCount > 0 && `${cautionCount} caution`].filter(Boolean).join(", ")} flagged`
    : "PNG reference card — hex, RGB & CMYK per swatch";

  const actions = [
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
      desc: "1080×1350 Instagram 4:5 — swatches with more vertical breathing room",
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
          className="bg-[var(--surface)] rounded-[var(--radius-lg)] w-full max-w-sm shadow-2xl overflow-hidden"
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

          <div className="p-5">
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

            <div className="space-y-2">
              {actions.map((action) => (
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
