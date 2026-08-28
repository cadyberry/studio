"use client";

import { useState, useEffect, useRef, type ReactNode, type MouseEvent } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Trash2, Download, FolderOpen, Edit2, Eye, Pencil, Wand2, X, Loader2, Tag, CopyPlus, Check, Crown, Lock, LockOpen, StickyNote, Plus, Layers, ArrowLeftRight, Pin, Shuffle, Tags, Printer, Keyboard, Image as ImageIcon, Sparkles, RefreshCw, Copy, ShieldCheck, Clock, Glasses, GitFork } from "lucide-react";
import { getContrastColor, deltaE, getPaletteMood, getPaletteHueFamily, formatRelativeAge, formatDate, getHarmonyColors, hexToRgb, rgbToHsl, hexToOklch, oklchToHex, isOklchOutOfSrgbGamut, derivePaletteVariant, getContrastRatio, type PaletteMood, type PaletteHueFamily, type PaletteVariant, PALETTE_VARIANT_LABELS } from "@/lib/utils";
import { exportAsCvdStrip } from "@/lib/exportPalette";
import { usePaletteStore } from "@/store/paletteStore";
import type { ColorSwatch, Palette, PaletteSnapshot } from "@/types";
import Button from "@/components/ui/Button";

type KeyedColor = ColorSwatch & { _key: string };

function highlightMatch(text: string, query: string | undefined): ReactNode {
  if (!query || !text) return text;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-800/60 text-inherit rounded-[2px] not-italic px-[1px]">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function getNoteExcerpt(
  notes: string,
  query: string,
  context = 55
): { prefix: string; match: string; suffix: string; truncStart: boolean; truncEnd: boolean } | null {
  if (!query || !notes) return null;
  const lowerNotes = notes.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerNotes.indexOf(lowerQuery);
  if (idx === -1) return null;
  // Short notes (≤120 chars) show in full — no truncation ellipsis
  const effectiveContext = notes.length <= 120 ? notes.length : context;
  const start = Math.max(0, idx - effectiveContext);
  const end = Math.min(notes.length, idx + query.length + effectiveContext);
  return {
    prefix: notes.slice(start, idx),
    match: notes.slice(idx, idx + query.length),
    suffix: notes.slice(idx + query.length, end),
    truncStart: start > 0,
    truncEnd: end < notes.length,
  };
}

