"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Type, Link2, Loader2, Plus, AlertCircle, Clock, Trash2 } from "lucide-react";
import { isValidHex } from "@/lib/utils";
import Button from "@/components/ui/Button";
import type { ColorSwatch } from "@/types";

const URL_HISTORY_KEY = "palette-url-history";
const MAX_URL_HISTORY = 8;

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
  const [urlHistory, setUrlHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(URL_HISTORY_KEY);
      if (saved) setUrlHistory(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    localStorage.setItem(URL_HISTORY_KEY, JSON.stringify(urlHistory));
  }, [urlHistory]);

  function addToHistory(url: string) {
    setUrlHistory((prev) => {
      const deduped = [url, ...prev.filter((u) => u !== url)].slice(0, MAX_URL_HISTORY);
      return deduped;
    });
  }

  function removeFromHistory(url: string) {
    setUrlHistory((prev) => prev.filter((u) => u !== url));
  }

  // Close history dropdown on outside click
  useEffect(() => {
    if (!showHistory) return;
    function handler(e: MouseEvent) {
      if (historyRef.current && !historyRef.current.contains(e.target as Node) &&
          urlInputRef.current && !urlInputRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showHistory]);

  const textColors = parseHexInput(textInput);
  const previewColors = tab === "text" ? textColors : (urlColors ?? []);
  const canImport = previewColors.length >= 2;

  async function handleExtract(targetUrl?: string) {
    const raw = (targetUrl ?? urlInput).trim();
    if (!raw) return;
    if (targetUrl) {
      setUrlInput(targetUrl);
      setShowHistory(false);
    }
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
      addToHistory(raw);
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
              <div className="relative">
                <div className="flex gap-2">
                  <input
                    ref={urlInputRef}
                    autoFocus
                    type="url"
                    className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400/40 placeholder:text-[var(--muted)]/50"
                    placeholder="https://example.com"
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value);
                      setUrlColors(null);
                      setUrlError(null);
                      setShowHistory(false);
                    }}
                    onFocus={() => {
                      if (!urlInput && urlHistory.length > 0) setShowHistory(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && urlInput.trim()) handleExtract();
                      if (e.key === "Escape") setShowHistory(false);
                    }}
                  />
                  <Button
                    onClick={() => handleExtract()}
                    disabled={!urlInput.trim() || urlLoading}
                    className="shrink-0"
                  >
                    {urlLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Extract"}
                  </Button>
                </div>

                {/* URL history dropdown */}
                <AnimatePresence>
                  {showHistory && urlHistory.length > 0 && (
                    <motion.div
                      ref={historyRef}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.12 }}
                      className="absolute left-0 right-0 top-full mt-1 z-10 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border)] bg-[var(--surface-2)]">
                        <span className="text-[10px] font-medium text-[var(--muted)] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Recent
                        </span>
                        <button
                          onClick={() => { setUrlHistory([]); setShowHistory(false); }}
                          className="text-[10px] text-[var(--muted)] hover:text-red-500 transition-colors flex items-center gap-0.5"
                          title="Clear history"
                        >
                          <Trash2 className="w-3 h-3" />
                          Clear
                        </button>
                      </div>
                      {urlHistory.map((histUrl) => {
                        let display = histUrl;
                        try { display = new URL(histUrl).hostname; } catch { /* keep raw */ }
                        return (
                          <div
                            key={histUrl}
                            className="group flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-2)] cursor-pointer"
                            onMouseDown={(e) => {
                              e.preventDefault(); // prevent input blur before click fires
                              handleExtract(histUrl);
                            }}
                          >
                            <Link2 className="w-3 h-3 text-[var(--muted)] shrink-0" />
                            <span className="flex-1 text-sm truncate text-[var(--foreground)]" title={histUrl}>
                              {display}
                            </span>
                            <span className="text-[10px] text-[var(--muted)] truncate max-w-[140px] hidden group-hover:block" title={histUrl}>
                              {histUrl.length > 40 ? histUrl.slice(0, 40) + "…" : histUrl}
                            </span>
                            <button
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                removeFromHistory(histUrl);
                                if (urlHistory.length <= 1) setShowHistory(false);
                              }}
                              className="opacity-0 group-hover:opacity-100 ml-auto text-[var(--muted)] hover:text-red-500 transition-opacity shrink-0"
                              title="Remove"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Recent history hint — show when input is empty and history exists */}
              {!showHistory && urlHistory.length > 0 && !urlInput && !urlColors && (
                <button
                  onClick={() => setShowHistory(true)}
                  className="flex items-center gap-1 text-[10px] text-[var(--muted)] hover:text-[var(--accent)] transition-colors mt-1"
                >
                  <Clock className="w-3 h-3" />
                  {urlHistory.length} recent URL{urlHistory.length !== 1 ? "s" : ""}
                </button>
              )}

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
                      return `Scanned HTML + ${cssLabel}${importLabel} — hex, rgb(), hsl(), oklch(), and lch() values extracted.`;
                    })()
                  : "Extracts hex, rgb(), hsl(), oklch(), and lch() colors from the page HTML, linked stylesheets, and their @imports. Works best on design portfolio and brand sites."}
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
