"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Wand2, Save, X } from "lucide-react";
import { extractColorsFromImage } from "@/lib/colorExtract";
import { usePaletteStore } from "@/store/paletteStore";
import { getContrastColor } from "@/lib/utils";
import Button from "@/components/ui/Button";
import type { ColorSwatch } from "@/types";

export default function Extractor() {
  const [dragging, setDragging] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [colors, setColors] = useState<ColorSwatch[]>([]);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [paletteName, setPaletteName] = useState("");
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const addPalette = usePaletteStore((s) => s.addPalette);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setExtracting(true);
    setSaved(false);
    setColors([]);
    setThumbnail(null);
    try {
      const result = await extractColorsFromImage(file, 6);
      setColors(result.colors);
      setThumbnail(result.thumbnail);
      const nameParts = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
      setPaletteName(nameParts.charAt(0).toUpperCase() + nameParts.slice(1));
    } finally {
      setExtracting(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleSave = () => {
    if (!colors.length) return;
    addPalette({
      name: paletteName || "Untitled Palette",
      colors,
      sourceImage: thumbnail ?? undefined,
      tags: [],
    });
    setSaved(true);
    setTimeout(() => {
      setColors([]);
      setThumbnail(null);
      setPaletteName("");
      setSaved(false);
    }, 1800);
  };

  const handleReset = () => {
    setColors([]);
    setThumbnail(null);
    setPaletteName("");
    setSaved(false);
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <AnimatePresence mode="wait">
        {colors.length === 0 ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`
              relative cursor-pointer rounded-[var(--radius)] border-2 border-dashed transition-all duration-200
              flex flex-col items-center justify-center gap-3 p-10 text-center min-h-[180px]
              ${dragging
                ? "border-[var(--accent)] bg-[var(--surface-2)]"
                : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--muted)] hover:bg-[var(--surface-2)]"
              }
            `}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInput}
            />
            {extracting ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              >
                <Wand2 size={28} className="text-[var(--muted)]" />
              </motion.div>
            ) : (
              <Upload size={28} className="text-[var(--muted)]" />
            )}
            <div>
              <p className="text-sm font-medium">
                {extracting ? "Extracting colors…" : dragging ? "Drop it here" : "Drop an image or click to upload"}
              </p>
              <p className="text-xs text-[var(--muted)] mt-1">PNG, JPG, WEBP — any artwork</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Image + palette preview */}
            <div className="rounded-[var(--radius)] overflow-hidden border border-[var(--border)] bg-[var(--surface)]">
              {thumbnail && (
                <div className="relative h-32 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbnail}
                    alt="Source"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
                </div>
              )}
              <div className="flex h-20">
                {colors.map((color, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex-1 cursor-pointer group relative"
                    style={{ backgroundColor: color.hex }}
                    onClick={() => navigator.clipboard.writeText(color.hex)}
                    title={`Copy ${color.hex}`}
                  >
                    <div
                      className="absolute inset-0 flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: getContrastColor(color.hex) }}
                    >
                      <span className="text-[9px] font-mono font-bold">
                        {color.hex.slice(1).toUpperCase()}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Name + save */}
            <div className="flex gap-2">
              <input
                type="text"
                value={paletteName}
                onChange={(e) => setPaletteName(e.target.value)}
                placeholder="Name this palette…"
                className="flex-1 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--muted)]"
              />
              <Button
                onClick={handleSave}
                disabled={saved}
                className={saved ? "bg-green-500 text-white pointer-events-none" : ""}
              >
                {saved ? "Saved!" : (
                  <>
                    <Save size={14} />
                    Save
                  </>
                )}
              </Button>
              <Button variant="ghost" size="md" onClick={handleReset} title="Start over">
                <X size={14} />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
