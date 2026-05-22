"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Copy, Code2, FileJson, Printer, Link2 } from "lucide-react";
import { exportAsPngStrip, copyCssVariables, copyHexList, getJsonExport, copyCmykList, getPaletteShareUrl } from "@/lib/exportPalette";
import Button from "@/components/ui/Button";
import type { Palette } from "@/types";
import { getContrastColor } from "@/lib/utils";

interface ExportModalProps {
  palette: Palette | null;
  onClose: () => void;
}

export default function ExportModal({ palette, onClose }: ExportModalProps) {
  const [copied, setCopied] = useState<string | null>(null);

  if (!palette) return null;

  const flash = (key: string) => {
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const actions = [
    {
      key: "png",
      label: "Download Palette Card",
      desc: "PNG reference card — hex, RGB & CMYK per swatch",
      icon: Download,
      onClick: () => { exportAsPngStrip(palette); },
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
          {/* Palette preview */}
          <div className="flex h-20">
            {palette.colors.map((color, i) => (
              <div key={i} className="flex-1" style={{ backgroundColor: color.hex }} />
            ))}
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
