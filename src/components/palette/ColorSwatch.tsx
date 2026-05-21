"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getContrastColor, rgbToHsl, hexToRgb } from "@/lib/utils";
import type { ColorSwatch as ColorSwatchType } from "@/types";

interface ColorSwatchProps {
  color: ColorSwatchType;
  size?: "sm" | "md" | "lg";
  showInfo?: boolean;
}

export default function ColorSwatch({ color, size = "md", showInfo = true }: ColorSwatchProps) {
  const [copied, setCopied] = useState(false);
  const contrastColor = getContrastColor(color.hex);
  const rgb = hexToRgb(color.hex);
  const hsl = rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(color.hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className={`relative group rounded-[var(--radius-sm)] overflow-hidden cursor-pointer transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] ${
        size === "sm" ? "h-16" : size === "lg" ? "h-36" : "h-24"
      }`}
      style={{ backgroundColor: color.hex }}
      onClick={handleCopy}
      title={`Click to copy ${color.hex}`}
    >
      {showInfo && (
        <div
          className="absolute inset-0 flex flex-col justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          style={{ color: contrastColor }}
        >
          <div className="text-[10px] font-mono font-semibold tracking-wide uppercase">
            {color.hex.toUpperCase()}
          </div>
          {hsl && (
            <div className="text-[9px] opacity-70">
              {hsl.h}° {hsl.s}% {hsl.l}%
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center"
            style={{ color: contrastColor }}
          >
            <span className="text-xs font-semibold bg-black/10 backdrop-blur-sm px-2 py-1 rounded">
              Copied!
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
