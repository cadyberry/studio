"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Type, Link2, Loader2, Plus, AlertCircle } from "lucide-react";
import { isValidHex } from "@/lib/utils";
import Button from "@/components/ui/Button";
import type { ColorSwatch } from "@/types";

type Tab = "text" | "url";

interface ImportModalProps {
  onClose: () => void;
  onImport: (name: string, colors: ColorSwatch[]) => void;
}

function swatchContrast(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 128 ? "#111" : "#fff";
}

function parseHexInput(raw: string): string[] {
  const seen = new Set<string>();
  const valid: string[] = [];
  for (const token of raw.split(/[\s,;\n]+/)) {
    let t = token.trim();
    if (!t) continue;
    if (!t.startsWith("#")) t = "#" + t;
    if (/^#[0-9a-fA-F]{3}$/.test(t)) {
      t = "#" + t[1] + t[1] + t[2] + t[2] + t[3] + t[3];
    }
    const norm = t.toLowerCase();
    if (isValidHex(norm) && !seen.has(norm)) {
      seen.add(norm);
      valid.push(norm);
    }
  }
  return valid.slice(0, 12);
}

export default function ImportModal({ onClose, onImport }: ImportModalProps) {
  const [tab, setTab] = useState<Tab>("text");
  const [textInput, setTextInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlColors, setUrlColors] = useState<string[] | null>(null);
  const [urlCssCount, setUrlCssCount] = useState<number | null>(null);
  const [urlImportCount, setUrlImportCount] = useState<number | null>(null);
  const [paletteName, setPaletteName] = useState("");

  const textColors = parseHexInput(textInput);
  const previewColors = tab === "text" ? textColors : (urlColors ?? []);
  const canImport = previewColors.length >= 2;

  async function handleExtract() {
    const raw = urlInput.trim();
    if (!raw) return;
    setUrlError(null);
    setUrlColors(null);
    setUrlCssCount(null);
    setUrlImportCount(null);
    setUrlLoading(true);
    try {
      const res = await fetch("/api/extract-url-colors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: raw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to extract colors");
      setUrlColors(data.colors as string[]);
      setUrlCssCount(typeof data.cssCount === "number" ? data.cssCount : null);
      setUrlImportCount(typeof data.importCount === "number" ? data.importCount : null);
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUrlLoading(false);
    }
  }

  function handleImport() {
    if (!canImport) return;
    const defaultName =
      tab === "url" && urlInput
        ? `Colors from ${new URL(urlInput.trim()).hostname}`
        : "Imported Palette";
    const name = paletteName.trim() || defaultName;
    onImport(name, previewColors.map((hex) => ({ hex })));
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.15 }}
        className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl w-[460px] max-w-[95vw] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--foreground)]">Import Palette</h2>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors rounded p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)]">
          {(
            [
              ["text", "Paste Hex Codes", Type],
              ["url", "From URL", Link2],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === id
                  ? "border-rose-400 text-rose-600 dark:text-rose-400"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {/* Text tab */}
          {tab === "text" && (
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                Hex codes — separated by commas, spaces, or newlines
              </label>
              <textarea
                autoFocus
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] text-sm px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-rose-400/40 font-mono placeholder:text-[var(--muted)]/50 leading-relaxed"
                rows={3}
                placeholder={"#E8A87C, #C38D9E, #41B3A3\nor paste from Coolors, Adobe Color, etc."}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
              />
              <p className="text-[10px] text-[var(--muted)] mt-1">
                Accepts 3- and 6-digit hex codes with or without #. Up to 12 colors.
              </p>
            </div>
          )}

          {/* URL tab */}
          {tab === "url" && (
            <div className="space-y-1">
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                Website URL
              </label>
              <div className="flex gap-2">
                <input
                  autoFocus
                  type="url"
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400/40 placeholder:text-[var(--muted)]/50"
                  placeholder="https://example.com"
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    setUrlColors(null);
                    setUrlError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && urlInput.trim()) handleExtract();
                  }}
                />
                <Button
                  onClick={handleExtract}
                  disabled={!urlInput.trim() || urlLoading}
                  className="shrink-0"
                >
                  {urlLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Extract"}
                </Button>
              </div>
              {urlError && (
                <p className="flex items-start gap-1.5 text-xs text-red-500 mt-1.5 leading-snug">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  {urlError}
                </p>
              )}
              <p className="text-[10px] text-[var(--muted)] mt-1">
                {urlColors && urlCssCount != null && urlCssCount > 0
                  ? (() => {
                      const cssLabel = `${urlCssCount} linked stylesheet${urlCssCount !== 1 ? "s" : ""}`;
                      const importLabel = urlImportCount && urlImportCount > 0
                        ? ` + ${urlImportCount} @import${urlImportCount !== 1 ? "s" : ""}`
                        : "";
                      return `Scanned HTML + ${cssLabel}${importLabel} — hex, rgb(), and hsl() values extracted.`;
                    })()
                  : "Extracts hex, rgb(), and hsl() colors from the page HTML, linked stylesheets, and their @imports. Works best on design portfolio and brand sites."}
              </p>
            </div>
          )}

          {/* Color preview strip */}
          <AnimatePresence>
            {previewColors.length > 0 && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="space-y-2"
              >
                <p className="text-xs text-[var(--muted)]">
                  {previewColors.length} color{previewColors.length !== 1 ? "s" : ""} detected
                  {tab === "url" && urlCssCount != null && urlCssCount > 0 && (
                    <span className="ml-1.5 text-[10px] bg-[var(--surface-2)] border border-[var(--border)] rounded-full px-2 py-0.5 align-middle">
                      HTML + {urlCssCount} CSS
                      {urlImportCount != null && urlImportCount > 0 && (
                        <> + {urlImportCount} @import</>
                      )}
                    </span>
                  )}
                </p>
                <div className="flex rounded-xl overflow-hidden h-16 border border-[var(--border)] shadow-sm">
                  {previewColors.map((hex) => (
                    <div
                      key={hex}
                      className="flex-1 relative group cursor-default"
                      style={{ background: hex }}
                      title={hex}
                    >
                      <span
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[9px] font-mono transition-opacity select-all"
                        style={{ color: swatchContrast(hex) }}
                      >
                        {hex}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Palette name */}
          <AnimatePresence>
            {canImport && (
              <motion.div
                key="name"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                  Palette name{" "}
                  <span className="font-normal opacity-70">(optional)</span>
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400/40 placeholder:text-[var(--muted)]/50"
                  placeholder="Imported Palette"
                  value={paletteName}
                  onChange={(e) => setPaletteName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleImport();
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[var(--border)] bg-[var(--surface-2)]">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!canImport}>
            <Plus className="w-3.5 h-3.5" />
            Import Palette
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
