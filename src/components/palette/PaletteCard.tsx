"use client";

import { useState, useEffect, useRef, type ReactNode, type MouseEvent } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Trash2, Download, FolderOpen, Edit2, Eye, Pencil, Wand2, X, Loader2, Tag, CopyPlus, Check, Crown, Lock, LockOpen, StickyNote, Plus, Layers, ArrowLeftRight, Pin, Shuffle, Tags, Printer } from "lucide-react";
import { getContrastColor, deltaE, getPaletteMood, formatRelativeAge, formatDate, getHarmonyColors, hexToRgb, rgbToHsl, hexToOklch, oklchToHex, isOklchOutOfSrgbGamut, derivePaletteVariant, type PaletteMood, type PaletteVariant, PALETTE_VARIANT_LABELS } from "@/lib/utils";
import { usePaletteStore } from "@/store/paletteStore";
import type { ColorSwatch, Palette } from "@/types";
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

function getMatchTier(dE: number): { bg: string; text: string; label: string } {
  if (dE < 5)  return { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", label: "excellent" };
  if (dE < 10) return { bg: "bg-sky-100 dark:bg-sky-900/30",     text: "text-sky-700 dark:text-sky-400",     label: "good"      };
  if (dE < 15) return { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", label: "fair"      };
  return               { bg: "bg-rose-100 dark:bg-rose-900/30",  text: "text-rose-700 dark:text-rose-400",  label: "loose"     };
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
  activeTag?: string;
  onCompare?: (palette: Palette) => void;
  isCompareAnchor?: boolean;
  onPin?: (palette: Palette) => void;
  isPinned?: boolean;
  isHighlighted?: boolean;
  cardId?: string;
}

type NamingState =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "names"; names: string[] }
  | { type: "error" };

export default function PaletteCard({ palette, onExport, onRename, onAssignCollection, onHarmony, onEditSwatch, onShadeScale, onDuplicate, isSelected = false, selectionActive = false, onSelect, colorMatchHex, isCover = false, onSetCover, className, searchQuery, collectionName, collectionSize, onJumpToCollection, onClearCollection, onFilterByTag, activeTag, onCompare, isCompareAnchor = false, onPin, isPinned = false, isHighlighted = false, cardId }: PaletteCardProps) {
  const { deletePalette, updatePalette, addPalette } = usePaletteStore((s) => ({
    deletePalette: s.deletePalette,
    updatePalette: s.updatePalette,
    addPalette: s.addPalette,
  }));

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

  // Keyboard shortcuts — active when this card is hovered, no text field is focused
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isHoveredRef.current) return;
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const pal = paletteRef.current;
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
        case "p": case "P":
          if (onPinRef.current) { e.preventDefault(); onPinRef.current(pal); }
          break;
        case "e": case "E":
          e.preventDefault();
          onExportRef.current(pal);
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
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
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
  const freshness = getFreshness(palette.createdAt, palette.updatedAt);
  const harmonyColors = getHarmonyColors(palette.colors);

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

  const openVariations = () => {
    setTagging(false);
    setTagInput("");
    setNaming({ type: "idle" });
    setNotesOpen(false);
    setPrintCheckOpen(false);
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      onMouseEnter={() => { isHoveredRef.current = true; }}
      onMouseLeave={() => { isHoveredRef.current = false; }}
      id={cardId}
      className={`group bg-[var(--surface)] rounded-[var(--radius)] border overflow-hidden hover:shadow-md transition-shadow duration-200 relative ${
        isHighlighted ? "border-sky-400 dark:border-sky-500 ring-2 ring-sky-300/70 dark:ring-sky-600/60 shadow-md" :
        isCover ? "border-amber-300 shadow-sm ring-1 ring-amber-200/60" :
        palette.frozen ? "border-indigo-200 dark:border-indigo-800/60 ring-1 ring-indigo-100/60 dark:ring-indigo-900/40" :
        isPinned ? "border-orange-200 dark:border-orange-800/60 ring-1 ring-orange-100/60 dark:ring-orange-900/30" :
        isSelected ? "border-[var(--accent)] shadow-sm" : "border-[var(--border)]"
      } ${className ?? ""}`}
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
                    <div
                      className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full pointer-events-none group-hover/swatch:opacity-0 transition-opacity"
                      style={{
                        backgroundColor: getContrastColor(color.hex) === "#fafaf8" ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.75)",
                      }}
                    />
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
                    <div
                      className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full pointer-events-none group-hover/swatch:opacity-0 transition-opacity"
                      style={{
                        backgroundColor: getContrastColor(color.hex) === "#fafaf8" ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.75)",
                      }}
                    />
                  )}
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        )}

        {/* Frozen lock badge */}
        {palette.frozen && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/70 dark:bg-black/50 backdrop-blur-sm pointer-events-none">
            <Lock size={8} className="text-indigo-500 dark:text-indigo-400" />
            <span className="text-[8px] font-bold text-indigo-600 dark:text-indigo-300 leading-none uppercase tracking-wide">locked</span>
          </div>
        )}
      </div>

      {/* Lightness sparkline — always-visible bar chart of per-swatch HSL lightness */}
      <div
        className="flex items-end gap-[2px] px-2 bg-[var(--surface-2)]/30"
        style={{ height: 14 }}
        title={`Lightness profile · ${orderedColors.map((c) => {
          const rgb = hexToRgb(c.hex);
          return rgb ? `${rgbToHsl(rgb.r, rgb.g, rgb.b).l}%` : "?";
        }).join(" · ")}`}
      >
        {orderedColors.map((color) => {
          const rgb = hexToRgb(color.hex);
          const l = rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b).l : 50;
          return (
            <div
              key={color._key}
              className="flex-1 rounded-t-[2px]"
              style={{
                height: Math.max(2, Math.round((l / 100) * 11)),
                backgroundColor: color.hex,
                opacity: 0.72,
              }}
            />
          );
        })}
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
        <div className="overflow-hidden max-h-0 group-hover:max-h-9 transition-[max-height] duration-200 ease-out">
          <div className="flex h-9 border-t border-[var(--border)]">
            {/* Label */}
            <div className="flex-shrink-0 flex items-center px-2 bg-[var(--surface-2)]/80 border-r border-[var(--border)]">
              <span className="text-[9px] font-semibold tracking-wider text-[var(--muted)]/70 uppercase select-none whitespace-nowrap">
                harmony
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
                }}
                title={`${hc.label} · ${hc.hex}`}
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
                className="text-sm font-medium truncate select-none"
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
            {gamutClippedCount > 0 && (
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 tabular-nums"
                title={`${gamutClippedCount} of ${palette.colors.length} color${palette.colors.length !== 1 ? "s" : ""} fall outside sRGB gamut — displayed as nearest clipped color`}
              >
                {gamutClippedCount} clipped
              </span>
            )}
            {(printRisk.vivid + printRisk.moderate > 0) ? (
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
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium tabular-nums transition-opacity hover:opacity-80 ${
                  printRisk.vivid > 0
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                    : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                }`}
                title="Click to see print risk details"
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${printRisk.vivid > 0 ? "bg-rose-500" : "bg-orange-400"}`} />
                {printRisk.vivid + printRisk.moderate} print risk
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
              const isActiveFilter = !!activeTag && tag === activeTag;
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
          <Button
            variant={tagging ? "outline" : "ghost"}
            size="sm"
            onClick={tagging ? closeTagging : openTagging}
            title="Manage tags"
          >
            <Tag size={13} />
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
            : "D dup · E export · F2 name · H view · L lock · P pin · Del"}
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
          const vividOnly = printRisk.vivid > 0;
          const trafficLight = allSafe
            ? { label: "All print-safe", dotClass: "bg-emerald-500", bgClass: "bg-emerald-50 dark:bg-emerald-950/30", textClass: "text-emerald-700 dark:text-emerald-400" }
            : vividOnly
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
