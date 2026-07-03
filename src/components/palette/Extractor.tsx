"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Wand2, Save, X, Hash, ImageIcon } from "lucide-react";
import { extractColorsFromImage } from "@/lib/colorExtract";
import { usePaletteStore } from "@/store/paletteStore";
import { getContrastColor } from "@/lib/utils";
import Button from "@/components/ui/Button";
import type { ColorSwatch } from "@/types";

type InputMode = "image" | "hex";

// Parse a free-form hex list: #rrggbb, rrggbb, #rgb, rgb — comma/space/newline delimited
function parseHexList(input: string): ColorSwatch[] {
  const tokens = input.split(/[\s,;|]+/);
  const seen = new Set<string>();
  const result: ColorSwatch[] = [];
  for (const token of tokens) {
    let raw = token.trim().replace(/^#+/, "");
    // Expand 3-char shorthand
    if (/^[0-9a-fA-F]{3}$/.test(raw)) {
      raw = raw[0] + raw[0] + raw[1] + raw[1] + raw[2] + raw[2];
    }
    if (!/^[0-9a-fA-F]{6}$/.test(raw)) continue;
    const hex = "#" + raw.toLowerCase();
    if (seen.has(hex)) continue;
    seen.add(hex);
    result.push({ hex });
    if (result.length >= 8) break;
  }
  return result;
}

interface ExtractorProps {
  seedHex?: string;
  seedName?: string;
  onSeedConsumed?: () => void;
}

export default function Extractor({ seedHex, seedName, onSeedConsumed }: ExtractorProps) {
  const [inputMode, setInputMode] = useState<InputMode>("image");
  const [dragging, setDragging] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [colors, setColors] = useState<ColorSwatch[]>([]);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [paletteName, setPaletteName] = useState("");
  const [saved, setSaved] = useState(false);
  const [hexInput, setHexInput] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const addPalette = usePaletteStore((s) => s.addPalette);

  // Seed from Trend Library: switch to hex mode and pre-fill
  useEffect(() => {
    if (!seedHex) return;
    setInputMode("hex");
    setHexInput(seedHex);
    setColors([]);
    setThumbnail(null);
    if (seedName) setPaletteName(seedName);
    setSaved(false);
    onSeedConsumed?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedHex]);

  const hexColors = useMemo(() => parseHexList(hexInput), [hexInput]);
  const activeColors = inputMode === "hex" ? hexColors : colors;

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
    if (!activeColors.length) return;
    addPalette({
      name: paletteName || "Untitled Palette",
      colors: activeColors,
      sourceImage: thumbnail ?? undefined,
      tags: [],
    });
    setSaved(true);
    setTimeout(() => {
      setColors([]);
      setThumbnail(null);
      setPaletteName("");
      setSaved(false);
      if (inputMode === "hex") setHexInput("");
    }, 1800);
  };

  const handleReset = () => {
    setColors([]);
    setThumbnail(null);
    setPaletteName("");
    setSaved(false);
    if (inputMode === "hex") setHexInput("");
  };

  const switchMode = (mode: InputMode) => {
    if (mode === inputMode) return;
    setInputMode(mode);
    setColors([]);
    setThumbnail(null);
    setPaletteName("");
    setSaved(false);
    setHexInput("");
  };

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-0.5 gap-0.5">
        {(["image", "hex"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => switchMode(mode)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[calc(var(--radius-sm)-1px)] text-xs font-medium transition-all duration-150 ${
              inputMode === mode
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--fg)]"
            }`}
          >
            {mode === "image" ? <ImageIcon size={12} /> : <Hash size={12} />}
            {mode === "image" ? "Image" : "Hex"}
          </button>
        ))}
      </div>

      {/* Input area */}
      <AnimatePresence mode="wait">
        {inputMode === "image" ? (
          <motion.div
            key="image-mode"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
          >
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
                  key="image-result"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-[var(--radius)] overflow-hidden border border-[var(--border)] bg-[var(--surface)]"
                >
                  {thumbnail && (
                    <div className="relative h-32 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumbnail} alt="Source" className="w-full h-full object-cover" />
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
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          // Hex mode
          <motion.div
            key="hex-mode"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.15 }}
            className="space-y-3"
          >
            <textarea
              value={hexInput}
              onChange={(e) => { setHexInput(e.target.value); setSaved(false); }}
              onFocus={async () => {
                if (hexInput) return;
                try {
                  const clip = await navigator.clipboard.readText();
                  if (parseHexList(clip).length > 0) setHexInput(clip.trim());
                } catch { /* clipboard access denied */ }
              }}
              placeholder={"Paste hex codes — any format works:\n#ff6b6b, #4ecdc4, #ffe66d\nff6b6b 4ecdc4 ffe66d\n#f6b (3-char shorthand OK)"}
              rows={4}
              spellCheck={false}
              className="w-full text-sm font-mono bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2.5 outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--muted)] resize-none leading-relaxed"
            />
            {/* Live preview strip */}
            <AnimatePresence>
              {hexColors.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)]"
                >
                  <div className="flex h-16">
                    {hexColors.map((color, i) => (
                      <motion.div
                        key={color.hex}
                        initial={{ opacity: 0, scaleY: 0 }}
                        animate={{ opacity: 1, scaleY: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex-1 cursor-pointer group relative"
                        style={{ backgroundColor: color.hex }}
                        onClick={() => navigator.clipboard.writeText(color.hex)}
                        title={`Copy ${color.hex}`}
                      >
                        <div
                          className="absolute inset-0 flex items-end justify-center pb-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: getContrastColor(color.hex) }}
                        >
                          <span className="text-[9px] font-mono font-bold">
                            {color.hex.slice(1).toUpperCase()}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="px-3 py-1.5 bg-[var(--surface)] border-t border-[var(--border)]">
                    <span className="text-xs text-[var(--muted)]">
                      {hexColors.length} color{hexColors.length !== 1 ? "s" : ""}
                      {hexColors.length === 8 ? " (max)" : ""}
                      {" "}· click any swatch to copy
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Name + save — shown when active colors exist in either mode */}
      <AnimatePresence>
        {activeColors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="flex gap-2"
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
