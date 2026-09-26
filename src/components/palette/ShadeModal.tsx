"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Code2, Check, Braces, BookmarkPlus } from "lucide-react";
import { generateShadeScale, generateShadeScaleLab, generateShadeScaleOklch, getContrastColor, type ShadeMode } from "@/lib/utils";
import Button from "@/components/ui/Button";

interface ShadeModalProps {
  color: { hex: string; name?: string } | null;
  onClose: () => void;
  onSaveAsPalette?: (colors: { hex: string; name: string }[], paletteName: string) => void;
}

export default function ShadeModal({ color, onClose, onSaveAsPalette }: ShadeModalProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [hoveredStop, setHoveredStop] = useState<number | null>(null);
  const [forked, setForked] = useState(false);
  const [mode, setMode] = useState<ShadeMode>('oklch');
  const [showSavePreview, setShowSavePreview] = useState(false);
  const [customName, setCustomName] = useState("");

  if (!color) return null;

  const shades =
    mode === 'lab' ? generateShadeScaleLab(color.hex) :
    mode === 'oklch' ? generateShadeScaleOklch(color.hex) :
    generateShadeScale(color.hex);
  const sourceStop = shades.find((s) => s.isSource);

  const flash = (key: string) => {
    setCopied(key);
    setTimeout(() => setCopied(null), 1600);
  };

  // When the save-preview panel is open, derive varName from the user's editable customName
  // so the "Variable prefix:" hint (and CSS/Tailwind exports) reflect what they're about to save.
  const effectiveName = (showSavePreview && customName.trim()) ? customName.trim() : (color.name || "");
  const varName = effectiveName
    ? effectiveName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "") || "color"
    : "color";

  const copyCssVars = () => {
    const vars = shades.map((s) => `  --${varName}-${s.stop}: ${s.hex};`).join("\n");
    navigator.clipboard.writeText(`:root {\n${vars}\n}`);
    flash("css");
  };

  const copyHexList = () => {
    navigator.clipboard.writeText(shades.map((s) => `${s.stop}: ${s.hex}`).join("\n"));
    flash("hex");
  };

  const copyTailwind = () => {
    const entries = shades.map((s) => `    ${s.stop}: '${s.hex}',`).join("\n");
    navigator.clipboard.writeText(`${varName}: {\n${entries}\n}`);
    flash("tailwind");
  };

  const predictedName = `${color.name || color.hex.toUpperCase()} · Shades`;

  const handleSaveAsPalette = () => {
    if (!onSaveAsPalette || forked) return;
    const finalName = customName.trim() || predictedName;
    onSaveAsPalette(shades.map((s) => ({ hex: s.hex, name: String(s.stop) })), finalName);
    setShowSavePreview(false);
    setForked(true);
    setTimeout(() => setForked(false), 1800);
  };

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
          className="bg-[var(--surface)] rounded-[var(--radius-lg)] w-full max-w-lg shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2.5">
              <div
                className="w-5 h-5 rounded-full ring-2 ring-white shadow-sm flex-shrink-0"
                style={{ backgroundColor: color.hex }}
              />
              <div>
                <h2 className="text-sm font-semibold leading-tight">
                  Shade Scale
                </h2>
                <p className="text-xs text-[var(--muted)] font-mono leading-tight mt-px">
                  {color.hex.toUpperCase()}
                  {sourceStop && (
                    <span className="ml-1.5 font-sans not-italic text-[10px]">
                      → pegged to{" "}
                      <span className="font-semibold text-[var(--fg)]">{sourceStop.stop}</span>
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Interpolation mode toggle */}
              <div
                className="flex items-center rounded-full bg-[var(--surface-2)] p-0.5"
                title="Interpolation space"
              >
                {(["lab", "oklch"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    title={m === "lab" ? "CIE LAB — perceptually uniform" : "OKLCH — better hue fidelity at high chroma"}
                    className={`px-2.5 py-[3px] rounded-full text-[10px] font-semibold tracking-wide transition-colors ${
                      mode === m
                        ? "bg-[var(--surface)] text-[var(--fg)] shadow-sm"
                        : "text-[var(--muted)] hover:text-[var(--fg)]"
                    }`}
                  >
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X size={14} />
              </Button>
            </div>
          </div>

          {/* Shade strip */}
          <div className="px-5 pb-1">
            <div className="flex rounded-[var(--radius-sm)] overflow-hidden ring-1 ring-[var(--border)]">
              {shades.map((shade) => {
                const isHovered = hoveredStop === shade.stop;
                const contrast = getContrastColor(shade.hex);
                return (
                  <div
                    key={shade.stop}
                    className="flex-1 relative group/shade cursor-pointer"
                    style={{ backgroundColor: shade.hex }}
                    onMouseEnter={() => setHoveredStop(shade.stop)}
                    onMouseLeave={() => setHoveredStop(null)}
                    onClick={() => { navigator.clipboard.writeText(shade.hex); flash(`swatch-${shade.stop}`); }}
                    title={`${shade.stop}: ${shade.hex} — click to copy`}
                  >
                    {/* Swatch body */}
                    <div className="h-16" />

                    {/* Source ring */}
                    {shade.isSource && (
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{ boxShadow: `inset 0 0 0 2.5px ${contrast === "#fafaf8" ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.6)"}` }}
                      />
                    )}

                    {/* Copied flash */}
                    {copied === `swatch-${shade.stop}` && (
                      <div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
                      >
                        <Check size={12} style={{ color: contrast }} />
                      </div>
                    )}

                    {/* Hex on hover */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 2 }}
                          transition={{ duration: 0.1 }}
                          className="absolute bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none z-10"
                        >
                          <span
                            className="text-[8px] font-mono font-bold px-1 py-px rounded"
                            style={{
                              color: contrast,
                              backgroundColor: contrast === "#fafaf8" ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.4)",
                            }}
                          >
                            {shade.hex.toUpperCase()}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Stop number labels */}
            <div className="flex mt-1 mb-1">
              {shades.map((shade) => (
                <div
                  key={shade.stop}
                  className="flex-1 text-center"
                >
                  <span
                    className={`text-[9px] tabular-nums leading-none ${
                      shade.isSource
                        ? "font-bold text-[var(--fg)]"
                        : "text-[var(--muted)]"
                    }`}
                  >
                    {shade.stop}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Variable name hint */}
          <div className="px-5 pb-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
              <span>Variable prefix:</span>
              <code className="font-mono bg-[var(--surface-2)] px-1.5 py-0.5 rounded text-[var(--fg)] text-[10px]">
                --{varName}
              </code>
              {showSavePreview && customName.trim() ? (
                <span className="text-[var(--muted)]/60">derived from palette name</span>
              ) : color.name ? (
                <span className="text-[var(--muted)]/60">derived from swatch name</span>
              ) : null}
            </div>
            {/* Live previews: CSS vars + Tailwind */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-[var(--muted)] opacity-60 w-4 shrink-0">css</span>
                <div className="font-mono text-[9px] bg-[var(--surface-2)] px-2.5 py-1.5 rounded-[var(--radius-sm)] leading-tight select-all flex-1 min-w-0 overflow-hidden">
                  <span className="text-[var(--accent)] opacity-80">--{varName}-{shades[0].stop}</span>
                  <span className="text-[var(--muted)]">: </span>
                  <span className="text-[var(--fg)] opacity-70">{shades[0].hex.toUpperCase()}</span>
                  <span className="text-[var(--muted)]">;</span>
                  <span className="text-[var(--muted)] opacity-50 ml-2">… {shades.length - 1} more</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-[var(--muted)] opacity-60 w-4 shrink-0">tw</span>
                <div className="font-mono text-[9px] bg-[var(--surface-2)] px-2.5 py-1.5 rounded-[var(--radius-sm)] leading-tight select-all flex-1 min-w-0 overflow-hidden">
                  <span className="text-[var(--accent)] opacity-80">{varName}</span>
                  <span className="text-[var(--muted)]">{": { "}</span>
                  <span className="text-[var(--muted)] opacity-70">{shades[0].stop}</span>
                  <span className="text-[var(--muted)]">: </span>
                  <span className="text-[var(--muted)] opacity-50">&apos;</span>
                  <span className="text-[var(--fg)] opacity-70">{shades[0].hex.toUpperCase()}</span>
                  <span className="text-[var(--muted)] opacity-50">&apos;</span>
                  <span className="text-[var(--muted)]">,</span>
                  <span className="text-[var(--muted)] opacity-50 ml-2">… {shades.length - 1} more</span>
                  <span className="text-[var(--muted)]">{" }"}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-[var(--muted)] opacity-60 w-4 shrink-0">hex</span>
                <div className="font-mono text-[9px] bg-[var(--surface-2)] px-2.5 py-1.5 rounded-[var(--radius-sm)] leading-tight select-all flex-1 min-w-0 overflow-hidden">
                  <span className="text-[var(--muted)] opacity-70">{shades[0].stop}</span>
                  <span className="text-[var(--muted)]">: </span>
                  <span className="text-[var(--fg)] opacity-70">{shades[0].hex.toUpperCase()}</span>
                  <span className="text-[var(--muted)] opacity-50 ml-2">… {shades.length - 1} more</span>
                </div>
              </div>
            </div>
          </div>

          {/* Export actions */}
          <div className="border-t border-[var(--border)] px-5 py-4 flex flex-col gap-2">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={copyCssVars}
                className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-[var(--radius-sm)] transition-colors text-center group ${
                  copied === "css"
                    ? "bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/30"
                    : "bg-[var(--surface-2)] hover:bg-[var(--border)]"
                }`}
              >
                {copied === "css"
                  ? <Check size={14} className="text-[var(--accent)]" />
                  : <Code2 size={14} className="text-[var(--muted)] group-hover:text-[var(--fg)] transition-colors" />}
                <span className={`text-[11px] font-medium leading-tight ${copied === "css" ? "text-[var(--accent)]" : ""}`}>
                  {copied === "css" ? "Copied!" : "CSS Vars"}
                </span>
                <span className="text-[9px] text-[var(--muted)] leading-tight">:root {"{"}…{"}"}</span>
              </button>

              <button
                onClick={copyTailwind}
                className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-[var(--radius-sm)] transition-colors text-center group ${
                  copied === "tailwind"
                    ? "bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/30"
                    : "bg-[var(--surface-2)] hover:bg-[var(--border)]"
                }`}
              >
                {copied === "tailwind"
                  ? <Check size={14} className="text-[var(--accent)]" />
                  : <Braces size={14} className="text-[var(--muted)] group-hover:text-[var(--fg)] transition-colors" />}
                <span className={`text-[11px] font-medium leading-tight ${copied === "tailwind" ? "text-[var(--accent)]" : ""}`}>
                  {copied === "tailwind" ? "Copied!" : "Tailwind"}
                </span>
                <span className="text-[9px] text-[var(--muted)] leading-tight">color config</span>
              </button>

              <button
                onClick={copyHexList}
                className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-[var(--radius-sm)] transition-colors text-center group ${
                  copied === "hex"
                    ? "bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/30"
                    : "bg-[var(--surface-2)] hover:bg-[var(--border)]"
                }`}
              >
                {copied === "hex"
                  ? <Check size={14} className="text-[var(--accent)]" />
                  : <Copy size={14} className="text-[var(--muted)] group-hover:text-[var(--fg)] transition-colors" />}
                <span className={`text-[11px] font-medium leading-tight ${copied === "hex" ? "text-[var(--accent)]" : ""}`}>
                  {copied === "hex" ? "Copied!" : "Hex List"}
                </span>
                <span className="text-[9px] text-[var(--muted)] leading-tight">stop: #hex</span>
              </button>
            </div>

            <p className="text-[9px] text-[var(--muted)] text-center">
              Click any swatch in the strip to copy individual hex values
            </p>

            {onSaveAsPalette && !showSavePreview && (
              <button
                onClick={() => { setCustomName(predictedName); setShowSavePreview(true); }}
                disabled={forked}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-90 transition-opacity text-sm font-medium disabled:opacity-80"
              >
                {forked ? (
                  <>
                    <Check size={14} />
                    <span>Saved to Library</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus size={14} />
                    <span>Save as Palette</span>
                  </>
                )}
              </button>
            )}

            {onSaveAsPalette && showSavePreview && (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15 }}
                  className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] p-3 flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-[var(--fg)]">Palette name</p>
                    <button
                      onClick={() => setShowSavePreview(false)}
                      className="text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
                      title="Cancel"
                    >
                      <X size={12} />
                    </button>
                  </div>

                  <input
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSaveAsPalette(); } if (e.key === "Escape") { e.preventDefault(); setShowSavePreview(false); } }}
                    placeholder={predictedName}
                    className="w-full px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] text-[11px] font-mono text-[var(--accent)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-colors"
                  />

                  {/* Mini swatch preview with names */}
                  <div className="flex flex-col gap-1">
                    <div className="flex rounded overflow-hidden ring-1 ring-[var(--border)]">
                      {shades.map((shade) => (
                        <div
                          key={shade.stop}
                          className="flex-1 h-8"
                          style={{ backgroundColor: shade.hex }}
                          title={`${shade.stop}: ${shade.hex}`}
                        />
                      ))}
                    </div>
                    <div className="flex">
                      {shades.map((shade) => (
                        <div key={shade.stop} className="flex-1 text-center">
                          <span className={`text-[8px] tabular-nums leading-none ${shade.isSource ? "font-bold text-[var(--fg)]" : "text-[var(--muted)]"}`}>
                            {shade.stop}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[9px] text-[var(--muted)] text-center">
                      {shades.length} swatches · names are stop numbers
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowSavePreview(false)}
                      className="flex-1 px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] text-[11px] font-medium text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--fg)] transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSaveAsPalette}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-90 transition-opacity text-[11px] font-semibold"
                    >
                      <BookmarkPlus size={12} />
                      Confirm & Save
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