function getMatchTier(dE: number): { bg: string; text: string; label: string; overlay: string } {
  if (dE < 5)  return { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", label: "excellent", overlay: "bg-emerald-600/80 text-white" };
  if (dE < 10) return { bg: "bg-sky-100 dark:bg-sky-900/30",     text: "text-sky-700 dark:text-sky-400",     label: "good",      overlay: "bg-sky-500/80 text-white"     };
  if (dE < 15) return { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", label: "fair",      overlay: "bg-amber-500/80 text-white"   };
  return               { bg: "bg-rose-100 dark:bg-rose-900/30",  text: "text-rose-700 dark:text-rose-400",  label: "loose",     overlay: "bg-rose-600/80 text-white"    };
}

function getFreshness(createdAt: string, updatedAt: string): { label: string; bgClass: string; textClass: string; opacity: number; isEdited: boolean } | null {
  const ONE_HOUR = 60 * 60 * 1000;
  const isEdited = new Date(updatedAt).getTime() - new Date(createdAt).getTime() > ONE_HOUR;
  const referenceDate = isEdited ? updatedAt : createdAt;
  const days = (Date.now() - new Date(referenceDate).getTime()) / (1000 * 60 * 60 * 24);
  if (days < 1)  return { label: "new", bgClass: "bg-emerald-100 dark:bg-emerald-900/30", textClass: "text-emerald-600 dark:text-emerald-400", opacity: 1, isEdited };
  if (days < 2)  return { label: "1d",  bgClass: "bg-emerald-100 dark:bg-emerald-900/30", textClass: "text-emerald-600 dark:text-emerald-400", opacity: 0.85, isEdited };
  if (days < 7)  return { label: `${Math.floor(days)}d`, bgClass: "bg-green-100 dark:bg-green-900/30", textClass: "text-green-600 dark:text-green-500", opacity: Math.max(0.65, 0.85 - (days - 2) * 0.05), isEdited };
  if (days < 14) return { label: "1w",  bgClass: "bg-lime-100 dark:bg-lime-900/30",   textClass: "text-lime-700 dark:text-lime-500",   opacity: 0.55, isEdited };
  if (days < 21) return { label: "2w",  bgClass: "bg-amber-100 dark:bg-amber-900/30", textClass: "text-amber-600 dark:text-amber-500", opacity: 0.40, isEdited };
  return null;
}

// Returns aging info for palettes untouched for >30 days — complementary to getFreshness (which covers 0-21d).
function getAging(createdAt: string, updatedAt: string): {
  label: string;
  ageClass: "subtle" | "mild" | "notable" | "old";
  days: number;
  formattedDate: string;
} | null {
  const lastTouch = Math.max(new Date(createdAt).getTime(), new Date(updatedAt).getTime());
  const days = (Date.now() - lastTouch) / (1000 * 60 * 60 * 24);
  if (days < 30) return null;
  const formattedDate = formatDate(new Date(lastTouch).toISOString());
  if (days < 60)  return { label: "~1mo",   ageClass: "subtle",  days, formattedDate };
  if (days < 90)  return { label: "~2mo",   ageClass: "subtle",  days, formattedDate };
  if (days < 180) return { label: "~3mo+",  ageClass: "mild",    days, formattedDate };
  if (days < 365) return { label: "~6mo+",  ageClass: "notable", days, formattedDate };
  return              { label: "1yr+",   ageClass: "old",    days, formattedDate };
}

// Directed Hausdorff ΔE: average of each source color's nearest-neighbor ΔE in target
function paletteDe(a: Palette, b: Palette): number {
  if (a.colors.length === 0 || b.colors.length === 0) return Infinity;
  const sum = a.colors.reduce((acc, ca) => {
    const minDe = b.colors.reduce((m, cb) => Math.min(m, deltaE(ca.hex, cb.hex)), Infinity);
    return acc + minDe;
  }, 0);
  return sum / a.colors.length;
}

const AGING_STYLES: Record<"subtle" | "mild" | "notable" | "old", { badge: string; border: string }> = {
  subtle:  { badge: "bg-[var(--surface-2)] text-[var(--muted)]",                                              border: "" },
  mild:    { badge: "bg-stone-100 text-stone-500 dark:bg-stone-800/40 dark:text-stone-400",                   border: "" },
  notable: { badge: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-500",                   border: "ring-1 ring-amber-100 dark:ring-amber-900/30" },
  old:     { badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-semibold",    border: "ring-1 ring-amber-200 dark:ring-amber-800/40" },
};

function getRecommendedVariant(colors: { hex: string }[]): { variant: PaletteVariant; reason: string } {
  if (colors.length === 0) return { variant: "lighter", reason: "Add some light" };
  const hsls = colors
    .map((c) => { const rgb = hexToRgb(c.hex); return rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null; })
    .filter((v): v is { h: number; s: number; l: number } => v !== null);
  if (hsls.length === 0) return { variant: "saturated", reason: "Add color to neutrals" };

  const avgS = hsls.reduce((s, h) => s + h.s, 0) / hsls.length;
  const avgL = hsls.reduce((s, h) => s + h.l, 0) / hsls.length;

  if (avgS > 58)  return { variant: "muted",     reason: "Highly saturated — muted version great for print" };
  if (avgS < 22)  return { variant: "saturated", reason: "Very muted — vivid version would pop" };
  if (avgL > 68)  return { variant: "darker",    reason: "Mostly light — darker version adds depth" };
  if (avgL < 32)  return { variant: "lighter",   reason: "Mostly dark — lighter version opens it up" };
  // Balanced palette: suggest the opposite of detected mood
  if (avgL > 52)  return { variant: "darker",    reason: "Mid-light tones — try the darker contrast" };
  return { variant: "lighter", reason: "Mid-dark tones — try the lighter contrast" };
}

const HUE_FAMILY_STYLES: Record<PaletteHueFamily, { dot: string; bg: string; text: string; label: string }> = {
  warm:    { dot: "bg-amber-400",                                        bg: "bg-amber-50 dark:bg-amber-900/20",  text: "text-amber-600 dark:text-amber-400", label: "warm"    },
  cool:    { dot: "bg-sky-400",                                          bg: "bg-sky-50 dark:bg-sky-900/20",      text: "text-sky-600 dark:text-sky-400",     label: "cool"    },
  neutral: { dot: "bg-zinc-300 dark:bg-zinc-600",                       bg: "bg-zinc-50 dark:bg-zinc-800/40",    text: "text-zinc-400 dark:text-zinc-500",   label: "neutral" },
};

const MOOD_STYLES: Record<PaletteMood, { bg: string; text: string; label: string }> = {
  vivid:  { bg: "bg-rose-100 dark:bg-rose-900/30",   text: "text-rose-600 dark:text-rose-400",   label: "vivid"  },
  muted:  { bg: "bg-zinc-100 dark:bg-zinc-800",       text: "text-zinc-500 dark:text-zinc-400",   label: "muted"  },
  warm:   { bg: "bg-amber-100 dark:bg-amber-900/30",  text: "text-amber-600 dark:text-amber-400", label: "warm"   },
  earthy: { bg: "bg-lime-100 dark:bg-lime-900/30",    text: "text-lime-700 dark:text-lime-400",   label: "earthy" },
  cool:   { bg: "bg-sky-100 dark:bg-sky-900/30",      text: "text-sky-600 dark:text-sky-400",     label: "cool"   },
  dreamy: { bg: "bg-violet-100 dark:bg-violet-900/30",text: "text-violet-600 dark:text-violet-400",label: "dreamy"},
};

interface PaletteCardProps {
  palette: Palette;
  onExport: (palette: Palette) => void;
  onRename: (palette: Palette) => void;
  onAssignCollection: (palette: Palette) => void;
  onHarmony: (palette: Palette) => void;
  onEditSwatch: (palette: Palette, swatchIndex: number) => void;
  onShadeScale: (palette: Palette, swatchIndex: number) => void;
  onDuplicate: (palette: Palette) => void;
  isSelected?: boolean;
  selectionActive?: boolean;
  onSelect?: (id: string) => void;
  colorMatchHex?: string;
  isCover?: boolean;
  onSetCover?: (palette: Palette) => void;
  className?: string;
  searchQuery?: string;
  collectionName?: string;
  collectionSize?: number;
  onJumpToCollection?: (collectionId: string) => void;
  onClearCollection?: () => void;
  onFilterByTag?: (tag: string) => void;
  activeTags?: string[];
  onCompare?: (palette: Palette) => void;
  isCompareAnchor?: boolean;
  compareActive?: boolean;
  onPin?: (palette: Palette) => void;
  isPinned?: boolean;
  isHighlighted?: boolean;
  cardId?: string;
  onContrast?: (palette: Palette) => void;
  isFocused?: boolean;
  keyboardFocusActive?: boolean;
  onFocusCard?: (id: string) => void;
}

type NamingState =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "names"; names: string[] }
  | { type: "error" };

export default function PaletteCard({ palette, onExport, onRename, onAssignCollection, onHarmony, onEditSwatch, onShadeScale, onDuplicate, isSelected = false, selectionActive = false, onSelect, colorMatchHex, isCover = false, onSetCover, className, searchQuery, collectionName, collectionSize, onJumpToCollection, onClearCollection, onFilterByTag, activeTags, onCompare, isCompareAnchor = false, compareActive = false, onPin, isPinned = false, isHighlighted = false, cardId, onContrast, isFocused = false, keyboardFocusActive = false, onFocusCard }: PaletteCardProps) {
  const { deletePalette, updatePalette, addPalette, collections, saveSnapshot, restoreSnapshot, deleteSnapshot } = usePaletteStore((s) => ({
    deletePalette: s.deletePalette,
    updatePalette: s.updatePalette,
    addPalette: s.addPalette,
    collections: s.collections,
    saveSnapshot: s.saveSnapshot,
    restoreSnapshot: s.restoreSnapshot,
    deleteSnapshot: s.deleteSnapshot,
  }));
  const cachedColorStory = usePaletteStore((s) => s.colorStoryCache[palette.id] ?? null);
  const setColorStoryCache = usePaletteStore((s) => s.setColorStoryCache);

  // All unique tags in the library (for autocomplete)
  const allLibraryTags = usePaletteStore((s) => {
    const seen = new Set<string>();
    s.palettes.forEach((p) => p.tags?.forEach((t) => seen.add(t)));
    return Array.from(seen).sort();
  });
  const [confirming, setConfirming] = useState(false);
  const [duplicated, setDuplicated] = useState(false);
  const [forkedHarmony, setForkedHarmony] = useState(false);
  const [copiedSwatchKey, setCopiedSwatchKey] = useState<string | null>(null);
  const [copiedHarmonyHex, setCopiedHarmonyHex] = useState<string | null>(null);
  const [naming, setNaming] = useState<NamingState>({ type: "idle" });
  const [tagging, setTagging] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const tagInputRef = useRef<HTMLInputElement>(null);
  const [inlineEditing, setInlineEditing] = useState(false);
  const [inlineNameValue, setInlineNameValue] = useState(palette.name);
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesValue, setNotesValue] = useState(palette.notes ?? "");
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [inlineNotesEditing, setInlineNotesEditing] = useState(false);
  const [inlineNotesValue, setInlineNotesValue] = useState(palette.notes ?? "");
  const inlineNotesRef = useRef<HTMLTextAreaElement>(null);
  const [suggestionIdx, setSuggestionIdx] = useState(-1);
  const [variationsOpen, setVariationsOpen] = useState(false);
  const [forkedVariant, setForkedVariant] = useState<PaletteVariant | null>(null);
  const [replacedVariant, setReplacedVariant] = useState<PaletteVariant | null>(null);
  const [swatchNaming, setSwatchNaming] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [printCheckOpen, setPrintCheckOpen] = useState(false);
  const [printMutedIdx, setPrintMutedIdx] = useState<number | null>(null);
  const [printMutedAll, setPrintMutedAll] = useState(false);
  const [cautionMutedIdx, setCautionMutedIdx] = useState<number | null>(null);
  const [cautionMutedAll, setCautionMutedAll] = useState(false);
  const [showKeyShortcuts, setShowKeyShortcuts] = useState(false);
  const [coverUrlOpen, setCoverUrlOpen] = useState(false);
  const [coverUrlValue, setCoverUrlValue] = useState(palette.coverUrl ?? "");
  const [coverUrlError, setCoverUrlError] = useState(false);
  const coverUrlInputRef = useRef<HTMLInputElement>(null);
  const [colorStoryOpen, setColorStoryOpen] = useState(false);
  const [colorStoryLoading, setColorStoryLoading] = useState(false);
  // Initialized from persisted cache so the story is instant on re-open
  const [colorStory, setColorStory] = useState<{ vibe: string; products: string[]; prompt: string } | null>(() => cachedColorStory);
  const [colorStoryError, setColorStoryError] = useState(false);
  const [colorStoryPromptCopied, setColorStoryPromptCopied] = useState(false);
  const [cvdExported, setCvdExported] = useState(false);
  const [forkCollectionOpen, setForkCollectionOpen] = useState(false);
  const [forkedToCollectionName, setForkedToCollectionName] = useState<string | null>(null);
  const forkContainerRef = useRef<HTMLDivElement>(null);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [snapshotSaved, setSnapshotSaved] = useState(false);
  const [snapshotRestored, setSnapshotRestored] = useState(false);
  const snapshotContainerRef = useRef<HTMLDivElement>(null);
  const [similarPalettes, setSimilarPalettes] = useState<{ palette: Palette; avgDe: number }[]>([]);
  const [harmonyHovered, setHarmonyHovered] = useState(false);
  const [harmonyAnchorFlash, setHarmonyAnchorFlash] = useState(false);
  const similarComputedRef = useRef(false);

  // Reset similar palettes cache when this palette's colors change
  const colorsKey = palette.colors.map((c) => c.hex).join(",");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    similarComputedRef.current = false;
    setSimilarPalettes([]);
  }, [colorsKey]);

  // Refs so keyboard handler always sees latest values without re-registering
  const isHoveredRef = useRef(false);
  const paletteRef = useRef(palette);
  paletteRef.current = palette;
  const onDuplicateRef = useRef(onDuplicate);
  onDuplicateRef.current = onDuplicate;
  const onHarmonyRef = useRef(onHarmony);
  onHarmonyRef.current = onHarmony;
  const onExportRef = useRef(onExport);
  onExportRef.current = onExport;
  const updatePaletteRef = useRef(updatePalette);
  updatePaletteRef.current = updatePalette;
  const deletePaletteRef = useRef(deletePalette);
  deletePaletteRef.current = deletePalette;
  const onPinRef = useRef(onPin);
  onPinRef.current = onPin;
  const onCompareRef = useRef(onCompare);
  onCompareRef.current = onCompare;
  const colorStoryOpenRef = useRef(false);
  const openColorStoryRef = useRef<() => void>(() => {});
  const onEditSwatchRef = useRef(onEditSwatch);
  onEditSwatchRef.current = onEditSwatch;
  const isFocusedRef = useRef(isFocused);
  isFocusedRef.current = isFocused;
  const keyboardFocusActiveRef = useRef(keyboardFocusActive);
  keyboardFocusActiveRef.current = keyboardFocusActive;

  // Close fork popover on outside click
  useEffect(() => {
    if (!forkCollectionOpen) return;
    const handler = (e: PointerEvent) => {
      if (forkContainerRef.current && !forkContainerRef.current.contains(e.target as Node)) {
        setForkCollectionOpen(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [forkCollectionOpen]);

  // Close snapshot popover on outside click
  useEffect(() => {
    if (!snapshotOpen) return;
    const handler = (e: PointerEvent) => {
      if (snapshotContainerRef.current && !snapshotContainerRef.current.contains(e.target as Node)) {
        setSnapshotOpen(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [snapshotOpen]);

  // Keyboard shortcuts — active when this card is hovered, no text field is focused
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isHoveredRef.current && !isFocusedRef.current) return;
      // When any card has keyboard focus, suppress hover-based shortcuts on non-focused cards
      if (keyboardFocusActiveRef.current && !isFocusedRef.current) return;
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (e.metaKey || e.ctrlKey) return;
      const pal = paletteRef.current;
      // Alt+V → Tritanopia CVD export (handled before the switch so altKey doesn't block it)
      if (e.altKey) {
        if (e.key === "v" || e.key === "V") {
          e.preventDefault();
          exportAsCvdStrip(pal, "tritanopia");
          setCvdExported(true);
          setTimeout(() => setCvdExported(false), 1800);
        }
        return;
      }
      switch (e.key) {
        case "d": case "D":
          e.preventDefault();
          onDuplicateRef.current(pal);
          setDuplicated(true);
          setTimeout(() => setDuplicated(false), 1500);
          break;
        case "F2":
          if (!pal.frozen) {
            e.preventDefault();
            setInlineNameValue(pal.name);
            setInlineEditing(true);
            setTimeout(() => { inlineInputRef.current?.focus(); inlineInputRef.current?.select(); }, 30);
          }
          break;
        case "l": case "L":
          e.preventDefault();
          updatePaletteRef.current(pal.id, { frozen: !pal.frozen });
          break;
        case "h": case "H":
          e.preventDefault();
          onHarmonyRef.current(pal);
          break;
        case "c": case "C":
          if (onCompareRef.current) { e.preventDefault(); onCompareRef.current(pal); }
          break;
        case "p": case "P":
          // When focused via J/K (not hovered), P is claimed by the global handler to open
          // the Export modal — so we skip pin here to avoid conflict.
          if (isFocusedRef.current && !isHoveredRef.current) break;
          if (onPinRef.current) { e.preventDefault(); onPinRef.current(pal); }
          break;
        case "e": case "E":
          e.preventDefault();
          onExportRef.current(pal);
          break;
        case "v":
          e.preventDefault();
          exportAsCvdStrip(pal, "deuteranopia");
          setCvdExported(true);
          setTimeout(() => setCvdExported(false), 1800);
          break;
        case "V":
          e.preventDefault();
          exportAsCvdStrip(pal, "protanopia");
          setCvdExported(true);
          setTimeout(() => setCvdExported(false), 1800);
          break;
        case "w": case "W":
          if (pal.colors.length > 0) {
            e.preventDefault();
            onEditSwatchRef.current(pal, 0);
          }
          break;
        case "s": case "S":
          e.preventDefault();
          if (e.shiftKey && !pal.frozen) {
            // Shift+S → save snapshot without opening the popover
            saveSnapshot(pal.id);
            setSnapshotSaved(true);
            setTimeout(() => setSnapshotSaved(false), 1600);
          } else if (!e.shiftKey) {
            if (colorStoryOpenRef.current) { setColorStoryOpen(false); } else { openColorStoryRef.current(); }
          }
          break;
        case "Delete":
          if (!pal.frozen) {
            e.preventDefault();
            setConfirming((prev) => {
              if (prev) { deletePaletteRef.current(pal.id); return false; }
              setTimeout(() => setConfirming(false), 2000);
              return true;
            });
          }
          break;
        case "?":
          // stop propagation so the global ? modal doesn't also open
          e.stopPropagation();
          e.preventDefault();
          setShowKeyShortcuts(true);
          break;
      }
    };
    const upHandler = (e: KeyboardEvent) => {
      if (e.key === "?") setShowKeyShortcuts(false);
    };
    // capture phase so ? intercept fires before the global keydown handler
    document.addEventListener("keydown", handler, true);
    document.addEventListener("keyup", upHandler);
    return () => {
      document.removeEventListener("keydown", handler, true);
      document.removeEventListener("keyup", upHandler);
    };
  }, []); // stable via refs

  // Sync inline name value when palette.name changes externally
  useEffect(() => {
    if (!inlineEditing) setInlineNameValue(palette.name);
  }, [palette.name, inlineEditing]);

  // Sync notes value when palette.notes changes externally
  useEffect(() => {
    if (!notesOpen) setNotesValue(palette.notes ?? "");
  }, [palette.notes, notesOpen]);

  // Sync inline notes value when palette.notes changes externally
  useEffect(() => {
    if (!inlineNotesEditing) setInlineNotesValue(palette.notes ?? "");
  }, [palette.notes, inlineNotesEditing]);

  // Sync cover URL input when palette.coverUrl changes externally
  useEffect(() => {
    if (!coverUrlOpen) setCoverUrlValue(palette.coverUrl ?? "");
  }, [palette.coverUrl, coverUrlOpen]);

  // Ordered colors with stable keys for drag-to-reorder
  const [orderedColors, setOrderedColors] = useState<KeyedColor[]>(() =>
    palette.colors.map((c, i) => ({ ...c, _key: `${palette.id}-${i}` }))
  );
  const orderedColorsRef = useRef(orderedColors);
  const dragEndTimeRef = useRef(0);

  // Sync when palette.colors changes (swatch edits, external updates)
  useEffect(() => {
    setOrderedColors((prev) => {
      if (prev.length !== palette.colors.length) {
        const fresh = palette.colors.map((c, i) => ({ ...c, _key: `${palette.id}-${i}-${Date.now()}` }));
        orderedColorsRef.current = fresh;
        return fresh;
      }
      // Preserve order and keys; update hex/name values in place
      const updated = prev.map((kc, i) => ({ ...kc, hex: palette.colors[i].hex, name: palette.colors[i].name }));
      orderedColorsRef.current = updated;
      return updated;
    });
  }, [palette.colors, palette.id]);

  const handleReorder = (newOrder: KeyedColor[]) => {
    setOrderedColors(newOrder);
    orderedColorsRef.current = newOrder;
  };

  const handleDragEnd = () => {
    dragEndTimeRef.current = Date.now();
    const plain = orderedColorsRef.current.map(({ _key: _k, ...c }) => c);
    updatePalette(palette.id, { colors: plain });
  };

  const handleSwatchCopy = (key: string, hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedSwatchKey(key);
    setTimeout(() => setCopiedSwatchKey(null), 800);
  };

  const openNotes = () => {
    setTagging(false);
    setTagInput("");
    setNaming({ type: "idle" });
    setInlineNotesEditing(false);
    setPrintCheckOpen(false);
    setCoverUrlOpen(false);
    setColorStoryOpen(false);
    setNotesValue(palette.notes ?? "");
    setNotesOpen(true);
    setTimeout(() => {
      notesTextareaRef.current?.focus();
      const len = notesTextareaRef.current?.value.length ?? 0;
      notesTextareaRef.current?.setSelectionRange(len, len);
    }, 30);
  };

  const commitNotes = () => {
    const trimmed = notesValue.trim();
    if (trimmed !== (palette.notes ?? "")) {
      updatePalette(palette.id, { notes: trimmed || undefined });
    }
    setNotesOpen(false);
  };

  const cancelNotes = () => {
    setNotesValue(palette.notes ?? "");
    setNotesOpen(false);
  };

  const openInlineNotes = () => {
    setInlineNotesValue(palette.notes ?? "");
    setInlineNotesEditing(true);
    setNotesOpen(false);
    setTimeout(() => {
      inlineNotesRef.current?.focus();
      const len = inlineNotesRef.current?.value.length ?? 0;
      inlineNotesRef.current?.setSelectionRange(len, len);
    }, 30);
  };

  const commitInlineNotes = () => {
    const trimmed = inlineNotesValue.trim();
    if (trimmed !== (palette.notes ?? "")) {
      updatePalette(palette.id, { notes: trimmed || undefined });
    }
    setInlineNotesEditing(false);
  };

  const cancelInlineNotes = () => {
    setInlineNotesValue(palette.notes ?? "");
    setInlineNotesEditing(false);
  };

  const openTagging = () => {
    setNaming({ type: "idle" });
    setNotesOpen(false);
    setInlineNotesEditing(false);
    setPrintCheckOpen(false);
    setCoverUrlOpen(false);
    setColorStoryOpen(false);
    setTagging(true);
    setTimeout(() => tagInputRef.current?.focus(), 50);
  };

  const closeTagging = () => {
    setTagging(false);
    setTagInput("");
    setSuggestionIdx(-1);
  };

  const commitTag = (raw: string) => {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 24);
    if (!tag) return;
    const existing = palette.tags ?? [];
    if (existing.includes(tag)) return;
    updatePalette(palette.id, { tags: [...existing, tag] });
  };

  const removeTag = (tag: string) => {
    updatePalette(palette.id, { tags: (palette.tags ?? []).filter((t) => t !== tag) });
  };

  const handleNameWithAI = async () => {
    setTagging(false);
    setTagInput("");
    setNotesOpen(false);
    setNaming({ type: "loading" });
    try {
      const res = await fetch("/api/name-palette", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colors: palette.colors.map((c) => c.hex) }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      if (!data.names?.length) throw new Error("No names returned");
      setNaming({ type: "names", names: data.names });
    } catch {
      setNaming({ type: "error" });
      setTimeout(() => setNaming({ type: "idle" }), 2000);
    }
  };

  const applyName = (name: string) => {
    updatePalette(palette.id, { name });
    setNaming({ type: "idle" });
  };

  const startInlineEdit = () => {
    setInlineNameValue(palette.name);
    setInlineEditing(true);
    // Focus after the input mounts
    setTimeout(() => {
      inlineInputRef.current?.focus();
      inlineInputRef.current?.select();
    }, 30);
  };

  const commitInlineEdit = () => {
    const trimmed = inlineNameValue.trim();
    if (trimmed && trimmed !== palette.name) updatePalette(palette.id, { name: trimmed });
    setInlineEditing(false);
  };

  const cancelInlineEdit = () => {
    setInlineEditing(false);
    setInlineNameValue(palette.name);
  };

  const mood = getPaletteMood(palette.colors);
  const moodStyle = MOOD_STYLES[mood];
  const hueFamily = getPaletteHueFamily(palette.colors);
  const hueFamilyStyle = HUE_FAMILY_STYLES[hueFamily];
  const freshness = getFreshness(palette.createdAt, palette.updatedAt);
  const aging = getAging(palette.createdAt, palette.updatedAt);
  const harmonyColors = getHarmonyColors(palette.colors);

  // Most-saturated swatch is the anchor from which all harmony colors are derived
  const harmonyAnchorHex = palette.colors.reduce<string | null>((best, c) => {
    const rgb = hexToRgb(c.hex);
    if (!rgb) return best;
    const { s } = rgbToHsl(rgb.r, rgb.g, rgb.b);
    if (best === null) return c.hex;
    const bestRgb = hexToRgb(best);
    const bestS = bestRgb ? rgbToHsl(bestRgb.r, bestRgb.g, bestRgb.b).s : -1;
    return s > bestS ? c.hex : best;
  }, null);

  // oklch L-range for the gradient bar (darkest → lightest sorted by perceptual lightness)
  const oklchRange = (() => {
    const ls = palette.colors
      .map((c) => { const ok = hexToOklch(c.hex); return ok ? { l: ok.l, hex: c.hex } : null; })
      .filter((x): x is { l: number; hex: string } => x !== null)
      .sort((a, b) => a.l - b.l);
    if (ls.length < 2) return null;
    const range = ls[ls.length - 1].l - ls[0].l;
    return {
      darkest: ls[0].hex,
      lightest: ls[ls.length - 1].hex,
      range: Math.round(range),
      minL: Math.round(ls[0].l),
      maxL: Math.round(ls[ls.length - 1].l),
    };
  })();

  // Lightness range badge: min–max HSL L across all swatches
  const lightnessRange = (() => {
    const ls = palette.colors
      .map((c) => { const rgb = hexToRgb(c.hex); return rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b).l : null; })
      .filter((l): l is number => l !== null);
    if (ls.length === 0) return null;
    return { min: Math.round(Math.min(...ls)), max: Math.round(Math.max(...ls)) };
  })();

  // Count swatches whose oklch values fall outside the sRGB gamut (clipped in display)
  const gamutClippedCount = palette.colors.filter((c) => {
    const ok = hexToOklch(c.hex);
    return ok ? isOklchOutOfSrgbGamut(ok.l, ok.c, ok.h) : false;
  }).length;

  // Print risk: swatches with oklch chroma high enough to risk CMYK gamut compression
  // Mirrors the per-swatch thresholds in SwatchEditor's print panel
  const printRisk = palette.colors.reduce(
    (acc, c) => {
      const ok = hexToOklch(c.hex);
      if (!ok) return acc;
      if (ok.c > 0.25) return { vivid: acc.vivid + 1, moderate: acc.moderate };
      if (ok.c > 0.12) return { vivid: acc.vivid, moderate: acc.moderate + 1 };
      return acc;
    },
    { vivid: 0, moderate: 0 }
  );

  // Tonal distribution: 5 bins across L 0-100% (shadows, dark, mid, light, highlights)
  // Used to detect "flat tone" palettes where all colors cluster in the mid-range
  const toneMap = (() => {
    const bins = [0, 0, 0, 0, 0]; // L 0-20, 20-40, 40-60, 60-80, 80-100
    for (const color of palette.colors) {
      const rgb = hexToRgb(color.hex);
      if (!rgb) continue;
      const l = rgbToHsl(rgb.r, rgb.g, rgb.b).l;
      bins[Math.min(4, Math.floor(l / 20))]++;
    }
    const total = palette.colors.length;
    const maxBin = Math.max(...bins, 1);
    // Flat tone: no shadows (L<20) and no highlights (L>80) in a 2+ color palette
    const isFlatTones = total >= 2 && bins[0] === 0 && bins[4] === 0;
    const binLabels = ["Shadows", "Dark", "Mid", "Light", "Highlights"];
    return { bins, binLabels, total, maxBin, isFlatTones };
  })();

  // A11y badge: best pairwise WCAG contrast across all color pairs
  // AA = ≥4.5:1 (normal text), AA Large = ≥3:1 (large text / UI)
  const a11yBadge = (() => {
    const colors = palette.colors;
    if (colors.length < 2) return null;
    let bestRatio = 0;
    let bestPair: [string, string] = [colors[0].hex, colors[1].hex];
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const ratio = getContrastRatio(colors[i].hex, colors[j].hex);
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestPair = [colors[i].hex, colors[j].hex];
        }
      }
    }
    if (bestRatio >= 4.5) return { level: "AA", ratio: bestRatio, pair: bestPair };
    if (bestRatio >= 3.0) return { level: "AA Large", ratio: bestRatio, pair: bestPair };
    return null;
  })();

  // Tag autocomplete: existing library tags that match current input, not already on this palette
  const currentTags = palette.tags ?? [];
  const suggestions =
    tagging && tagInput.trim().length > 0
      ? allLibraryTags
          .filter((t) => !currentTags.includes(t) && t.includes(tagInput.toLowerCase().trim()))
          .slice(0, 6)
      : [];

  // Closest swatch to the active color search query
  const bestMatchIndex = colorMatchHex
    ? orderedColors.reduce<{ idx: number; dE: number }>(
        (best, color, i) => {
          const d = deltaE(color.hex, colorMatchHex);
          return d < best.dE ? { idx: i, dE: d } : best;
        },
        { idx: 0, dE: Infinity }
      )
    : null;

  const handleDuplicate = () => {
    onDuplicate(palette);
    setDuplicated(true);
    setTimeout(() => setDuplicated(false), 1500);
  };

  const handleForkHarmony = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    addPalette({
      name: `${palette.name} · Harmony`,
      colors: harmonyColors.map((hc) => ({ hex: hc.hex, name: hc.label })),
      tags: ["harmony"],
    });
    setForkedHarmony(true);
    setTimeout(() => setForkedHarmony(false), 1500);
  };

  const handleForkToCollection = (targetCollectionId: string, targetCollectionName: string) => {
    addPalette({
      name: `${palette.name} · ${targetCollectionName}`,
      colors: [...palette.colors],
      tags: [...(palette.tags ?? [])],
      collectionId: targetCollectionId,
      notes: palette.notes,
    });
    setForkedToCollectionName(targetCollectionName);
    setForkCollectionOpen(false);
    setTimeout(() => setForkedToCollectionName(null), 1800);
  };

  const handleSaveSnapshot = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    saveSnapshot(palette.id);
    setSnapshotSaved(true);
    setTimeout(() => setSnapshotSaved(false), 1600);
  };

  const handleRestoreSnapshot = (snapshotId: string) => {
    restoreSnapshot(palette.id, snapshotId);
    setSnapshotOpen(false);
    setSnapshotRestored(true);
    setTimeout(() => setSnapshotRestored(false), 1600);
  };

  const openVariations = () => {
    setTagging(false);
    setTagInput("");
    setNaming({ type: "idle" });
    setNotesOpen(false);
    setPrintCheckOpen(false);
    setCoverUrlOpen(false);
    setVariationsOpen(true);
  };

  const handleForkVariant = (variant: PaletteVariant) => {
    const variantColors = derivePaletteVariant(palette.colors, variant);
    addPalette({
      name: `${palette.name} · ${PALETTE_VARIANT_LABELS[variant]}`,
      colors: variantColors,
      tags: ["variant"],
      collectionId: palette.collectionId,
    });
    setForkedVariant(variant);
    setTimeout(() => setForkedVariant(null), 1500);
  };

  const handleReplaceVariant = (variant: PaletteVariant) => {
    const variantColors = derivePaletteVariant(palette.colors, variant);
    updatePalette(palette.id, { colors: variantColors });
    setReplacedVariant(variant);
    setTimeout(() => { setReplacedVariant(null); setVariationsOpen(false); }, 1200);
  };

  const muteSwatch = (idx: number) => {
    const ok = hexToOklch(palette.colors[idx].hex);
    if (!ok || ok.c <= 0.25) return;
    const newHex = oklchToHex(ok.l, 0.25, ok.h);
    const newColors = palette.colors.map((c, i) => i === idx ? { ...c, hex: newHex } : c);
    updatePalette(palette.id, { colors: newColors });
    setPrintMutedIdx(idx);
    setTimeout(() => setPrintMutedIdx(null), 1400);
  };

  const muteAllVivid = () => {
    const newColors = palette.colors.map((c) => {
      const ok = hexToOklch(c.hex);
      if (!ok || ok.c <= 0.25) return c;
      return { ...c, hex: oklchToHex(ok.l, 0.25, ok.h) };
    });
    updatePalette(palette.id, { colors: newColors });
    setPrintMutedAll(true);
    setTimeout(() => setPrintMutedAll(false), 1400);
  };

  const muteSwatchToSafe = (idx: number) => {
    const ok = hexToOklch(palette.colors[idx].hex);
    if (!ok || ok.c <= 0.12) return;
    const newHex = oklchToHex(ok.l, 0.12, ok.h);
    const newColors = palette.colors.map((c, i) => i === idx ? { ...c, hex: newHex } : c);
    updatePalette(palette.id, { colors: newColors });
    setCautionMutedIdx(idx);
    setTimeout(() => setCautionMutedIdx(null), 1400);
  };

  const muteAllCaution = () => {
    const newColors = palette.colors.map((c) => {
      const ok = hexToOklch(c.hex);
      if (!ok || ok.c <= 0.12 || ok.c > 0.25) return c;
      return { ...c, hex: oklchToHex(ok.l, 0.12, ok.h) };
    });
    updatePalette(palette.id, { colors: newColors });
    setCautionMutedAll(true);
    setTimeout(() => setCautionMutedAll(false), 1400);
  };

  const addSwatchAndEdit = () => {
    if (palette.colors.length >= 8 || palette.frozen) return;
    // Shift hue 120° from the last swatch for visual variety; cap chroma for print safety
    const lastHex = palette.colors[palette.colors.length - 1]?.hex ?? "#888888";
    const lastOk = hexToOklch(lastHex);
    const newHex = lastOk
      ? oklchToHex(Math.min(72, Math.max(28, lastOk.l)), Math.min(lastOk.c, 0.14), (lastOk.h + 120) % 360)
      : "#aaaaaa";
    const newColors = [...palette.colors, { hex: newHex }];
    updatePalette(palette.id, { colors: newColors });
    // Pass the updated palette so SwatchEditor can map over the correct array
    onEditSwatch({ ...palette, colors: newColors }, palette.colors.length);
  };

  const handleNameSwatches = async () => {
    setSwatchNaming("loading");
    try {
      const res = await fetch("/api/name-swatches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colors: palette.colors.map((c) => c.hex) }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      if (!data.names?.length) throw new Error("No names returned");
      const updatedColors = palette.colors.map((c, i) => ({
        ...c,
        name: data.names[i] ?? c.name,
      }));
      updatePalette(palette.id, { colors: updatedColors });
      setSwatchNaming("done");
      setTimeout(() => setSwatchNaming("idle"), 2000);
    } catch {
      setSwatchNaming("error");
      setTimeout(() => setSwatchNaming("idle"), 2000);
    }
  };

  const handleDelete = () => {
    if (confirming) {
      deletePalette(palette.id);
    } else {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 2000);
    }
  };

  const openCoverUrl = () => {
    setTagging(false);
    setTagInput("");
    setNaming({ type: "idle" });
    setNotesOpen(false);
    setInlineNotesEditing(false);
    setPrintCheckOpen(false);
    setVariationsOpen(false);
    setColorStoryOpen(false);
    setCoverUrlValue(palette.coverUrl ?? "");
    setCoverUrlError(false);
    setCoverUrlOpen(true);
    setTimeout(() => { coverUrlInputRef.current?.focus(); coverUrlInputRef.current?.select(); }, 30);
  };

  const fetchColorStory = async () => {
    setColorStoryLoading(true);
    setColorStoryError(false);
    try {
      const res = await fetch("/api/color-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colors: palette.colors.map((c) => c.hex), name: palette.name }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as { vibe: string; products: string[]; prompt: string };
      setColorStory(data);
      setColorStoryCache(palette.id, data);
    } catch {
      setColorStoryError(true);
    } finally {
      setColorStoryLoading(false);
    }
  };

  const openColorStory = () => {
    setTagging(false);
    setTagInput("");
    setNaming({ type: "idle" });
    setNotesOpen(false);
    setInlineNotesEditing(false);
    setPrintCheckOpen(false);
    setCoverUrlOpen(false);
    setVariationsOpen(false);
    setColorStoryOpen(true);
    if (!colorStory && !colorStoryLoading) void fetchColorStory();
  };
  colorStoryOpenRef.current = colorStoryOpen;
  openColorStoryRef.current = openColorStory;

  const commitCoverUrl = () => {
    const trimmed = coverUrlValue.trim();
    if (trimmed && !trimmed.startsWith("http")) {
      setCoverUrlError(true);
      return;
    }
    updatePalette(palette.id, { coverUrl: trimmed || undefined });
    setCoverUrlOpen(false);
    setCoverUrlError(false);
  };

  const clearCoverUrl = () => {
    updatePalette(palette.id, { coverUrl: undefined });
    setCoverUrlValue("");
    setCoverUrlOpen(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      onMouseEnter={() => {
        isHoveredRef.current = true;
        if (!similarComputedRef.current) {
          similarComputedRef.current = true;
          const allPalettes = usePaletteStore.getState().palettes;
          const others = allPalettes.filter((p) => p.id !== palette.id && p.colors.length > 0);
          const scored = others
            .map((p) => ({ palette: p, avgDe: paletteDe(palette, p) }))
            .sort((a, b) => a.avgDe - b.avgDe)
            .slice(0, 3);
          setSimilarPalettes(scored);
        }
      }}
      onMouseLeave={() => { isHoveredRef.current = false; }}
      onClick={() => { if (onFocusCard) onFocusCard(palette.id); }}
      id={cardId}
      className={`group bg-[var(--surface)] rounded-[var(--radius)] border overflow-hidden hover:shadow-md transition-shadow duration-200 relative ${
        isHighlighted ? "border-sky-400 dark:border-sky-500 ring-2 ring-sky-300/70 dark:ring-sky-600/60 shadow-md" :
        isCover ? "border-amber-300 shadow-sm ring-1 ring-amber-200/60" :
        palette.frozen ? "border-indigo-200 dark:border-indigo-800/60 ring-1 ring-indigo-100/60 dark:ring-indigo-900/40" :
        isPinned ? "border-orange-200 dark:border-orange-800/60 ring-1 ring-orange-100/60 dark:ring-orange-900/30" :
        isSelected ? "border-[var(--accent)] shadow-sm" :
        (compareActive && !isCompareAnchor) ? "border-violet-200 dark:border-violet-800/50 ring-1 ring-violet-200/40 dark:ring-violet-800/30" :
        aging ? `border-[var(--border)] ${AGING_STYLES[aging.ageClass].border}` :
        "border-[var(--border)]"
      } ${isFocused ? "ring-2 ring-[var(--accent)]/40 shadow-md" : ""} ${className ?? ""}`}
    >
      {/* Selection checkbox */}
      {onSelect && (
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(palette.id); }}
          title={isSelected ? "Deselect" : "Select"}
          className={`absolute top-2 left-2 z-10 w-[18px] h-[18px] rounded-[3px] flex items-center justify-center transition-all duration-150 ${
            isSelected
              ? "bg-[var(--accent)] opacity-100"
              : selectionActive
              ? "bg-white/80 border border-white/60 opacity-100"
              : "bg-white/80 border border-white/60 opacity-0 group-hover:opacity-100"
          }`}
        >
          {isSelected && <Check size={11} className="text-[var(--accent-fg)]" />}
        </button>
      )}

      {/* Compare target badge — center-top hover pill when compare mode is active */}
      {compareActive && !isCompareAnchor && onCompare && (
        <button
          onClick={(e) => { e.stopPropagation(); onCompare(palette); }}
          title="Click or press C to compare with the anchored palette"
          className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shadow-sm transition-all duration-200 bg-violet-500/90 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 whitespace-nowrap"
        >
          <ArrowLeftRight size={9} className="shrink-0" />
          <span className="leading-none">compare</span>
        </button>
      )}

      {/* Cover crown badge */}
      {isCover && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-400 shadow-sm pointer-events-none">
          <Crown size={9} className="text-white fill-white" />
          <span className="text-[9px] font-bold text-white leading-none">cover</span>
        </div>
      )}

      {/* Pin badge — top-right when pinned and no cover badge */}
      {isPinned && !isCover && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-400/90 shadow-sm pointer-events-none">
          <Pin size={8} className="text-white fill-white" />
          <span className="text-[9px] font-bold text-white leading-none">pinned</span>
        </div>
      )}

      {/* Keyboard focus badge — small indicator when card has J/K focus */}
      {isFocused && (
        <div
          className={`absolute ${isCover || isPinned ? "top-8" : "top-2"} right-2 z-20 flex items-center justify-center w-[18px] h-[18px] rounded-full bg-[var(--accent)]/85 shadow-sm pointer-events-none`}
          title="Keyboard focused — J/K to navigate, E/H/C/etc. for actions, Esc to clear"
        >
          <Keyboard size={9} className="text-[var(--accent-fg)]" />
        </div>
      )}

      {/* Swatch strip */}
      <div className="relative">
        {palette.frozen ? (
          /* Frozen: static swatches, no drag, no edit */
          <div className={`flex ${isCover ? "h-40" : "h-28"}`}>
            {orderedColors.map((color, i) => {
              const isMatch = bestMatchIndex !== null && i === bestMatchIndex.idx;
              const isNameMatch = !isMatch && !!searchQuery && !!color.name && color.name.toLowerCase().includes(searchQuery.toLowerCase());
              const isNoteMatch = !isMatch && !isNameMatch && !!searchQuery && !!color.note && color.note.toLowerCase().includes(searchQuery.toLowerCase());
              const hasNote = !!color.note;
              return (
                <div
                  key={color._key}
                  style={{ flex: 1, position: "relative", backgroundColor: color.hex }}
                  className="group/swatch cursor-pointer"
                  onClick={() => handleSwatchCopy(color._key, color.hex)}
                  title={`${color.hex}${color.note ? ` · ${color.note}` : ""} — click to copy`}
                >
                  {isMatch && (
                    <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 0 3px rgba(255,255,255,0.85)" }} />
                  )}
                  {isNameMatch && (
                    <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 0 2px rgba(251,191,36,0.8)" }} />
                  )}
                  {isNoteMatch && (
                    <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 0 2px rgba(96,165,250,0.85)" }} />
                  )}
                  {/* Harmony anchor ring — pulses when harmony strip is hovered/clicked */}
                  {harmonyColors.length > 0 && harmonyAnchorHex && color.hex.toLowerCase() === harmonyAnchorHex.toLowerCase() && (harmonyHovered || harmonyAnchorFlash) && (
                    <div
                      className="absolute inset-0 pointer-events-none z-[3] transition-all duration-200"
                      style={{ boxShadow: harmonyAnchorFlash ? "inset 0 0 0 3px rgba(139,92,246,0.9)" : "inset 0 0 0 2px rgba(139,92,246,0.5)" }}
                    />
                  )}
                  {copiedSwatchKey === color._key && (
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div
                        className="rounded-full flex items-center justify-center w-[18px] h-[18px]"
                        style={{
                          backgroundColor: getContrastColor(color.hex) === "#fafaf8" ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.85)",
                          color: getContrastColor(color.hex),
                        }}
                      >
                        <Check size={9} />
                      </div>
                    </motion.div>
                  )}
                  {color.name && (
                    <div
                      className="absolute inset-x-0 bottom-0 flex items-end justify-center pb-1.5 group-hover/swatch:opacity-0 transition-opacity pointer-events-none"
                      style={{ color: getContrastColor(color.hex) }}
                    >
                      <span
                        className="text-[8px] font-semibold leading-none truncate max-w-[90%] text-center px-1 py-px rounded-[2px]"
                        style={{
                          backgroundColor: getContrastColor(color.hex) === "#fafaf8" ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0.38)",
                        }}
                      >
                        {color.name}
                      </span>
                    </div>
                  )}
                  <div
                    className="absolute inset-0 flex items-end justify-center pb-1.5 opacity-0 group-hover/swatch:opacity-100 transition-opacity pointer-events-none"
                    style={{ color: getContrastColor(color.hex) }}
                  >
                    <span className="text-[9px] font-mono font-bold tracking-wider">
                      {color.hex.slice(1).toUpperCase()}
                    </span>
                  </div>
                  {isMatch && bestMatchIndex && (
                    <div
                      className="absolute top-1.5 left-1.5 pointer-events-none px-1 py-px rounded text-[8px] font-bold leading-tight"
                      style={{
                        backgroundColor: getContrastColor(color.hex) === "#fafaf8" ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.6)",
                        color: getContrastColor(color.hex),
                      }}
                    >
                      ΔE {bestMatchIndex.dE.toFixed(1)}
                      <span className="hidden group-hover/swatch:inline"> · {getMatchTier(bestMatchIndex.dE).label}</span>
                    </div>
                  )}
                  {!isMatch && (
                    <button
                      className="absolute top-1 left-1 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover/swatch:opacity-100 transition-opacity hover:scale-110"
                      style={{
                        backgroundColor: getContrastColor(color.hex) === "#fafaf8" ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.45)",
                        color: getContrastColor(color.hex),
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onShadeScale(palette, i);
                      }}
                      title="Generate shade scale"
                    >
                      <Layers size={9} />
                    </button>
                  )}
                  {hasNote && (
                    <>
                      <div
                        className="absolute inset-x-1 top-7 flex justify-center opacity-0 group-hover/swatch:opacity-100 transition-opacity pointer-events-none"
                      >
                        <span
                          className="text-[7.5px] leading-snug font-medium text-center line-clamp-3 px-1 py-0.5 rounded-[3px] w-full"
                          style={{
                            backgroundColor: getContrastColor(color.hex) === "#fafaf8" ? "rgba(0,0,0,0.52)" : "rgba(255,255,255,0.72)",
                            color: getContrastColor(color.hex),
                          }}
                        >
                          {color.note}
                        </span>
                      </div>
                      <div
                        className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full pointer-events-none group-hover/swatch:opacity-0 transition-opacity"
                        style={{
                          backgroundColor: getContrastColor(color.hex) === "#fafaf8" ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.75)",
                        }}
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Unfrozen: drag-to-reorder with swatch editing */
          <Reorder.Group
            as="div"
            axis="x"
            values={orderedColors}
            onReorder={handleReorder}
            className={`flex ${isCover ? "h-40" : "h-28"}`}
            style={{ listStyle: "none", margin: 0, padding: 0 }}
          >
            {orderedColors.map((color, i) => {
              const isMatch = bestMatchIndex !== null && i === bestMatchIndex.idx;
              const isNameMatch = !isMatch && !!searchQuery && !!color.name && color.name.toLowerCase().includes(searchQuery.toLowerCase());
              const isNoteMatch = !isMatch && !isNameMatch && !!searchQuery && !!color.note && color.note.toLowerCase().includes(searchQuery.toLowerCase());
              const hasNote = !!color.note;
              return (
                <Reorder.Item
                  key={color._key}
                  value={color}
                  as="div"
                  style={{ flex: 1, position: "relative", backgroundColor: color.hex }}
                  className="group/swatch cursor-grab active:cursor-grabbing"
                  onDragEnd={handleDragEnd}
                  onClick={() => {
                    if (Date.now() - dragEndTimeRef.current > 250) {
                      handleSwatchCopy(color._key, color.hex);
                    }
                  }}
                  title={`${color.hex}${color.note ? ` · ${color.note}` : ""} — drag to reorder · click to copy`}
                  whileDrag={{ scale: 1.04, zIndex: 20, boxShadow: "0 4px 16px rgba(0,0,0,0.18)" }}
                >
                  {isMatch && (
                    <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 0 3px rgba(255,255,255,0.85)" }} />
                  )}
                  {isNameMatch && (
                    <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 0 2px rgba(251,191,36,0.8)" }} />
                  )}
                  {isNoteMatch && (
                    <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 0 2px rgba(96,165,250,0.85)" }} />
                  )}
                  {/* Harmony anchor ring — pulses when harmony strip is hovered/clicked */}
                  {harmonyColors.length > 0 && harmonyAnchorHex && color.hex.toLowerCase() === harmonyAnchorHex.toLowerCase() && (harmonyHovered || harmonyAnchorFlash) && (
                    <div
                      className="absolute inset-0 pointer-events-none z-[3] transition-all duration-200"
                      style={{ boxShadow: harmonyAnchorFlash ? "inset 0 0 0 3px rgba(139,92,246,0.9)" : "inset 0 0 0 2px rgba(139,92,246,0.5)" }}
                    />
                  )}
                  {copiedSwatchKey === color._key && (
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div
                        className="rounded-full flex items-center justify-center w-[18px] h-[18px]"
                        style={{
                          backgroundColor: getContrastColor(color.hex) === "#fafaf8" ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.85)",
                          color: getContrastColor(color.hex),
                        }}
                      >
                        <Check size={9} />
                      </div>
                    </motion.div>
                  )}
                  {color.name && (
                    <div
                      className="absolute inset-x-0 bottom-0 flex items-end justify-center pb-1.5 group-hover/swatch:opacity-0 transition-opacity pointer-events-none"
                      style={{ color: getContrastColor(color.hex) }}
                    >
                      <span
                        className="text-[8px] font-semibold leading-none truncate max-w-[90%] text-center px-1 py-px rounded-[2px]"
                        style={{
                          backgroundColor: getContrastColor(color.hex) === "#fafaf8" ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0.38)",
                        }}
                      >
                        {color.name}
                      </span>
                    </div>
                  )}
                  <div
                    className="absolute inset-0 flex items-end justify-center pb-1.5 opacity-0 group-hover/swatch:opacity-100 transition-opacity pointer-events-none"
                    style={{ color: getContrastColor(color.hex) }}
                  >
                    <span className="text-[9px] font-mono font-bold tracking-wider">
                      {color.hex.slice(1).toUpperCase()}
                    </span>
                  </div>
                  {isMatch && bestMatchIndex && (
                    <div
                      className="absolute top-1.5 left-1.5 pointer-events-none px-1 py-px rounded text-[8px] font-bold leading-tight"
                      style={{
                        backgroundColor: getContrastColor(color.hex) === "#fafaf8" ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.6)",
                        color: getContrastColor(color.hex),
                      }}
                    >
                      ΔE {bestMatchIndex.dE.toFixed(1)}
                      <span className="hidden group-hover/swatch:inline"> · {getMatchTier(bestMatchIndex.dE).label}</span>
                    </div>
                  )}
                  {!isMatch && (
                    <button
                      className="absolute top-1 left-1 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover/swatch:opacity-100 transition-opacity hover:scale-110"
                      style={{
                        backgroundColor: getContrastColor(color.hex) === "#fafaf8" ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.45)",
                        color: getContrastColor(color.hex),
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onShadeScale(palette, i);
                      }}
                      title="Generate shade scale"
                    >
                      <Layers size={9} />
                    </button>
                  )}
                  <button
                    className="absolute top-1 right-1 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover/swatch:opacity-100 transition-opacity hover:scale-110"
                    style={{
                      backgroundColor: getContrastColor(color.hex) === "#fafaf8" ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.45)",
                      color: getContrastColor(color.hex),
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditSwatch(palette, i);
                    }}
                    title="Edit color"
                  >
                    <Pencil size={9} />
                  </button>
                  {hasNote && (
                    <>
                      <div
                        className="absolute inset-x-1 top-7 flex justify-center opacity-0 group-hover/swatch:opacity-100 transition-opacity pointer-events-none"
                      >
                        <span
                          className="text-[7.5px] leading-snug font-medium text-center line-clamp-3 px-1 py-0.5 rounded-[3px] w-full"
                          style={{
                            backgroundColor: getContrastColor(color.hex) === "#fafaf8" ? "rgba(0,0,0,0.52)" : "rgba(255,255,255,0.72)",
                            color: getContrastColor(color.hex),
                          }}
                        >
                          {color.note}
                        </span>
                      </div>
                      <div
                        className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full pointer-events-none group-hover/swatch:opacity-0 transition-opacity"
                        style={{
                          backgroundColor: getContrastColor(color.hex) === "#fafaf8" ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.75)",
                        }}
                      />
                    </>
                  )}
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        )}

        {/* + Add swatch — right-edge overlay, hover-revealed, disabled on frozen/full palettes */}
        {!palette.frozen && palette.colors.length < 8 && (
          <button
            onClick={(e) => { e.stopPropagation(); addSwatchAndEdit(); }}
            title={`Add color (${palette.colors.length}/8)`}
            className={`absolute right-0 top-0 z-[5] flex items-center justify-center ${isCover ? "h-40" : "h-28"} w-8 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-black/20 hover:bg-black/50 backdrop-blur-[2px] border-l border-white/15 text-white/75 hover:text-white`}
          >
            <Plus size={13} />
          </button>
        )}

        {/* ✨ Color Story quick-access button — hover-revealed, centered at the bottom of the swatch strip */}
        <button
          onClick={(e) => { e.stopPropagation(); colorStoryOpen ? setColorStoryOpen(false) : openColorStory(); }}
          title="Color Story — AI vibe, product ideas & art prompt"
          className={`absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shadow transition-all duration-200 ${
            colorStoryOpen
              ? "bg-violet-500 text-white opacity-100 scale-100"
              : "bg-black/35 dark:bg-white/15 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 hover:bg-violet-500/80"
          }`}
        >
          {colorStoryLoading ? (
            <Loader2 size={9} className="animate-spin shrink-0" />
          ) : (
            <Sparkles size={9} className="shrink-0" />
          )}
          <span className="leading-none whitespace-nowrap">story</span>
        </button>

        {/* Frozen lock badge */}
        {palette.frozen && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/70 dark:bg-black/50 backdrop-blur-sm pointer-events-none">
            <Lock size={8} className="text-indigo-500 dark:text-indigo-400" />
            <span className="text-[8px] font-bold text-indigo-600 dark:text-indigo-300 leading-none uppercase tracking-wide">locked</span>
          </div>
        )}

        {/* Cover image thumbnail — coverUrl (user-set) takes priority; falls back to sourceImage (auto from extractor) */}
        {(palette.coverUrl || palette.sourceImage) && (() => {
          const src = palette.coverUrl ?? palette.sourceImage!;
          const isManual = !!palette.coverUrl;
          return (
            <div
              className="absolute bottom-2 right-2 z-10 group/coverimg cursor-pointer"
              onClick={(e) => { e.stopPropagation(); openCoverUrl(); }}
              title={isManual ? "Click to change or remove cover image" : "Extracted source image · Click to set a cover URL"}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt="Cover"
                className={`w-8 h-8 object-cover rounded-[4px] shadow-md transition-opacity group-hover/coverimg:opacity-75 ${
                  isManual
                    ? "border border-white/40"
                    : "border border-white/25 opacity-60 group-hover/coverimg:opacity-85"
                }`}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              {/* Subtle camera icon overlay for auto-extracted source images */}
              {!isManual && (
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-black/40 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
                  <svg width="7" height="7" viewBox="0 0 12 12" fill="none" className="text-white/80">
                    <path d="M1 4.5C1 3.95 1.45 3.5 2 3.5h1l1-1.5h4l1 1.5h1c.55 0 1 .45 1 1V9c0 .55-.45 1-1 1H2c-.55 0-1-.45-1-1V4.5z" fill="currentColor"/>
                    <circle cx="6" cy="6.5" r="1.5" fill="black" fillOpacity="0.5"/>
                  </svg>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Tone map — dual view: per-swatch sparkline (default) / 5-bin luminance histogram (hover) */}
      <div
        className="group/sparkline relative bg-[var(--surface-2)]/30 cursor-default overflow-hidden"
        style={{ height: 14 }}
        title={
          toneMap.isFlatTones
            ? `Tonal spread: ${toneMap.binLabels.map((l, i) => `${l} ${toneMap.bins[i]}`).join(" · ")} · All mid-tone — low contrast potential`
            : `Lightness profile · ${orderedColors.map((c) => { const rgb = hexToRgb(c.hex); return rgb ? `${rgbToHsl(rgb.r, rgb.g, rgb.b).l}%` : "?"; }).join(" · ")} · Hover for tonal spread`
        }
      >
        {/* Default: per-swatch bars (each bar = one swatch, height = lightness) */}
        <div className="absolute inset-0 flex items-end gap-[2px] px-2 group-hover/sparkline:opacity-0 transition-opacity duration-150 pointer-events-none">
          {orderedColors.map((color) => {
            const rgb = hexToRgb(color.hex);
            const l = rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b).l : 50;
            return (
              <div
                key={color._key}
                className="flex-1 rounded-t-[2px]"
                style={{ height: Math.max(2, Math.round((l / 100) * 11)), backgroundColor: color.hex, opacity: 0.72 }}
              />
            );
          })}
        </div>

        {/* Hover: 5-bin tonal histogram (grayscale bins showing tonal distribution) */}
        <div className="absolute inset-0 flex items-end px-2 gap-[3px] opacity-0 group-hover/sparkline:opacity-100 transition-opacity duration-150 pointer-events-none">
          {toneMap.bins.map((count, i) => {
            const binMidL = i * 20 + 10; // midpoint L for each bin: 10, 30, 50, 70, 90
            const heightPx = count === 0 ? 1 : Math.max(2, Math.round((count / toneMap.maxBin) * 11));
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end" style={{ height: "100%" }}>
                <div
                  className="w-full rounded-t-[2px]"
                  style={{ height: heightPx, backgroundColor: `hsl(0,0%,${binMidL}%)`, opacity: count === 0 ? 0.18 : 0.82 }}
                />
              </div>
            );
          })}
          {/* Amber dot when palette is flat-toned (no shadows or highlights) */}
          {toneMap.isFlatTones && (
            <div className="absolute right-1.5 top-1 w-1.5 h-1.5 rounded-full bg-amber-400" title="All mid-tone" />
          )}
        </div>
      </div>

      {/* oklch L-range gradient bar — dark→light span, always visible */}
      {oklchRange && (
        <div
          className="w-full"
          style={{
            height: 4,
            background: `linear-gradient(to right, ${oklchRange.darkest}, ${oklchRange.lightest})`,
            opacity: 0.65,
          }}
          title={`Lightness span (perceptual): L ${oklchRange.minL} → ${oklchRange.maxL} · ${oklchRange.range}pt range · wider = "Most varied"`}
        />
      )}

      {/* Harmony mini-preview — slides in on hover */}
      {harmonyColors.length > 0 && (
        <div
          className="overflow-hidden max-h-0 group-hover:max-h-9 transition-[max-height] duration-200 ease-out"
          onMouseEnter={() => setHarmonyHovered(true)}
          onMouseLeave={() => setHarmonyHovered(false)}
        >
          <div className="flex h-9 border-t border-[var(--border)]">
            {/* Label */}
            <div className="flex-shrink-0 flex flex-col items-center justify-center px-2 bg-[var(--surface-2)]/80 border-r border-[var(--border)]">
              <span className="text-[9px] font-semibold tracking-wider text-[var(--muted)]/70 uppercase select-none whitespace-nowrap leading-none">
                harmony
              </span>
              <span
                className={`text-[7px] font-semibold tracking-wide uppercase select-none whitespace-nowrap leading-none mt-0.5 transition-opacity duration-150 ${
                  harmonyHovered ? "text-violet-500/80 dark:text-violet-400/80 opacity-100" : "opacity-0"
                }`}
                title="Anchor swatch — the most-saturated color in this palette, from which harmony colors are derived"
              >
                src ↑
              </span>
            </div>
            {/* Derived color swatches */}
            {harmonyColors.map((hc) => (
              <div
                key={hc.hex}
                className="group/hc flex-1 relative cursor-pointer"
                style={{ backgroundColor: hc.hex }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(hc.hex);
                  setCopiedHarmonyHex(hc.hex);
                  setTimeout(() => setCopiedHarmonyHex(null), 800);
                  // Flash the source swatch (most-saturated color)
                  if (harmonyAnchorHex) {
                    setHarmonyAnchorFlash(true);
                    setTimeout(() => setHarmonyAnchorFlash(false), 1300);
                  }
                }}
                title={`${hc.label} · ${hc.hex} — click to copy · highlights source swatch`}
              >
                <div
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/hc:opacity-100 transition-opacity pointer-events-none"
                  style={{ color: getContrastColor(hc.hex) }}
                >
                  <span className="text-[8px] font-mono font-bold tracking-tight leading-none">
                    {hc.hex.slice(1).toUpperCase()}
                  </span>
                </div>
                {copiedHarmonyHex === hc.hex && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div
                      className="rounded-full flex items-center justify-center w-[18px] h-[18px]"
                      style={{
                        backgroundColor: getContrastColor(hc.hex) === "#fafaf8" ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.85)",
                        color: getContrastColor(hc.hex),
                      }}
                    >
                      <Check size={9} />
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
            {/* Fork to palette button */}
            <button
              onClick={handleForkHarmony}
              title="Fork harmony colors to new palette"
              className={`flex-shrink-0 flex items-center justify-center w-9 h-9 border-l border-[var(--border)] transition-colors ${
                forkedHarmony
                  ? "bg-emerald-50 dark:bg-emerald-900/20"
                  : "bg-[var(--surface-2)]/80 hover:bg-[var(--accent)] hover:text-[var(--accent-fg)]"
              }`}
            >
              {forkedHarmony
                ? <Check size={11} className="text-emerald-500 dark:text-emerald-400" />
                : <Plus size={11} className="text-[var(--muted)]" />
              }
            </button>
          </div>
        </div>
      )}

      {/* Similar palettes — slides in on hover, computed lazily on first hover */}
      {similarPalettes.length > 0 && (
        <div className="overflow-hidden max-h-0 group-hover:max-h-10 transition-[max-height] duration-200 ease-out">
          <div className="flex h-10 border-t border-[var(--border)]">
            <div className="flex-shrink-0 flex items-center px-2 bg-[var(--surface-2)]/80 border-r border-[var(--border)]">
              <span className="text-[9px] font-semibold tracking-wider text-[var(--muted)]/70 uppercase select-none whitespace-nowrap">
                similar
              </span>
            </div>
            {similarPalettes.map(({ palette: sim, avgDe }) => {
              const simTier = getMatchTier(avgDe);
              return (
                <button
                  key={sim.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (e.shiftKey) {
                      onExport(sim);
                      return;
                    }
                    const el = document.getElementById(sim.id);
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  title={`${sim.name} · ΔE ${avgDe.toFixed(1)} (${simTier.label}) — click to jump · Shift+click to export`}
                  className="group/sim flex-1 flex overflow-hidden border-r border-[var(--border)] last:border-r-0 relative hover:opacity-80 transition-opacity"
                >
                  {sim.colors.map((c, ci) => (
                    <div key={ci} style={{ flex: 1, backgroundColor: c.hex }} />
                  ))}
                  {/* ΔE badge — tier-colored: emerald < 5, sky < 10, amber < 15, rose ≥ 15 */}
                  <div className="absolute top-1 left-1 pointer-events-none">
                    <span className={`text-[7px] font-bold leading-none px-[3px] py-[1px] rounded-[2px] tabular-nums ${simTier.overlay}`}>
                      ΔE {avgDe.toFixed(1)}
                    </span>
                  </div>
                  {/* Name tooltip — slides in on hover at bottom, delayed 200ms to prevent flicker on fast hover-throughs */}
                  <div className="absolute inset-0 flex items-end justify-center pb-1 opacity-0 group-hover/sim:opacity-100 transition-opacity delay-200 pointer-events-none">
                    <span className="text-[7px] font-medium leading-tight text-center truncate max-w-[90%] px-1 py-0.5 rounded-[2px] bg-black/50 text-white">
                      {sim.name}
                    </span>
                  </div>
                  {/* Shift+click hint — top-right on hover */}
                  <div className="absolute top-1 right-1 opacity-0 group-hover/sim:opacity-100 transition-opacity delay-200 pointer-events-none">
                    <span className="text-[6px] font-mono font-bold bg-black/55 text-white/90 rounded px-[2px] py-[1px] leading-none">⇧E</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Info row */}
      <div className="px-3 py-2.5 flex items-center justify-between">
        <div className="min-w-0">
          {inlineEditing ? (
            <input
              ref={inlineInputRef}
              type="text"
              value={inlineNameValue}
              onChange={(e) => setInlineNameValue(e.target.value)}
              onBlur={commitInlineEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); commitInlineEdit(); }
                if (e.key === "Escape") { e.preventDefault(); cancelInlineEdit(); }
              }}
              className="w-full text-sm font-medium bg-[var(--surface-2)] border border-[var(--accent)] rounded-[var(--radius-sm)] px-1.5 py-0.5 outline-none transition-colors"
              maxLength={80}
              spellCheck={false}
            />
          ) : (
            <div className={`flex items-center gap-1.5 min-w-0 rounded-[3px] ${searchQuery && palette.name.toLowerCase().includes(searchQuery.toLowerCase()) ? "bg-yellow-50 dark:bg-yellow-900/20 px-1 -mx-1" : ""}`}>
              {isPinned && <Pin size={9} className="text-orange-400 dark:text-orange-500 flex-shrink-0 fill-orange-100 dark:fill-orange-900/40" />}
              {palette.frozen && <Lock size={10} className="text-indigo-400 dark:text-indigo-500 flex-shrink-0" />}
              <div
                className={`text-sm font-medium truncate select-none${!palette.frozen ? " hover:underline decoration-dashed underline-offset-2" : ""}`}
                style={{ cursor: palette.frozen ? "default" : "text" }}
                onDoubleClick={palette.frozen ? undefined : startInlineEdit}
                title={palette.frozen ? "Unlock to rename" : "Double-click to rename"}
              >
                {highlightMatch(palette.name, searchQuery)}
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1 mt-0.5">
            <span className="text-xs text-[var(--muted)]">{palette.colors.length} colors</span>
            {lightnessRange && (
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-medium tabular-nums bg-[var(--surface-2)] text-[var(--muted)]"
                title={`Lightness range: L ${lightnessRange.min}% (darkest) to L ${lightnessRange.max}% (lightest)`}
              >
                L: {lightnessRange.min}–{lightnessRange.max}
              </span>
            )}
            {palette.frozen && (
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300 flex items-center gap-0.5"
                title="Palette is locked"
              >
                <Lock size={8} className="flex-shrink-0" />
                Locked
              </span>
            )}
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${moodStyle.bg} ${moodStyle.text}`}
              title={`Dominant mood: ${moodStyle.label}`}
            >
              {moodStyle.label}
            </span>
            {/* Hue family dot — warm (amber) / cool (sky) / neutral (zinc) */}
            <span
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${hueFamilyStyle.bg} ${hueFamilyStyle.text}`}
              title={`Hue family: ${hueFamilyStyle.label} · ${hueFamily === "warm" ? "reds/oranges/yellows dominate" : hueFamily === "cool" ? "teals/blues/purples dominate" : "mixed or achromatic"}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${hueFamilyStyle.dot}`} />
              {hueFamilyStyle.label}
            </span>
            {gamutClippedCount > 0 && (
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 tabular-nums"
                title={`${gamutClippedCount} of ${palette.colors.length} color${palette.colors.length !== 1 ? "s" : ""} fall outside sRGB gamut — displayed as nearest clipped color`}
              >
                {gamutClippedCount} clipped
              </span>
            )}
            {printRisk.vivid === 0 && printRisk.moderate > 0 ? (
              /* Caution-only: split pill — left opens overlay, right mutes all caution → safe */
              <div className="flex items-center rounded overflow-hidden text-[10px] font-medium tabular-nums bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                <button
                  onClick={() => {
                    setPrintCheckOpen((v) => {
                      if (!v) {
                        setTagging(false);
                        setNotesOpen(false);
                        setVariationsOpen(false);
                        setCoverUrlOpen(false);
                      }
                      return !v;
                    });
                  }}
                  className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-orange-200/60 dark:hover:bg-orange-800/30 transition-colors"
                  title={`${printRisk.moderate} caution swatch${printRisk.moderate !== 1 ? "es" : ""} (oklch C 0.12–0.25) — click to review`}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-orange-400" />
                  {printRisk.moderate} caution
                </button>
                <div className="self-stretch w-px bg-orange-200 dark:bg-orange-700/50 shrink-0" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    muteAllCaution();
                  }}
                  title="One-click: clamp all caution swatches to C=0.12 (print-safe) — no overlay needed"
                  className="flex items-center gap-0.5 px-1.5 py-0.5 hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 transition-colors font-semibold"
                >
                  {cautionMutedAll
                    ? <Check size={8} className="text-emerald-600 dark:text-emerald-400" />
                    : <span className="leading-none">→ safe</span>
                  }
                </button>
              </div>
            ) : (printRisk.vivid > 0 && printRisk.moderate > 0) ? (
              /* Mixed: vivid + caution — split pill: left opens overlay, right quick-mutes caution */
              <div className="flex items-center rounded overflow-hidden text-[10px] font-medium tabular-nums bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                <button
                  onClick={() => {
                    setPrintCheckOpen((v) => {
                      if (!v) {
                        setTagging(false);
                        setNotesOpen(false);
                        setVariationsOpen(false);
                        setCoverUrlOpen(false);
                      }
                      return !v;
                    });
                  }}
                  className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-rose-200/60 dark:hover:bg-rose-800/30 transition-colors"
                  title={`${printRisk.vivid} vivid swatch${printRisk.vivid !== 1 ? "es" : ""} + ${printRisk.moderate} caution — click to review`}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-rose-500" />
                  {printRisk.vivid}v · {printRisk.moderate}c
                </button>
                <div className="self-stretch w-px bg-rose-200 dark:bg-rose-700/50 shrink-0" />
                <button
                  onClick={(e) => { e.stopPropagation(); muteAllCaution(); }}
                  title="One-click: clamp all caution swatches to C=0.12 — vivid swatches still need review"
                  className="flex items-center gap-0.5 px-1.5 py-0.5 hover:bg-orange-100 hover:text-orange-700 dark:hover:bg-orange-900/30 dark:hover:text-orange-400 transition-colors font-semibold"
                >
                  {cautionMutedAll
                    ? <Check size={8} className="text-emerald-600 dark:text-emerald-400" />
                    : <span className="leading-none">→ caution</span>
                  }
                </button>
              </div>
            ) : (printRisk.vivid > 0) ? (
              /* Vivid only: single rose button */
              <button
                onClick={() => {
                  setPrintCheckOpen((v) => {
                    if (!v) {
                      setTagging(false);
                      setNotesOpen(false);
                      setVariationsOpen(false);
                    }
                    return !v;
                  });
                }}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium tabular-nums transition-opacity hover:opacity-80 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                title="Click to see print risk details"
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-rose-500" />
                {printRisk.vivid} print risk
              </button>
            ) : palette.colors.length > 0 && (
              <button
                onClick={() => {
                  setPrintCheckOpen((v) => {
                    if (!v) {
                      setTagging(false);
                      setNotesOpen(false);
                      setVariationsOpen(false);
                    }
                    return !v;
                  });
                }}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 transition-opacity hover:opacity-80"
                title="All swatches print-safe (oklch C ≤ 0.12) · Click to confirm"
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-400" />
                print safe
              </button>
            )}
            {colorMatchHex && bestMatchIndex && (() => {
              const tier = getMatchTier(bestMatchIndex.dE);
              return (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums ${tier.bg} ${tier.text}`}
                  title={`Best color match: ΔE ${bestMatchIndex.dE.toFixed(1)} (${tier.label}) — lower is closer`}
                >
                  ΔE {bestMatchIndex.dE.toFixed(1)}
                </span>
              );
            })()}
            {freshness && (
              <span
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${freshness.bgClass} ${freshness.textClass}`}
                style={{ opacity: freshness.opacity }}
                title={`${freshness.isEdited ? "Edited" : "Created"} ${formatDate(freshness.isEdited ? palette.updatedAt : palette.createdAt)}`}
              >
                {freshness.isEdited && <Pencil size={7} className="flex-shrink-0" />}
                {freshness.label}
              </span>
            )}
            {!freshness && aging && (
              <span
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] ${AGING_STYLES[aging.ageClass].badge}`}
                title={`Last touched ${aging.formattedDate} · ${Math.floor(aging.days)} days ago — consider reviewing`}
              >
                <Clock size={8} className="flex-shrink-0 opacity-70" />
                {aging.label}
              </span>
            )}
            {palette.collectionId && (
              <span className="group/col-badge inline-flex items-center rounded overflow-hidden bg-[var(--surface-2)] text-[10px] text-[var(--muted)]">
                {onJumpToCollection ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); onJumpToCollection(palette.collectionId!); }}
                    title={`Jump to ${collectionName ?? "collection"}${collectionSize !== undefined ? ` · ${collectionSize} palette${collectionSize !== 1 ? "s" : ""}` : ""}`}
                    className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-[var(--accent)] hover:text-[var(--accent-fg)] transition-colors"
                  >
                    <span className="max-w-[90px] truncate">{collectionName ?? "in collection"}</span>
                    {collectionSize !== undefined && collectionSize > 1 && (
                      <span className="opacity-50 tabular-nums shrink-0">{collectionSize}</span>
                    )}
                  </button>
                ) : (
                  <span className="flex items-center gap-1 px-1.5 py-0.5">
                    <span className="max-w-[110px] truncate">{collectionName ?? "in collection"}</span>
                    {collectionSize !== undefined && collectionSize > 1 && (
                      <span className="opacity-50 tabular-nums shrink-0">{collectionSize}</span>
                    )}
                  </span>
                )}
                {onClearCollection && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onClearCollection(); }}
                    title="Remove from collection"
                    className="px-1 py-0.5 opacity-0 group-hover/col-badge:opacity-100 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-all leading-none"
                  >
                    ×
                  </button>
                )}
              </span>
            )}
            {palette.tags?.map((tag) => {
              const isActiveFilter = !!activeTags?.includes(tag);
              if (onFilterByTag) {
                const baseClass =
                  tag === "trend"
                    ? isActiveFilter
                      ? "bg-rose-200 text-rose-700 ring-1 ring-rose-400 dark:bg-rose-900/60 dark:text-rose-300 dark:ring-rose-600"
                      : "bg-rose-100 text-rose-600 hover:opacity-75 dark:bg-rose-900/30 dark:text-rose-400"
                    : tag === "shared"
                    ? isActiveFilter
                      ? "bg-sky-200 text-sky-700 ring-1 ring-sky-400 dark:bg-sky-900/60 dark:text-sky-300 dark:ring-sky-600"
                      : "bg-sky-100 text-sky-600 hover:opacity-75 dark:bg-sky-900/30 dark:text-sky-400"
                    : tag === "harmony"
                    ? isActiveFilter
                      ? "bg-emerald-200 text-emerald-700 ring-1 ring-emerald-400 dark:bg-emerald-900/60 dark:text-emerald-300 dark:ring-emerald-600"
                      : "bg-emerald-100 text-emerald-600 hover:opacity-75 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : tag === "shades"
                    ? isActiveFilter
                      ? "bg-stone-200 text-stone-700 ring-1 ring-stone-400 dark:bg-stone-900/60 dark:text-stone-300 dark:ring-stone-600"
                      : "bg-stone-100 text-stone-600 hover:opacity-75 dark:bg-stone-900/30 dark:text-stone-400"
                    : isActiveFilter
                    ? "bg-[var(--accent)]/15 text-[var(--accent)] ring-1 ring-[var(--accent)]/60 font-semibold"
                    : "bg-[var(--surface-2)] text-[var(--muted)] hover:opacity-75";
                return (
                  <button
                    key={tag}
                    onClick={(e) => { e.stopPropagation(); onFilterByTag(tag); }}
                    title={isActiveFilter ? `Clear "${tag}" filter` : `Filter library by "${tag}"`}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all cursor-pointer ${baseClass}`}
                  >
                    {tag}
                  </button>
                );
              }
              return (
                <span
                  key={tag}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    tag === "trend"
                      ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                      : tag === "shared"
                      ? "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
                      : tag === "harmony"
                      ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : tag === "shades"
                      ? "bg-stone-100 text-stone-600 dark:bg-stone-900/30 dark:text-stone-400"
                      : "bg-[var(--surface-2)] text-[var(--muted)]"
                  }`}
                >
                  {tag}
                </span>
              );
            })}
            {cachedColorStory && !colorStoryOpen && (
              <span
                title="Color story ready — press S or click ✨ to view"
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-50 text-violet-500 dark:bg-violet-950/30 dark:text-violet-400 cursor-default select-none"
              >
                <Sparkles size={8} className="shrink-0" />
                story
              </span>
            )}
            {a11yBadge && (
              onContrast ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onContrast(palette); }}
                  title={`WCAG ${a11yBadge.level} — best contrast ${a11yBadge.ratio.toFixed(1)}:1 · click for full contrast matrix`}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium select-none transition-opacity hover:opacity-80 ${
                    a11yBadge.level === "AA"
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                      : "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
                  }`}
                >
                  <ShieldCheck size={8} className="shrink-0" />
                  {a11yBadge.level}
                </button>
              ) : (
                <span
                  title={`WCAG ${a11yBadge.level} — best contrast ${a11yBadge.ratio.toFixed(1)}:1 between ${a11yBadge.pair[0]} and ${a11yBadge.pair[1]}`}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium cursor-default select-none ${
                    a11yBadge.level === "AA"
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                      : "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
                  }`}
                >
                  <ShieldCheck size={8} className="shrink-0" />
                  {a11yBadge.level}
                </span>
              )
            )}
          </div>
          {inlineNotesEditing ? (
            <div className="mt-1.5">
              <textarea
                ref={inlineNotesRef}
                value={inlineNotesValue}
                onChange={(e) => setInlineNotesValue(e.target.value)}
                onBlur={commitInlineNotes}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitInlineNotes(); }
                  if (e.key === "Escape") { e.preventDefault(); cancelInlineNotes(); }
                }}
                placeholder="Add a creative note…"
                className="w-full text-[10px] bg-[var(--surface-2)] border border-[var(--accent)] rounded-[var(--radius-sm)] px-2 py-1.5 outline-none transition-colors placeholder:text-[var(--muted)] resize-none leading-relaxed"
                rows={2}
                maxLength={280}
                spellCheck
              />
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-[9px] text-[var(--muted)]">Enter to save · Shift+Enter newline · Esc cancel</p>
                <span className="text-[9px] text-[var(--muted)] tabular-nums">
                  {inlineNotesValue.trim() ? `${inlineNotesValue.trim().split(/\s+/).length}w · ` : ""}{inlineNotesValue.length}/280
                </span>
              </div>
            </div>
          ) : palette.notes ? (() => {
            const excerpt = searchQuery ? getNoteExcerpt(palette.notes, searchQuery) : null;
            if (excerpt) {
              return (
                <div
                  className="flex items-start gap-1.5 mt-1.5 px-2 py-1.5 rounded-[var(--radius-sm)] bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200/60 dark:border-yellow-700/40 cursor-text group/noteinline"
                  onClick={openInlineNotes}
                  title="Click to edit note"
                >
                  <StickyNote size={9} className="text-yellow-500 dark:text-yellow-400 mt-0.5 flex-shrink-0 fill-yellow-100 dark:fill-yellow-900/40" />
                  <p className="text-[10px] text-[var(--fg)] leading-snug min-w-0 break-words">
                    {excerpt.truncStart && <span className="text-[var(--muted)]">…</span>}
                    {excerpt.prefix}
                    <mark className="bg-yellow-200 dark:bg-yellow-800/60 text-inherit rounded-[2px] not-italic px-[1px]">
                      {excerpt.match}
                    </mark>
                    {excerpt.suffix}
                    {excerpt.truncEnd && <span className="text-[var(--muted)]">…</span>}
                  </p>
                </div>
              );
            }
            const noteWordCount = palette.notes.trim().split(/\s+/).filter(Boolean).length;
            return (
              <div
                className="flex items-end gap-1.5 mt-1 cursor-text"
                title="Click to edit note"
                onClick={openInlineNotes}
              >
                <p className="text-[10px] italic text-[var(--muted)] line-clamp-2 leading-snug select-none hover:text-[var(--fg)] transition-colors flex-1 min-w-0">
                  {highlightMatch(palette.notes, searchQuery)}
                </p>
                <span
                  className="text-[9px] text-[var(--muted)]/50 shrink-0 tabular-nums leading-none mb-px"
                  title={`${noteWordCount} word${noteWordCount !== 1 ? "s" : ""}`}
                >
                  {noteWordCount}w
                </span>
              </div>
            );
          })() : (
            <p
              className="text-[9px] italic text-[var(--muted)]/0 group-hover:text-[var(--muted)]/40 mt-1 leading-snug cursor-text select-none transition-colors"
              onClick={openInlineNotes}
              title="Click to add a note"
            >
              Add a note…
            </p>
          )}
          {searchQuery && (() => {
            const nameMatches = palette.colors.filter(
              (c) => c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            if (!nameMatches.length) return null;
            return (
              <div className="flex items-start gap-1.5 mt-1.5 px-2 py-1.5 rounded-[var(--radius-sm)] bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-700/40">
                <Tag size={9} className="text-amber-500 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-[var(--fg)] leading-snug min-w-0">
                  {nameMatches.slice(0, 3).map((c, i) => (
                    <span key={c.hex + i}>
                      {i > 0 && <span className="text-[var(--muted)] mx-1">·</span>}
                      {highlightMatch(c.name!, searchQuery)}
                    </span>
                  ))}
                  {nameMatches.length > 3 && (
                    <span className="text-[var(--muted)] ml-1">+{nameMatches.length - 3}</span>
                  )}
                </p>
              </div>
            );
          })()}
          {searchQuery && (() => {
            const noteMatches = palette.colors.filter(
              (c) => c.note && c.note.toLowerCase().includes(searchQuery.toLowerCase())
            );
            if (!noteMatches.length) return null;
            return (
              <div className="flex items-start gap-1.5 mt-1.5 px-2 py-1.5 rounded-[var(--radius-sm)] bg-blue-50 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-700/40">
                <StickyNote size={9} className="text-blue-400 dark:text-blue-300 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-[var(--fg)] leading-snug min-w-0">
                  {noteMatches.slice(0, 2).map((c, i) => (
                    <span key={c.hex + i}>
                      {i > 0 && <span className="text-[var(--muted)] mx-1">·</span>}
                      {highlightMatch(c.note!, searchQuery)}
                    </span>
                  ))}
                  {noteMatches.length > 2 && (
                    <span className="text-[var(--muted)] ml-1">+{noteMatches.length - 2}</span>
                  )}
                </p>
              </div>
            );
          })()}
        </div>

        {/* Keyboard shortcut hints — fade in on card hover to surface the keyboard API */}
        <div className="flex items-center gap-2 px-3 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none select-none">
          {([
            { key: "E", label: "export" },
            { key: "H", label: "harmony" },
            { key: "D", label: "dup" },
            { key: "C", label: "compare" },
            { key: "L", label: "lock" },
            { key: "⇧S", label: "snapshot" },
            { key: "?", label: "all" },
          ] as const).map(({ key, label }) => (
            <span key={key} className="flex items-center gap-0.5">
              <kbd className="inline-flex items-center justify-center min-w-[14px] h-[13px] px-[3px] rounded text-[7px] font-mono font-bold bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] shadow-[0_1px_0_0_var(--border)] leading-none">{key}</kbd>
              <span className="text-[7px] text-[var(--muted)]/55 leading-none">{label}</span>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNameWithAI}
            title="Name with AI"
            disabled={naming.type === "loading"}
          >
            {naming.type === "loading" ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Wand2 size={13} />
            )}
          </Button>
          <Button
            variant={colorStoryOpen ? "outline" : "ghost"}
            size="sm"
            onClick={colorStoryOpen ? () => setColorStoryOpen(false) : openColorStory}
            title="Color Story — AI vibe, product ideas & art prompt"
            className={colorStoryOpen ? "text-violet-500 border-violet-300 dark:border-violet-700" : ""}
          >
            {colorStoryLoading ? (
              <Loader2 size={13} className="animate-spin text-violet-400" />
            ) : (
              <Sparkles size={13} />
            )}
          </Button>
          <Button
            variant={swatchNaming === "done" ? "outline" : "ghost"}
            size="sm"
            onClick={handleNameSwatches}
            disabled={swatchNaming === "loading"}
            title={
              swatchNaming === "done"
                ? "Swatches named!"
                : swatchNaming === "error"
                ? "Naming failed — try again"
                : "Name all swatches with AI"
            }
            className={swatchNaming === "done" ? "text-green-600 border-green-300 dark:text-green-400 dark:border-green-700" : swatchNaming === "error" ? "text-rose-500" : ""}
          >
            {swatchNaming === "loading" ? (
              <Loader2 size={13} className="animate-spin" />
            ) : swatchNaming === "done" ? (
              <Check size={13} />
            ) : (
              <Tags size={13} />
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onHarmony(palette)} title="Harmony view">
            <Eye size={13} />
          </Button>
          <Button
            variant={variationsOpen ? "outline" : "ghost"}
            size="sm"
            onClick={variationsOpen ? () => setVariationsOpen(false) : openVariations}
            title="Generate palette variations"
          >
            <Shuffle size={13} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onRename(palette)} title="Rename">
            <Edit2 size={13} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onAssignCollection(palette)} title="Add to collection">
            <FolderOpen size={13} />
          </Button>
          {/* Fork to collection — only shown when palette is in a collection and other collections exist */}
          {palette.collectionId && (() => {
            const otherCollections = collections.filter((c) => c.id !== palette.collectionId);
            if (otherCollections.length === 0) return null;
            return (
              <div className="relative" ref={forkContainerRef}>
                <Button
                  variant={forkCollectionOpen ? "outline" : "ghost"}
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setForkCollectionOpen((v) => !v); }}
                  title="Fork to another collection — duplicate this palette into a different collection"
                  className={forkedToCollectionName ? "text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-700" : ""}
                >
                  {forkedToCollectionName ? <Check size={13} /> : <GitFork size={13} />}
                </Button>
                <AnimatePresence>
                  {forkCollectionOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.97 }}
                      transition={{ duration: 0.12 }}
                      className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] shadow-lg overflow-hidden min-w-[140px] max-w-[200px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-2 py-1.5 border-b border-[var(--border)]">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted)]">Fork to collection</p>
                      </div>
                      <div className="py-0.5 max-h-40 overflow-y-auto">
                        {otherCollections.map((col) => (
                          <button
                            key={col.id}
                            onClick={() => handleForkToCollection(col.id, col.name)}
                            className="w-full text-left px-3 py-1.5 text-[11px] text-[var(--fg)] hover:bg-[var(--surface-2)] transition-colors flex items-center gap-1.5"
                            title={`Duplicate into "${col.name}"`}
                          >
                            <FolderOpen size={9} className="text-[var(--muted)] shrink-0" />
                            <span className="truncate">{col.name}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })()}
          <Button
            variant={tagging ? "outline" : "ghost"}
            size="sm"
            onClick={tagging ? closeTagging : openTagging}
            title="Manage tags"
          >
            <Tag size={13} />
          </Button>
          <Button
            variant={coverUrlOpen || palette.coverUrl ? "outline" : "ghost"}
            size="sm"
            onClick={coverUrlOpen ? () => setCoverUrlOpen(false) : openCoverUrl}
            title={palette.coverUrl ? "Change or remove cover image URL" : "Set cover image from URL"}
            className={palette.coverUrl ? "text-[var(--accent)] border-[var(--accent)]/40" : ""}
          >
            <ImageIcon size={13} />
          </Button>
          <Button
            variant={notesOpen || palette.notes ? "outline" : "ghost"}
            size="sm"
            onClick={notesOpen ? commitNotes : openNotes}
            title={palette.notes ? "Edit note" : "Add note"}
          >
            <StickyNote size={13} className={palette.notes ? "fill-yellow-200 dark:fill-yellow-900 text-yellow-600 dark:text-yellow-400" : ""} />
          </Button>
          <Button
            variant={printCheckOpen ? "outline" : "ghost"}
            size="sm"
            onClick={() => {
              setPrintCheckOpen((v) => {
                if (!v) {
                  setTagging(false);
                  setNotesOpen(false);
                  setVariationsOpen(false);
                  setCoverUrlOpen(false);
                  setColorStoryOpen(false);
                }
                return !v;
              });
            }}
            title={
              printRisk.vivid > 0
                ? `Print-safe check · ${printRisk.vivid} vivid, ${printRisk.moderate} caution`
                : printRisk.moderate > 0
                ? `Print-safe check · ${printRisk.moderate} caution`
                : "Print-safe check · All safe"
            }
            className={printCheckOpen || printRisk.vivid > 0
              ? "text-rose-500 dark:text-rose-400"
              : printRisk.moderate > 0
              ? "text-orange-500 dark:text-orange-400"
              : ""}
          >
            <span className="relative inline-flex items-center justify-center">
              <Printer size={13} />
              <span
                className={`absolute -top-[3px] -right-[4px] w-[6px] h-[6px] rounded-full border border-[var(--surface)] ${
                  printRisk.vivid > 0
                    ? "bg-rose-500"
                    : printRisk.moderate > 0
                    ? "bg-orange-400"
                    : "bg-emerald-400"
                }`}
              />
            </span>
          </Button>
          <Button
            variant={cvdExported ? "outline" : "ghost"}
            size="sm"
            onClick={() => {
              exportAsCvdStrip(palette, "deuteranopia");
              setCvdExported(true);
              setTimeout(() => setCvdExported(false), 1800);
            }}
            title="Quick-export CVD preview: V Deuteranopia · ⇧V Protanopia · ⌥V Tritanopia"
            className={cvdExported ? "text-sky-600 border-sky-300 dark:text-sky-400 dark:border-sky-700" : ""}
          >
            {cvdExported ? <Check size={13} className="text-sky-500" /> : <Glasses size={13} />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onExport(palette)} title="Export">
            <Download size={13} />
          </Button>
          <Button
            variant={duplicated ? "outline" : "ghost"}
            size="sm"
            onClick={handleDuplicate}
            title="Duplicate palette"
          >
            {duplicated ? <Check size={13} className="text-green-500" /> : <CopyPlus size={13} />}
          </Button>
          {onCompare && (
            <Button
              variant={isCompareAnchor ? "outline" : "ghost"}
              size="sm"
              onClick={() => onCompare(palette)}
              title={isCompareAnchor ? "Comparing — click another palette to compare" : "Compare with another palette"}
              className={isCompareAnchor ? "border-violet-400 text-violet-600 dark:text-violet-400" : ""}
            >
              <ArrowLeftRight size={13} className={isCompareAnchor ? "text-violet-600 dark:text-violet-400" : ""} />
            </Button>
          )}
          {onPin && (
            <Button
              variant={isPinned ? "outline" : "ghost"}
              size="sm"
              onClick={() => onPin(palette)}
              title={isPinned ? "Unpin — remove from top" : "Pin to top of library (P)"}
              className={isPinned ? "text-orange-500 border-orange-300 dark:border-orange-700" : ""}
            >
              <Pin size={13} className={isPinned ? "fill-orange-200 dark:fill-orange-900/40 text-orange-500" : ""} />
            </Button>
          )}
          {onSetCover && (
            <Button
              variant={isCover ? "outline" : "ghost"}
              size="sm"
              onClick={() => onSetCover(palette)}
              title={isCover ? "Remove as collection cover" : "Set as collection cover"}
              className={isCover ? "text-amber-500 border-amber-300" : ""}
            >
              <Crown size={13} className={isCover ? "fill-amber-400 text-amber-500" : ""} />
            </Button>
          )}
          {/* Snapshot history — save + restore color checkpoints */}
          {!palette.frozen && (
            <div className="relative" ref={snapshotContainerRef}>
              <Button
                variant={snapshotOpen ? "outline" : "ghost"}
                size="sm"
                onClick={(e) => { e.stopPropagation(); setSnapshotOpen((v) => !v); }}
                title={
                  snapshotRestored
                    ? "Colors restored!"
                    : (palette.snapshots?.length ?? 0) > 0
                    ? `Version history · ${palette.snapshots!.length} snapshot${palette.snapshots!.length === 1 ? "" : "s"} saved · ⇧S to save instantly`
                    : "Version history — save color checkpoints · ⇧S to save instantly"
                }
                className={
                  snapshotRestored
                    ? "text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-700"
                    : snapshotOpen
                    ? ""
                    : ""
                }
              >
                <span className="relative inline-flex items-center justify-center">
                  {snapshotRestored ? (
                    <Check size={13} className="text-emerald-500" />
                  ) : (
                    <Clock size={13} />
                  )}
                  {!snapshotRestored && (palette.snapshots?.length ?? 0) > 0 && (
                    <span className="absolute -top-[3px] -right-[4px] w-[6px] h-[6px] rounded-full bg-violet-500 border border-[var(--surface)]" />
                  )}
                </span>
              </Button>
              <AnimatePresence>
                {snapshotOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.12 }}
                    className="absolute bottom-full mb-1.5 right-0 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] shadow-lg overflow-hidden w-56"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Header + save button */}
                    <div className="px-2.5 py-2 border-b border-[var(--border)] flex items-center justify-between gap-2">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted)]">Version History</p>
                      <button
                        onClick={handleSaveSnapshot}
                        className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-[3px] transition-colors ${
                          snapshotSaved
                            ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
                            : "text-[var(--accent)] hover:bg-[var(--accent)]/10"
                        }`}
                        title="Save a snapshot of the current colors"
                        disabled={(palette.snapshots?.length ?? 0) >= 5}
                      >
                        {snapshotSaved ? <Check size={10} /> : <Plus size={10} />}
                        <span>{snapshotSaved ? "Saved" : "Save snapshot"}</span>
                      </button>
                    </div>
                    {/* Snapshot list */}
                    {(palette.snapshots?.length ?? 0) === 0 ? (
                      <div className="px-3 py-4 text-center">
                        <p className="text-[10px] text-[var(--muted)]">No snapshots yet</p>
                        <p className="text-[9px] text-[var(--muted)]/70 mt-0.5">Save a checkpoint before editing</p>
                      </div>
                    ) : (
                      <div className="py-0.5 max-h-52 overflow-y-auto">
                        {(palette.snapshots as PaletteSnapshot[]).map((snap, idx) => (
                          <div
                            key={snap.id}
                            className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-[var(--surface-2)] group/snap transition-colors"
                          >
                            {/* Mini swatch strip */}
                            <div className="flex rounded-[2px] overflow-hidden shrink-0 w-14 h-5 border border-[var(--border)]">
                              {snap.colors.map((c, ci) => (
                                <div key={ci} style={{ flex: 1, backgroundColor: c.hex }} />
                              ))}
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-medium truncate leading-tight" title={snap.name}>
                                {snap.name}
                              </p>
                              <p className="text-[9px] text-[var(--muted)] leading-tight">
                                {idx === 0 ? "Latest · " : ""}{formatRelativeAge(snap.savedAt)}
                              </p>
                            </div>
                            {/* Actions */}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover/snap:opacity-100 transition-opacity shrink-0">
                              <button
                                onClick={() => handleRestoreSnapshot(snap.id)}
                                className="p-1 rounded hover:bg-[var(--accent)]/10 text-[var(--accent)] transition-colors"
                                title="Restore these colors"
                              >
                                <RefreshCw size={9} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteSnapshot(palette.id, snap.id); }}
                                className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/20 text-[var(--muted)] hover:text-rose-500 transition-colors"
                                title="Delete this snapshot"
                              >
                                <X size={9} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Cap note */}
                    {(palette.snapshots?.length ?? 0) >= 5 && (
                      <div className="px-2.5 py-1.5 border-t border-[var(--border)]">
                        <p className="text-[9px] text-[var(--muted)]">5-snapshot limit reached — delete one to save a new checkpoint</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          <Button
            variant={palette.frozen ? "outline" : "ghost"}
            size="sm"
            onClick={() => updatePalette(palette.id, { frozen: !palette.frozen })}
            title={palette.frozen ? "Unlock palette" : "Lock palette (freeze)"}
            className={palette.frozen ? "text-indigo-500 border-indigo-300 dark:border-indigo-700" : ""}
          >
            {palette.frozen ? <Lock size={13} className="text-indigo-500" /> : <LockOpen size={13} />}
          </Button>
          <Button
            variant={confirming ? "danger" : "ghost"}
            size="sm"
            onClick={palette.frozen ? undefined : handleDelete}
            disabled={palette.frozen}
            title={palette.frozen ? "Unlock to delete" : confirming ? "Click again to delete" : "Delete"}
            className={palette.frozen ? "opacity-30 cursor-not-allowed" : ""}
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </div>

      {/* Footer — visible on hover: age on left, keyboard hints on right */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-3 py-1 border-t border-[var(--border)] bg-[var(--surface-2)]/60 flex items-center justify-between gap-2">
        <span
          className="text-[10px] text-[var(--muted)] shrink-0 cursor-default"
          title={
            palette.updatedAt !== palette.createdAt
              ? `Edited ${formatDate(palette.updatedAt)} · Created ${formatDate(palette.createdAt)}`
              : `Created ${formatDate(palette.createdAt)}`
          }
        >
          {palette.updatedAt !== palette.createdAt
            ? `Edited ${formatRelativeAge(palette.updatedAt)}`
            : `Created ${formatRelativeAge(palette.createdAt)}`}
        </span>
        <span className="text-[9px] text-[var(--muted)]/60 font-mono tracking-tight shrink-0 select-none whitespace-nowrap">
          {palette.frozen
            ? "L unlock"
            : "D dup · C cmp · E export · H view · S story · F2 name · L lock · P pin · Del · ? help"}
        </span>
      </div>

      {/* AI naming overlay */}
      <AnimatePresence>
        {(naming.type === "names" || naming.type === "error") && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-x-0 bottom-0 bg-[var(--surface)]/95 backdrop-blur-sm border-t border-[var(--border)] px-3 py-3"
          >
            {naming.type === "error" ? (
              <p className="text-xs text-[var(--muted)] text-center">Couldn&apos;t generate names — try again</p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                    AI Suggestions
                  </span>
                  <button
                    onClick={() => setNaming({ type: "idle" })}
                    className="p-0.5 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] transition-colors"
                  >
                    <X size={11} />
                  </button>
                </div>
                <div className="flex flex-col gap-1">
                  {naming.names.map((name, i) => (
                    <button
                      key={i}
                      onClick={() => applyName(name)}
                      className="w-full text-left text-sm px-2.5 py-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--accent)] hover:text-[var(--accent-fg)] transition-colors font-medium truncate"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tag editor overlay */}
      <AnimatePresence>
        {tagging && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-x-0 bottom-0 bg-[var(--surface)]/97 backdrop-blur-sm border-t border-[var(--border)] px-3 py-3"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                Tags
              </span>
              <button
                onClick={closeTagging}
                className="p-0.5 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] transition-colors"
              >
                <X size={11} />
              </button>
            </div>

            {/* Current tags */}
            {currentTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {currentTags.map((tag) => (
                  <span
                    key={tag}
                    className={`flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded text-[10px] font-medium ${
                      tag === "trend"
                        ? "bg-rose-100 text-rose-600"
                        : tag === "shared"
                        ? "bg-sky-100 text-sky-600"
                        : "bg-[var(--surface-2)] text-[var(--muted)]"
                    }`}
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-0.5 rounded-full hover:bg-black/10 transition-colors p-px"
                      title={`Remove tag "${tag}"`}
                    >
                      <X size={8} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Tag autocomplete suggestions */}
            {suggestions.length > 0 && (
              <div className="mb-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] overflow-hidden bg-[var(--surface)]">
                {suggestions.map((tag, i) => {
                  const matchStart = tag.indexOf(tagInput.toLowerCase().trim());
                  const before = tag.slice(0, matchStart);
                  const match = tag.slice(matchStart, matchStart + tagInput.trim().length);
                  const after = tag.slice(matchStart + tagInput.trim().length);
                  return (
                    <button
                      key={tag}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        commitTag(tag);
                        setTagInput("");
                        setSuggestionIdx(-1);
                        tagInputRef.current?.focus();
                      }}
                      className={`w-full text-left text-xs px-2.5 py-1.5 flex items-center gap-1.5 transition-colors ${
                        i === suggestionIdx
                          ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                          : "hover:bg-[var(--surface-2)] text-[var(--fg)]"
                      }`}
                    >
                      <span className="opacity-50 font-mono text-[10px]">#</span>
                      <span>
                        {before}
                        <span className="font-semibold">{match}</span>
                        {after}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Tag input */}
            <input
              ref={tagInputRef}
              type="text"
              value={tagInput}
              onChange={(e) => { setTagInput(e.target.value); setSuggestionIdx(-1); }}
              onKeyDown={(e) => {
                if (suggestions.length > 0) {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSuggestionIdx((i) => Math.min(i + 1, suggestions.length - 1));
                    return;
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSuggestionIdx((i) => Math.max(i - 1, -1));
                    return;
                  }
                  if (e.key === "Enter" && suggestionIdx >= 0) {
                    e.preventDefault();
                    commitTag(suggestions[suggestionIdx]);
                    setTagInput("");
                    setSuggestionIdx(-1);
                    return;
                  }
                  if (e.key === "Escape" && suggestionIdx >= 0) {
                    e.preventDefault();
                    setSuggestionIdx(-1);
                    return;
                  }
                }
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  commitTag(tagInput);
                  setTagInput("");
                } else if (e.key === "Escape") {
                  closeTagging();
                } else if (e.key === "Backspace" && tagInput === "") {
                  const tags = palette.tags ?? [];
                  if (tags.length > 0) removeTag(tags[tags.length - 1]);
                }
              }}
              onBlur={() => {
                if (tagInput.trim()) {
                  commitTag(tagInput);
                  setTagInput("");
                }
                setSuggestionIdx(-1);
              }}
              placeholder={(palette.tags ?? []).length === 0 ? "Add a tag…" : "Add another…"}
              className="w-full text-xs bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-sm)] px-2 py-1.5 outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--muted)]"
              maxLength={24}
              spellCheck={false}
            />
            <p className="text-[9px] text-[var(--muted)] mt-1">
              Enter or comma to add · {suggestions.length > 0 ? "↑↓ to select · " : ""}Backspace to remove last
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Variations overlay */}
      <AnimatePresence>
        {variationsOpen && (() => {
          const VARIANTS: PaletteVariant[] = ["lighter", "darker", "muted", "saturated"];
          const { variant: recommended, reason: recommendedReason } = getRecommendedVariant(palette.colors);
          return (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-x-0 bottom-0 bg-[var(--surface)]/97 backdrop-blur-sm border-t border-[var(--border)] px-3 py-3"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                  Variations
                </span>
                <button
                  onClick={() => setVariationsOpen(false)}
                  className="p-0.5 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] transition-colors"
                >
                  <X size={11} />
                </button>
              </div>
              {/* Smart suggestion line */}
              <p className="text-[9px] text-[var(--muted)] mb-2 leading-relaxed">
                <span className="inline-flex items-center gap-0.5 text-violet-500 dark:text-violet-400 font-medium">
                  <span>★</span> Best fit:
                </span>
                {" "}{recommendedReason}
              </p>
              <div className="flex flex-col gap-1.5">
                {VARIANTS.map((variant) => {
                  const variantColors = derivePaletteVariant(palette.colors, variant);
                  const forked = forkedVariant === variant;
                  const replaced = replacedVariant === variant;
                  const isRecommended = variant === recommended;
                  return (
                    <div
                      key={variant}
                      className={`flex items-center gap-2 rounded-[4px] transition-colors ${
                        isRecommended ? "bg-violet-50/60 dark:bg-violet-950/30 -mx-1 px-1 py-0.5" : ""
                      }`}
                    >
                      <span className={`text-[10px] w-14 shrink-0 font-medium flex items-center gap-1 ${
                        isRecommended ? "text-violet-600 dark:text-violet-400" : "text-[var(--muted)]"
                      }`}>
                        {PALETTE_VARIANT_LABELS[variant]}
                        {isRecommended && (
                          <span className="text-[8px] font-bold text-violet-500 dark:text-violet-400 leading-none">★</span>
                        )}
                      </span>
                      <div className={`flex flex-1 rounded-[3px] overflow-hidden h-6 min-w-0 ${
                        isRecommended ? "ring-1 ring-violet-300/60 dark:ring-violet-700/60" : ""
                      }`}>
                        {variantColors.map((c, i) => (
                          <div
                            key={i}
                            style={{ flex: 1, backgroundColor: c.hex }}
                            title={c.hex}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => handleForkVariant(variant)}
                        disabled={forked}
                        title={forked ? "Added to library!" : `Add ${PALETTE_VARIANT_LABELS[variant]} variant to library as a new palette`}
                        className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded transition-colors ${
                          forked
                            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-[var(--surface-2)] text-[var(--muted)] hover:bg-[var(--accent)] hover:text-[var(--accent-fg)]"
                        }`}
                      >
                        {forked ? "✓" : "Fork"}
                      </button>
                      <button
                        onClick={() => handleReplaceVariant(variant)}
                        disabled={replaced}
                        title={replaced ? "Replaced!" : `Replace this palette's colors with the ${PALETTE_VARIANT_LABELS[variant]} variant`}
                        className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded transition-colors ${
                          replaced
                            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-[var(--surface-2)] text-[var(--muted)] hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/30 dark:hover:text-rose-400"
                        }`}
                      >
                        {replaced ? "✓" : "Replace"}
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="text-[9px] text-[var(--muted)] mt-2">
                <strong className="font-semibold">Fork</strong> adds a new palette · <strong className="font-semibold">Replace</strong> overwrites this one
              </p>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Print-safe quick check overlay */}
      <AnimatePresence>
        {printCheckOpen && (() => {
          const allSafe = printRisk.vivid === 0 && printRisk.moderate === 0;
          const isMixed = printRisk.vivid > 0 && printRisk.moderate > 0;
          const trafficLight = allSafe
            ? { label: "All print-safe", dotClass: "bg-emerald-500", bgClass: "bg-emerald-50 dark:bg-emerald-950/30", textClass: "text-emerald-700 dark:text-emerald-400" }
            : isMixed
            ? { label: `${printRisk.vivid}v · ${printRisk.moderate}c risk`, dotClass: "bg-rose-500", bgClass: "bg-rose-50 dark:bg-rose-950/30", textClass: "text-rose-700 dark:text-rose-400" }
            : printRisk.vivid > 0
            ? { label: "High print risk", dotClass: "bg-rose-500", bgClass: "bg-rose-50 dark:bg-rose-950/30", textClass: "text-rose-700 dark:text-rose-400" }
            : { label: "Some caution", dotClass: "bg-orange-400", bgClass: "bg-orange-50 dark:bg-orange-950/30", textClass: "text-orange-700 dark:text-orange-400" };

          return (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-x-0 bottom-0 bg-[var(--surface)]/97 backdrop-blur-sm border-t border-[var(--border)] px-3 py-3"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${trafficLight.bgClass} ${trafficLight.textClass}`}>
                  <span className={`w-2 h-2 rounded-full ${trafficLight.dotClass} shrink-0`} />
                  {trafficLight.label}
                </div>
                <div className="flex items-center gap-1">
                  {printRisk.moderate > 0 && (
                    <button
                      onClick={muteAllCaution}
                      title="Clamp all caution swatches to C=0.12 (print-safe)"
                      className={`text-[9px] font-medium px-1.5 py-0.5 rounded transition-colors ${
                        cautionMutedAll
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-800/40"
                      }`}
                    >
                      {cautionMutedAll ? "✓ Muted" : `Mute all caution`}
                    </button>
                  )}
                  {printRisk.vivid > 0 && (
                    <button
                      onClick={muteAllVivid}
                      title="Clamp all vivid swatches to C=0.25 (print-safe boundary)"
                      className={`text-[9px] font-medium px-1.5 py-0.5 rounded transition-colors ${
                        printMutedAll
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-800/40"
                      }`}
                    >
                      {printMutedAll ? "✓ Muted" : `Mute all vivid`}
                    </button>
                  )}
                  <button
                    onClick={() => setPrintCheckOpen(false)}
                    className="p-0.5 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] transition-colors"
                  >
                    <X size={11} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                {palette.colors.map((c, i) => {
                  const ok = hexToOklch(c.hex);
                  const chroma = ok?.c ?? 0;
                  const isVivid = chroma > 0.25;
                  const isModerate = chroma > 0.12 && !isVivid;
                  const isSafe = !isVivid && !isModerate;
                  const justMuted = printMutedIdx === i;
                  const justMutedToSafe = cautionMutedIdx === i;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div
                        className="w-6 h-4 rounded-[3px] shrink-0 border border-black/10"
                        style={{ backgroundColor: c.hex }}
                        title={c.hex}
                      />
                      <span className="text-[9px] font-mono text-[var(--muted)] w-14 shrink-0 tabular-nums">
                        {c.hex.toUpperCase()}
                      </span>
                      {c.name && (
                        <span className="text-[9px] text-[var(--foreground)] truncate flex-1 min-w-0">
                          {c.name}
                        </span>
                      )}
                      <div className="ml-auto flex items-center gap-1 shrink-0">
                        {isVivid && (
                          <button
                            onClick={() => muteSwatch(i)}
                            title={`Clamp chroma to C=0.25 — moves from vivid to caution zone`}
                            className={`text-[9px] font-medium px-1 py-px rounded transition-colors ${
                              justMuted
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-[var(--surface-2)] text-[var(--muted)] hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-900/30 dark:hover:text-rose-400"
                            }`}
                          >
                            {justMuted ? "✓" : "Mute"}
                          </button>
                        )}
                        {isModerate && (
                          <button
                            onClick={() => muteSwatchToSafe(i)}
                            title={`Clamp chroma to C=0.12 — moves from caution to safe zone`}
                            className={`text-[9px] font-medium px-1 py-px rounded transition-colors ${
                              justMutedToSafe
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-[var(--surface-2)] text-[var(--muted)] hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/30 dark:hover:text-amber-400"
                            }`}
                          >
                            {justMutedToSafe ? "✓" : "Mute"}
                          </button>
                        )}
                        <span className={`text-[9px] font-medium px-1.5 py-px rounded tabular-nums ${
                          isVivid
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                            : isModerate
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        }`}
                          title={
                            isVivid
                              ? `C=${chroma.toFixed(3)} — highly vivid, press may not reproduce at full saturation`
                              : isModerate
                              ? `C=${chroma.toFixed(3)} — moderate chroma, slight shift possible in print`
                              : `C=${chroma.toFixed(3)} — safe for CMYK print`
                          }
                        >
                          {isVivid ? "Vivid" : isModerate ? "Caution" : "Safe"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[9px] text-[var(--muted)] mt-2 leading-relaxed">
                Based on oklch chroma · C&gt;0.25 vivid · C 0.12–0.25 caution · C≤0.12 safe · Mute clamps to zone boundary
              </p>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Keyboard shortcuts peek overlay — visible while ? is held over the card */}
      <AnimatePresence>
        {showKeyShortcuts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.08 }}
            className="absolute inset-0 z-30 bg-[var(--surface)]/96 backdrop-blur-[3px] flex flex-col px-3.5 py-3 pointer-events-none"
          >
            <div className="flex items-center gap-1.5 mb-2.5">
              <Keyboard size={10} className="text-[var(--accent)] shrink-0" />
              <span className="text-[9px] font-semibold text-[var(--foreground)] uppercase tracking-widest">Card Shortcuts</span>
            </div>
            <div className="flex flex-col gap-1 flex-1">
              {([
                { key: "D", label: "Duplicate" },
                { key: "C", label: "Compare" },
                { key: "H", label: "Harmony View" },
                { key: "E", label: "Export" },
                { key: "V", label: "CVD Export (Deuteranopia)" },
                { key: "⇧V", label: "CVD Export (Protanopia)" },
                { key: "⌥V", label: "CVD Export (Tritanopia)" },
                { key: "W", label: "Edit first swatch" },
                { key: "S", label: "Color Story" },
                { key: "F2", label: "Rename" },
                { key: "L", label: palette.frozen ? "Unlock" : "Lock" },
                { key: "P", label: "Pin / Unpin" },
                { key: "Del", label: "Delete" },
              ] as const).map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-[15px] px-1 rounded text-[8px] font-mono font-semibold bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] leading-none shadow-[0_1px_0_0_var(--border)] shrink-0">
                    {key}
                  </kbd>
                  <span className="text-[10px] text-[var(--muted)]">{label}</span>
                </div>
              ))}
            </div>
            <p className="text-[8px] text-[var(--muted)]/40 text-center mt-2 select-none">release ? to close</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cover URL overlay */}
      <AnimatePresence>
        {coverUrlOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-x-0 bottom-0 bg-[var(--surface)]/97 backdrop-blur-sm border-t border-[var(--border)] px-3 py-3"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                Cover Image
              </span>
              <button
                onClick={() => setCoverUrlOpen(false)}
                className="p-0.5 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] transition-colors"
              >
                <X size={11} />
              </button>
            </div>
            {coverUrlValue && (
              <div className="mb-2 flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverUrlValue}
                  alt="Preview"
                  className="w-12 h-12 object-cover rounded-[4px] border border-[var(--border)] flex-shrink-0"
                  onError={() => setCoverUrlError(true)}
                  onLoad={() => setCoverUrlError(false)}
                />
                <p className={`text-[9px] truncate flex-1 min-w-0 font-mono ${coverUrlError ? "text-rose-400" : "text-[var(--muted)]"}`}>
                  {coverUrlError ? "Image failed to load" : coverUrlValue}
                </p>
              </div>
            )}
            <input
              ref={coverUrlInputRef}
              type="url"
              value={coverUrlValue}
              onChange={(e) => { setCoverUrlValue(e.target.value); setCoverUrlError(false); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); commitCoverUrl(); }
                if (e.key === "Escape") { e.preventDefault(); setCoverUrlOpen(false); }
              }}
              placeholder="https://example.com/image.jpg"
              className={`w-full text-xs bg-[var(--surface-2)] border rounded-[var(--radius-sm)] px-2 py-1.5 outline-none transition-colors placeholder:text-[var(--muted)] ${
                coverUrlError ? "border-rose-400 focus:border-rose-500" : "border-[var(--border)] focus:border-[var(--accent)]"
              }`}
              spellCheck={false}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-[9px] text-[var(--muted)]">Paste any public image URL · Enter to save · Esc to cancel</p>
              <div className="flex items-center gap-2">
                {palette.coverUrl && (
                  <button
                    onClick={clearCoverUrl}
                    className="text-[9px] text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                  >
                    Remove
                  </button>
                )}
                <button
                  onClick={commitCoverUrl}
                  className="text-[9px] font-medium px-2 py-0.5 rounded bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-90 transition-opacity"
                >
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Color Story overlay */}
      <AnimatePresence>
        {colorStoryOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-x-0 bottom-0 bg-[var(--surface)]/97 backdrop-blur-sm border-t border-[var(--border)] px-3 py-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles size={11} className="text-violet-400" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Color Story</span>
              </div>
              <button
                onClick={() => setColorStoryOpen(false)}
                className="p-0.5 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] transition-colors"
              >
                <X size={11} />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {colorStoryLoading && (
                <motion.div
                  key="cs-loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 py-2"
                >
                  <Loader2 size={12} className="animate-spin text-violet-400 shrink-0" />
                  <span className="text-xs text-[var(--muted)]">Reading the palette&hellip;</span>
                </motion.div>
              )}

              {colorStoryError && !colorStoryLoading && (
                <motion.div
                  key="cs-error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-between py-1"
                >
                  <span className="text-xs text-[var(--muted)]">Something went wrong</span>
                  <button
                    onClick={() => void fetchColorStory()}
                    className="flex items-center gap-1 text-[10px] font-medium text-violet-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                  >
                    <RefreshCw size={10} />
                    Try again
                  </button>
                </motion.div>
              )}

              {colorStory && !colorStoryLoading && (
                <motion.div
                  key="cs-result"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <p className="text-xs leading-relaxed text-[var(--foreground)] mb-2">{colorStory.vibe}</p>

                  {colorStory.products.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {colorStory.products.map((product) => {
                        const alreadyTagged = (palette.tags ?? []).map((t) => t.toLowerCase()).includes(product.toLowerCase());
                        return (
                          <button
                            key={product}
                            onClick={() => {
                              if (alreadyTagged) return;
                              const existing = palette.tags ?? [];
                              updatePalette(palette.id, { tags: [...existing, product.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")] });
                            }}
                            title={alreadyTagged ? "Already tagged" : `Add "${product}" as tag`}
                            className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors ${
                              alreadyTagged
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400 cursor-default"
                                : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)] cursor-pointer"
                            }`}
                          >
                            {alreadyTagged ? <Check size={9} className="shrink-0" /> : <Plus size={9} className="shrink-0" />}
                            {product}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="border-t border-[var(--border)] pt-2">
                    <p className="text-[9px] text-[var(--muted)] font-semibold uppercase tracking-wider mb-1">AI Prompt</p>
                    <div className="flex items-start gap-1.5">
                      <p className="text-[10px] font-mono text-[var(--foreground)] leading-snug flex-1 min-w-0 select-all break-words">{colorStory.prompt}</p>
                      <button
                        onClick={() => {
                          if (!colorStory) return;
                          navigator.clipboard.writeText(colorStory.prompt);
                          setColorStoryPromptCopied(true);
                          setTimeout(() => setColorStoryPromptCopied(false), 1500);
                        }}
                        className={`shrink-0 flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md border transition-all mt-px ${
                          colorStoryPromptCopied
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400"
                            : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)]"
                        }`}
                        title="Copy AI art prompt"
                      >
                        {colorStoryPromptCopied ? <Check size={10} /> : <Copy size={10} />}
                        {colorStoryPromptCopied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-1.5">
                    <button
                      onClick={() => { setColorStory(null); void fetchColorStory(); }}
                      className="flex items-center gap-1 text-[10px] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                    >
                      <RefreshCw size={9} />
                      Regenerate
                    </button>
                    <button
                      onClick={() => { setColorStoryOpen(false); onExport(palette); }}
                      className="flex items-center gap-1 text-[10px] font-medium text-violet-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                      title="Export this palette"
                    >
                      <Download size={9} />
                      Export
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notes overlay */}
      <AnimatePresence>
        {notesOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-x-0 bottom-0 bg-[var(--surface)]/97 backdrop-blur-sm border-t border-[var(--border)] px-3 py-3"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                Note
              </span>
              <button
                onClick={commitNotes}
                className="p-0.5 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] transition-colors"
              >
                <X size={11} />
              </button>
            </div>
            <textarea
              ref={notesTextareaRef}
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              onBlur={commitNotes}
              onKeyDown={(e) => {
                if (e.key === "Escape") { e.preventDefault(); cancelNotes(); }
              }}
              placeholder="Add a creative note… e.g. autumn forest walk, brand refresh option 2"
              className="w-full text-xs bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-sm)] px-2 py-1.5 outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--muted)] resize-none leading-relaxed"
              rows={3}
              maxLength={280}
              spellCheck
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-[9px] text-[var(--muted)]">Blur or ↵ to save · Esc to cancel</p>
              <span className="text-[9px] text-[var(--muted)] tabular-nums">
                {notesValue.trim() ? `${notesValue.trim().split(/\s+/).length}w · ` : ""}{notesValue.length}/280
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
