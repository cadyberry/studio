"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Code2, Check, Braces } from "lucide-react";
import { generateShadeScale, getContrastColor } from "@/lib/utils";
import Button from "@/components/ui/Button";

interface ShadeModalProps {
  color: { hex: string; name?: string } | null;
  onClose: () => void;
}

export default function ShadeModal({ color, onClose }: ShadeModalProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [hoveredStop, setHoveredStop] = useState<number | null>(null);

  if (!color) return null;

  const shades = generateShadeScale(color.hex);
  const sourceStop = shades.find((s) => s.isSource);

  const flash = (key: string) => {
    setCopied(key);
    setTimeout(() => setCopied(null), 1600);
  };

  const varName = color.name
    ? color.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "") || "color"
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
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X size={14} />
            </Button>
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
          <div className="px-5 pb-3">
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
              <span>Variable prefix:</span>
              <code className="font-mono bg-[var(--surface-2)] px-1.5 py-0.5 rounded text-[var(--fg)] text-[10px]">
                --{varName}
              </code>
              {color.name && (
                <span className="text-[var(--muted)]/60">derived from swatch name</span>
              )}
            </div>
          </div>

          {/* Export actions */}
          <div className="border-t border-[var(--border)] px-5 py-4 flex flex-col gap-2">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={copyCssVars}
                className="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-[var(--radius-sm)] bg-[var(--surface-2)] hover:bg-[var(--border)] transition-colors text-center group"
              >
                <Code2 size={14} className="text-[var(--muted)] group-hover:text-[var(--fg)] transition-colors" />
                <span className="text-[11px] font-medium leading-tight">
                  {copied === "css" ? "Copied!" : "CSS Vars"}
                </span>
                <span className="text-[9px] text-[var(--muted)] leading-tight">:root {"{"}…{"}"}</span>
              </button>

              <button
                onClick={copyTailwind}
                className="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-[var(--radius-sm)] bg-[var(--surface-2)] hover:bg-[var(--border)] transition-colors text-center group"
              >
                <Braces size={14} className="text-[var(--muted)] group-hover:text-[var(--fg)] transition-colors" />
                <span className="text-[11px] font-medium leading-tight">
                  {copied === "tailwind" ? "Copied!" : "Tailwind"}
                </span>
                <span className="text-[9px] text-[var(--muted)] leading-tight">color config</span>
              </button>

              <button
                onClick={copyHexList}
                className="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-[var(--radius-sm)] bg-[var(--surface-2)] hover:bg-[var(--border)] transition-colors text-center group"
              >
                <Copy size={14} className="text-[var(--muted)] group-hover:text-[var(--fg)] transition-colors" />
                <span className="text-[11px] font-medium leading-tight">
                  {copied === "hex" ? "Copied!" : "Hex List"}
                </span>
                <span className="text-[9px] text-[var(--muted)] leading-tight">stop: #hex</span>
              </button>
            </div>

            <p className="text-[9px] text-[var(--muted)] text-center">
              Click any swatch in the strip to copy individual hex values
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
