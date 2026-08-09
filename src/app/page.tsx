"use client";

import { useState, useEffect, useCallback, useRef, useMemo, type JSX } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Search, FolderOpen, Sparkles, BarChart2, Compass, BookMarked, BookmarkPlus, X, ArrowUpDown, Trash2, CheckSquare, Pipette, Download, Loader2, Archive, CheckCircle2, Lock, LockOpen, CopyPlus, ChevronRight, ChevronDown, RotateCcw, Import, ArrowLeftRight, Pencil, Tag, Pin, ShieldCheck, ScanSearch } from "lucide-react";
import { usePaletteStore } from "@/store/paletteStore";
import Button from "@/components/ui/Button";
import Extractor from "@/components/palette/Extractor";
import PaletteCard from "@/components/palette/PaletteCard";
import ExportModal from "@/components/palette/ExportModal";
import RenameModal from "@/components/palette/RenameModal";
import CollectionModal from "@/components/palette/CollectionModal";
import HarmonyModal from "@/components/palette/HarmonyModal";
import ContrastModal from "@/components/palette/ContrastModal";
import SwatchEditor from "@/components/palette/SwatchEditor";
import CohesionModal from "@/components/palette/CohesionModal";
import TrendLibrary from "@/components/palette/TrendLibrary";
import ImportModal from "@/components/palette/ImportModal";
import KeyboardHelpModal from "@/components/palette/KeyboardHelpModal";
import ShadeModal from "@/components/palette/ShadeModal";
import CompareModal from "@/components/palette/CompareModal";
import ColorBrowser from "@/components/palette/ColorBrowser";
import DuplicatesModal from "@/components/palette/DuplicatesModal";
import { computeCohesionScore, deltaE, isValidHex, getPaletteMood, formatDate, hexToRgb, rgbToHsl, hexToOklch, isOklchOutOfSrgbGamut, getContrastRatio, type PaletteMood } from "@/lib/utils";
import { batchExportZip } from "@/lib/exportPalette";
import type { Palette, Collection, ColorSwatch, FilterPreset } from "@/types";

const MOOD_ORDER: PaletteMood[] = ["warm", "cool", "earthy", "vivid", "muted", "dreamy"];

const MOOD_PILL_STYLES: Record<PaletteMood, { dot: string; activeClass: string; inactiveClass: string }> = {
  warm:   { dot: "#f59e0b", activeClass: "bg-amber-100 text-amber-700 border-amber-300",    inactiveClass: "text-amber-600 border-amber-200 hover:border-amber-400 hover:bg-amber-50" },
  cool:   { dot: "#0ea5e9", activeClass: "bg-sky-100 text-sky-700 border-sky-300",          inactiveClass: "text-sky-600 border-sky-200 hover:border-sky-400 hover:bg-sky-50" },
  earthy: { dot: "#84cc16", activeClass: "bg-lime-100 text-lime-700 border-lime-300",        inactiveClass: "text-lime-600 border-lime-200 hover:border-lime-400 hover:bg-lime-50" },
  vivid:  { dot: "#f43f5e", activeClass: "bg-rose-100 text-rose-700 border-rose-300",        inactiveClass: "text-rose-500 border-rose-200 hover:border-rose-400 hover:bg-rose-50" },
  muted:  { dot: "#71717a", activeClass: "bg-zinc-100 text-zinc-700 border-zinc-300",        inactiveClass: "text-zinc-500 border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50" },
  dreamy: { dot: "#8b5cf6", activeClass: "bg-violet-100 text-violet-700 border-violet-300",  inactiveClass: "text-violet-500 border-violet-200 hover:border-violet-400 hover:bg-violet-50" },
};

const SPECIAL_TAG_STYLES: Record<string, { dot: string; activeClass: string; inactiveClass: string; sidebarActiveText: string }> = {
  trend: {
    dot: "#fb7185",
    activeClass: "bg-rose-100 text-rose-700 border-rose-300 shadow-sm dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800",
    inactiveClass: "bg-[var(--surface)] text-rose-500 border-rose-200 hover:border-rose-400 hover:bg-rose-50/60 dark:text-rose-400 dark:border-rose-800/60 dark:hover:bg-rose-950/20",
    sidebarActiveText: "text-rose-500",
  },
  shared: {
    dot: "#38bdf8",
    activeClass: "bg-sky-100 text-sky-700 border-sky-300 shadow-sm dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-800",
    inactiveClass: "bg-[var(--surface)] text-sky-500 border-sky-200 hover:border-sky-400 hover:bg-sky-50/60 dark:text-sky-400 dark:border-sky-800/60 dark:hover:bg-sky-950/20",
    sidebarActiveText: "text-sky-500",
  },
  harmony: {
    dot: "#10b981",
    activeClass: "bg-emerald-100 text-emerald-700 border-emerald-300 shadow-sm dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800",
    inactiveClass: "bg-[var(--surface)] text-emerald-600 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/60 dark:text-emerald-400 dark:border-emerald-800/60 dark:hover:bg-emerald-950/20",
    sidebarActiveText: "text-emerald-600",
  },
  shades: {
    dot: "#78716c",
    activeClass: "bg-stone-100 text-stone-700 border-stone-300 shadow-sm dark:bg-stone-900/40 dark:text-stone-300 dark:border-stone-700",
    inactiveClass: "bg-[var(--surface)] text-stone-500 border-stone-200 hover:border-stone-400 hover:bg-stone-50/60 dark:text-stone-400 dark:border-stone-700/60 dark:hover:bg-stone-900/20",
    sidebarActiveText: "text-stone-600",
  },
};

function getTagDotColor(tag: string): string {
  return SPECIAL_TAG_STYLES[tag]?.dot ?? "#a1a1aa";
}

// Counts up from 0 to `value` on first mount, then tracks `value` statically.
function AnimatedStat({ value, suffix }: { value: number; suffix?: string }): JSX.Element {
  const [display, setDisplay] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    const start = performance.now();
    const duration = 600;
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(Math.round(eased * value));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        done.current = true;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown = done.current ? value : display;
  return <>{shown}{suffix}</>
}

const HUE_SECTOR_NAMES = [
  "Red", "Orange", "Yellow", "Chartreuse",
  "Green", "Spring Green", "Cyan", "Azure",
  "Blue", "Violet", "Magenta", "Rose",
];

function polarXY(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function donutArc(cx: number, cy: number, rOut: number, rIn: number, startDeg: number, endDeg: number): string {
  const [ox1, oy1] = polarXY(cx, cy, rOut, startDeg);
  const [ox2, oy2] = polarXY(cx, cy, rOut, endDeg);
  const [ix2, iy2] = polarXY(cx, cy, rIn, endDeg);
  const [ix1, iy1] = polarXY(cx, cy, rIn, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M${ox1.toFixed(2)},${oy1.toFixed(2)} A${rOut},${rOut} 0 ${large},1 ${ox2.toFixed(2)},${oy2.toFixed(2)} L${ix2.toFixed(2)},${iy2.toFixed(2)} A${rIn},${rIn} 0 ${large},0 ${ix1.toFixed(2)},${iy1.toFixed(2)} Z`;
}

function LibraryHueWheel({
  buckets,
  activeSector,
  onSectorClick,
}: {
  buckets: number[];
  activeSector?: number | null;
  onSectorClick?: (sector: number) => void;
}): JSX.Element {
  const maxCount = Math.max(...buckets, 1);
  const CX = 30, CY = 30, ROUT = 26, RIN = 14, GAP = 2.5, DEG = 30;
  const hasActive = activeSector !== null && activeSector !== undefined;
  return (
    <svg
      width={60}
      height={60}
      viewBox="0 0 60 60"
      aria-label={hasActive ? `Hue wheel — ${HUE_SECTOR_NAMES[activeSector!]} filtered` : "Library hue coverage wheel — click an arc to filter"}
    >
      {buckets.map((count, i) => {
        const hue = i * 30 + 15;
        const fill = `hsl(${hue}, 85%, 58%)`;
        const startDeg = i * DEG - 90 + GAP / 2;
        const endDeg = (i + 1) * DEG - 90 - GAP / 2;
        const isActive = activeSector === i;
        const isGap = count === 0;
        const baseOpacity = isGap ? 0.1 : 0.2 + (count / maxCount) * 0.8;
        const opacity = isActive ? 1 : hasActive ? baseOpacity * 0.4 : baseOpacity;
        const ventOpacity = isActive ? 0 : hasActive ? 0.12 : 0.32;
        return (
          <g
            key={i}
            onClick={() => onSectorClick?.(i)}
            style={{ cursor: onSectorClick ? "pointer" : "default" }}
            role={onSectorClick ? "button" : undefined}
            aria-pressed={onSectorClick ? isActive : undefined}
          >
            <title>
              {HUE_SECTOR_NAMES[i]}: {count} swatch{count !== 1 ? "es" : ""}
              {onSectorClick ? (isActive ? " — active filter, click to clear" : " — click to filter") : ""}
            </title>
            <path
              d={donutArc(CX, CY, ROUT, RIN, startDeg, endDeg)}
              fill={fill}
              opacity={opacity}
              stroke={isActive ? "white" : "none"}
              strokeWidth={isActive ? 1.5 : 0}
            />
            {isGap && [0.25, 0.5, 0.75].map((frac) => {
              const lineDeg = startDeg + (endDeg - startDeg) * frac;
              const [ix, iy] = polarXY(CX, CY, RIN + 1.5, lineDeg);
              const [ox, oy] = polarXY(CX, CY, ROUT - 1.5, lineDeg);
              return (
                <line
                  key={frac}
                  x1={ix.toFixed(2)} y1={iy.toFixed(2)}
                  x2={ox.toFixed(2)} y2={oy.toFixed(2)}
                  stroke={fill}
                  strokeWidth={0.75}
                  opacity={ventOpacity}
                  strokeLinecap="round"
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

export default function Home() {
  const { palettes, collections, addPalette, duplicatePalette, deletePalettes, assignPalettesToCollection, updateCollection, updatePalette, togglePin } = usePaletteStore();
  const [search, setSearch] = useState("");
  const [activeCollection, setActiveCollection] = useState<string | "all">("all");
  const [exportTarget, setExportTarget] = useState<Palette | null>(null);
  const [renameTarget, setRenameTarget] = useState<Palette | null>(null);
  const [collectionTarget, setCollectionTarget] = useState<Palette | null>(null);
  const [harmonyTarget, setHarmonyTarget] = useState<Palette | null>(null);
  const [contrastTarget, setContrastTarget] = useState<Palette | null>(null);
  const [editTarget, setEditTarget] = useState<{ palette: Palette; swatchIndex: number } | null>(null);
  const [shadeTarget, setShadeTarget] = useState<{ hex: string; name?: string } | null>(null);
  const [compareAnchor, setCompareAnchor] = useState<Palette | null>(null);
  const [compareTarget, setCompareTarget] = useState<Palette | null>(null);
  const [cohesionTarget, setCohesionTarget] = useState<Collection | null>(null);
  const [showTrendLibrary, setShowTrendLibrary] = useState(false);
  const [trendSeed, setTrendSeed] = useState<{ hex: string; name: string } | undefined>();
  const [showImport, setShowImport] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [forkPrompt, setForkPrompt] = useState<{ name: string; colors: ColorSwatch[] } | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name-asc" | "name-desc" | "most-colors" | "most-notes" | "light-first" | "dark-first" | "most-clipped" | "most-print-risk" | "most-varied" | "print-safe-first">("newest");
  const [collectionSortBy, setCollectionSortBy] = useState<"default" | "cohesion-desc" | "name-asc" | "count-desc">("default");

  const paletteMeanLightness = useCallback((p: Palette): number => {
    if (p.colors.length === 0) return 0;
    const total = p.colors.reduce((sum, c) => {
      const rgb = hexToRgb(c.hex);
      if (!rgb) return sum;
      return sum + rgbToHsl(rgb.r, rgb.g, rgb.b).l;
    }, 0);
    return total / p.colors.length;
  }, []);
  const paletteGamutClippedCount = useCallback((p: Palette): number =>
    p.colors.filter((c) => { const ok = hexToOklch(c.hex); return ok ? isOklchOutOfSrgbGamut(ok.l, ok.c, ok.h) : false; }).length,
  []);
  const palettePrintRiskCount = useCallback((p: Palette): number =>
    p.colors.reduce((n, c) => { const ok = hexToOklch(c.hex); return ok && ok.c > 0.12 ? n + 1 : n; }, 0),
  []);
  const palettePrintRiskAny = useCallback((p: Palette): boolean =>
    p.colors.some(c => { const ok = hexToOklch(c.hex); return ok ? ok.c > 0.12 : false; }),
  []);
  const paletteOklchLRange = useCallback((p: Palette): number => {
    if (p.colors.length < 2) return 0;
    const ls = p.colors.map((c) => { const ok = hexToOklch(c.hex); return ok ? ok.l : 50; });
    return Math.max(...ls) - Math.min(...ls);
  }, []);

  const getPaletteA11yLevel = useCallback((p: Palette): "AA" | "AA Large" | null => {
    if (p.colors.length < 2) return null;
    let best = 0;
    for (let i = 0; i < p.colors.length; i++)
      for (let j = i + 1; j < p.colors.length; j++) {
        const r = getContrastRatio(p.colors[i].hex, p.colors[j].hex);
        if (r > best) best = r;
      }
    if (best >= 4.5) return "AA";
    if (best >= 3.0) return "AA Large";
    return null;
  }, []);

  const isPaletteFlatTone = useCallback((p: Palette): boolean => {
    if (p.colors.length < 2) return false;
    const ls = p.colors.map((c) => {
      const rgb = hexToRgb(c.hex);
      return rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b).l : 50;
    });
    return ls.every((l) => l > 20 && l < 80);
  }, []);
  const [hoveredCollectionId, setHoveredCollectionId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkExporting, setBulkExporting] = useState(false);
  const [collectionExporting, setCollectionExporting] = useState<string | null>(null);
  const [colorSearchActive, setColorSearchActive] = useState(false);
  const [colorSearchHex, setColorSearchHex] = useState("");
  const [colorSearchHistory, setColorSearchHistory] = useState<string[]>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [activeMood, setActiveMood] = useState<PaletteMood | "all">("all");
  const [activeFreezeFilter, setActiveFreezeFilter] = useState<"all" | "locked">("all");
  const [printReadyOnly, setPrintReadyOnly] = useState(false);
  const [a11yFilter, setA11yFilter] = useState<"all" | "AA" | "AA Large">("all");
  const [flatToneFilter, setFlatToneFilter] = useState(false);
  const [activeHueSector, setActiveHueSector] = useState<number | null>(null);
  const [highlightedPaletteId, setHighlightedPaletteId] = useState<string | null>(null);
  const [exportToast, setExportToast] = useState<{ count: number; source?: string } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [renamingCollectionId, setRenamingCollectionId] = useState<string | null>(null);
  const [inlineCollectionName, setInlineCollectionName] = useState("");
  const [inlineCollectionDesc, setInlineCollectionDesc] = useState("");
  const [flashedCollectionId, setFlashedCollectionId] = useState<string | null>(null);
  const [showArchivedCollections, setShowArchivedCollections] = useState(false);
  const [activeColorCount, setActiveColorCount] = useState<number | "all">("all");
  const [bulkTagOpen, setBulkTagOpen] = useState(false);
  const [bulkTagInput, setBulkTagInput] = useState("");
  const bulkTagInputRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<"palettes" | "colors">("palettes");
  const [colorBrowserCollection, setColorBrowserCollection] = useState<string>("all");
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>([]);
  const [savePresetOpen, setSavePresetOpen] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState("");
  const presetNameInputRef = useRef<HTMLInputElement>(null);
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);
  const displayListRef = useRef<Palette[]>([]);

  const jumpToCollection = useCallback((id: string) => {
    setActiveCollection(id);
    setViewMode("palettes");
    setFlashedCollectionId(id);
    setTimeout(() => {
      document.getElementById(`col-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 80);
    setTimeout(() => setFlashedCollectionId(null), 820);
  }, []);

  const handleJumpToPalette = useCallback((paletteId: string) => {
    setViewMode("palettes");
    setHighlightedPaletteId(paletteId);
  }, []);

  const commitCollectionRename = useCallback(() => {
    if (!renamingCollectionId) return;
    const trimmed = inlineCollectionName.trim();
    if (trimmed) updateCollection(renamingCollectionId, {
      name: trimmed,
      description: inlineCollectionDesc.trim() || undefined,
    });
    setRenamingCollectionId(null);
  }, [renamingCollectionId, inlineCollectionName, inlineCollectionDesc, updateCollection]);

  const cancelCollectionRename = useCallback(() => {
    setRenamingCollectionId(null);
  }, []);

  useEffect(() => {
    if (!exportToast) return;
    const t = setTimeout(() => setExportToast(null), 3500);
    return () => clearTimeout(t);
  }, [exportToast]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("palette-color-search-history");
      if (saved) setColorSearchHistory(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("palette-color-search-history", JSON.stringify(colorSearchHistory));
    } catch {}
  }, [colorSearchHistory]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("palette-filter-presets");
      if (saved) setFilterPresets(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("palette-filter-presets", JSON.stringify(filterPresets));
    } catch {}
  }, [filterPresets]);

  // `/` focuses search bar from anywhere; Escape blurs it; `?` opens help overlay; `Shift+D` opens Find Duplicates
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (document.activeElement as HTMLElement)?.tagName;
      const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if (e.key === "?" && !inInput) {
        e.preventDefault();
        setShowHelp((v) => !v);
        return;
      }

      // Shift+D = Find Duplicates (global, not card-hover D which duplicates a palette)
      if (e.shiftKey && e.key === "D" && !inInput) {
        e.preventDefault();
        setShowDuplicates((v) => !v);
        return;
      }

      // Escape — clear keyboard card focus (harmless if already null; modals handle their own Escape)
      if (e.key === "Escape" && !inInput) {
        setFocusedCardId(null);
      }

      // J / K — navigate between palette cards (vim-style, no wrap)
      if ((e.key === "j" || e.key === "J") && !inInput && !e.shiftKey) {
        e.preventDefault();
        setFocusedCardId((prev) => {
          const ids = displayListRef.current.map((p) => p.id);
          if (!ids.length) return null;
          if (!prev || !ids.includes(prev)) return ids[0];
          const idx = ids.indexOf(prev);
          return idx < ids.length - 1 ? ids[idx + 1] : prev;
        });
        return;
      }
      if ((e.key === "k" || e.key === "K") && !inInput && !e.shiftKey) {
        e.preventDefault();
        setFocusedCardId((prev) => {
          const ids = displayListRef.current.map((p) => p.id);
          if (!ids.length) return null;
          if (!prev || !ids.includes(prev)) return ids[ids.length - 1];
          const idx = ids.indexOf(prev);
          return idx > 0 ? ids[idx - 1] : prev;
        });
        return;
      }

      if (e.key !== "/" || inInput) return;
      e.preventDefault();
      if (colorSearchActive) {
        setColorSearchActive(false);
        setColorSearchHex("");
        setActiveMood("all");
      }
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      });
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [colorSearchActive]);

  // Scroll focused card into view when J/K navigation moves it
  useEffect(() => {
    if (!focusedCardId) return;
    document.getElementById(`pc-${focusedCardId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [focusedCardId]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const fork = url.searchParams.get("fork");
    if (!fork) return;
    const [name, colorsStr, namesSegment] = fork.split("|");
    if (!name || !colorsStr) return;
    const swatchNames = namesSegment
      ? namesSegment.split("~").map((s) => { try { return decodeURIComponent(s); } catch { return s; } })
      : [];
    const colors: ColorSwatch[] = colorsStr
      .split(",")
      .filter((h) => /^[0-9a-fA-F]{6}$/.test(h))
      .map((h, i) => ({ hex: `#${h}`, ...(swatchNames[i] ? { name: swatchNames[i] } : {}) }));
    if (colors.length > 0) {
      setForkPrompt({ name: decodeURIComponent(name), colors });
      url.searchParams.delete("fork");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const allUniqueTags = Array.from(new Set(palettes.flatMap((p) => p.tags ?? [])));
  const untaggedCount = palettes.filter((p) => !p.tags?.length).length;
  const activeCollectionInfo = activeCollection !== "all" ? (collections.find((c) => c.id === activeCollection) ?? null) : null;
  const activeCollections = collections.filter((c) => !c.archived);
  const archivedCollections = collections.filter((c) => c.archived);
  const sortedActiveCollections = useMemo(() => {
    if (collectionSortBy === "default") return activeCollections;
    return [...activeCollections].sort((a, b) => {
      if (collectionSortBy === "name-asc") return a.name.localeCompare(b.name);
      if (collectionSortBy === "count-desc") {
        const ca = palettes.filter((p) => p.collectionId === a.id).length;
        const cb = palettes.filter((p) => p.collectionId === b.id).length;
        return cb - ca;
      }
      if (collectionSortBy === "cohesion-desc") {
        const pa = palettes.filter((p) => p.collectionId === a.id);
        const pb = palettes.filter((p) => p.collectionId === b.id);
        const sa = pa.length >= 2 ? computeCohesionScore(pa) : -1;
        const sb = pb.length >= 2 ? computeCohesionScore(pb) : -1;
        return sb - sa;
      }
      return 0;
    });
  }, [activeCollections, collectionSortBy, palettes]);
  const activeCollectionCount = activeCollectionInfo ? palettes.filter((p) => p.collectionId === activeCollection).length : 0;

  // Library stats (sidebar widget)
  const totalSwatches = palettes.reduce((sum, p) => sum + p.colors.length, 0);
  const annotationPct = palettes.length > 0
    ? Math.round((palettes.filter((p) => p.notes).length / palettes.length) * 100)
    : 0;
  const moodTally = new Map<PaletteMood, number>();
  for (const p of palettes) {
    const m = getPaletteMood(p.colors);
    moodTally.set(m, (moodTally.get(m) ?? 0) + 1);
  }
  const topMood: PaletteMood | null = palettes.length > 0
    ? [...moodTally.entries()].reduce((best, cur) => cur[1] > best[1] ? cur : best)[0]
    : null;
  const oldestCreatedAt = palettes.length > 0
    ? palettes.reduce((oldest, p) => p.createdAt < oldest ? p.createdAt : oldest, palettes[0].createdAt)
    : null;
  const oldestSince = oldestCreatedAt
    ? new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(oldestCreatedAt))
    : null;
  const bucketSmall = palettes.filter((p) => p.colors.length <= 4).length;
  const bucketMed   = palettes.filter((p) => p.colors.length >= 5 && p.colors.length <= 6).length;
  const bucketLarge = palettes.filter((p) => p.colors.length >= 7).length;
  const bucketMax   = Math.max(bucketSmall, bucketMed, bucketLarge, 1);
  const pinnedCount = palettes.filter((p) => p.pinned).length;
  const frozenCount = palettes.filter((p) => p.frozen).length;

  // Hue distribution: scoped to the active collection when one is selected
  const huePaletteScope = activeCollection === "all"
    ? palettes
    : palettes.filter((p) => p.collectionId === activeCollection);
  const hueBuckets: number[] = Array(12).fill(0);
  for (const p of huePaletteScope) {
    for (const c of p.colors) {
      const rgb = hexToRgb(c.hex);
      if (!rgb) continue;
      const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
      if (s < 10 || l < 5 || l > 95) continue;
      hueBuckets[Math.floor(h / 30) % 12]++;
    }
  }
  const hueCoveredCount = hueBuckets.filter((n) => n > 0).length;
  const hueIsNarrow = hueCoveredCount > 0 && hueCoveredCount < 6;

  // All tags across the library, used for bulk-tag autocomplete
  const allLibraryTagsForBulk = [...new Set(palettes.flatMap((p) => p.tags ?? []))].sort();
  const avgColors   = palettes.length > 0 ? Math.round(totalSwatches / palettes.length) : 0;

  const validColorSearch = colorSearchActive && isValidHex(colorSearchHex) ? colorSearchHex : null;
  const COLOR_MATCH_THRESHOLD = 25;

  // Record each valid search hex into history (most recent first, capped at 8)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!validColorSearch) return;
    setColorSearchHistory((prev) => {
      const filtered = prev.filter((h) => h.toLowerCase() !== validColorSearch.toLowerCase());
      return [validColorSearch, ...filtered].slice(0, 8);
    });
  }, [validColorSearch]);

  useEffect(() => {
    if (!highlightedPaletteId) return;
    // Scroll to the palette card shortly after viewMode switch renders
    const scrollTimer = setTimeout(() => {
      document.getElementById(`pc-${highlightedPaletteId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    // Clear the highlight after the animation plays
    const clearTimer = setTimeout(() => setHighlightedPaletteId(null), 2200);
    return () => { clearTimeout(scrollTimer); clearTimeout(clearTimer); };
  }, [highlightedPaletteId]);

  const isFilterActive =
    activeCollection !== "all" ||
    activeTags.length > 0 ||
    activeMood !== "all" ||
    activeFreezeFilter !== "all" ||
    printReadyOnly ||
    a11yFilter !== "all" ||
    flatToneFilter ||
    activeHueSector !== null ||
    activeColorCount !== "all" ||
    sortBy !== "newest";

  const activePresetId = useMemo(() => {
    const sortedActive = [...activeTags].sort();
    return filterPresets.find((p) => {
      const presetTags = p.tags ?? (p.tag === "all" || !p.tag ? [] : [p.tag]);
      const sortedPreset = [...presetTags].sort();
      return (
        p.collection === activeCollection &&
        sortedActive.length === sortedPreset.length &&
        sortedActive.every((t, i) => t === sortedPreset[i]) &&
        p.mood === activeMood &&
        p.freezeFilter === activeFreezeFilter &&
        p.printReadyOnly === printReadyOnly &&
        (p.a11yFilter ?? "all") === a11yFilter &&
        !!(p.flatToneFilter) === flatToneFilter &&
        p.colorCount === activeColorCount &&
        p.sortBy === sortBy
      );
    })?.id ?? null;
  }, [filterPresets, activeCollection, activeTags, activeMood, activeFreezeFilter, printReadyOnly, activeColorCount, sortBy]);

  const savePreset = useCallback((name: string) => {
    const preset: FilterPreset = {
      id: crypto.randomUUID(),
      name,
      collection: activeCollection,
      tag: activeTags.length === 1 ? activeTags[0] : "all",
      tags: activeTags,
      mood: activeMood,
      freezeFilter: activeFreezeFilter,
      printReadyOnly,
      a11yFilter,
      flatToneFilter,
      colorCount: activeColorCount,
      sortBy,
      createdAt: new Date().toISOString(),
    };
    setFilterPresets((prev) => [...prev, preset]);
    setSavePresetOpen(false);
    setPresetNameInput("");
  }, [activeCollection, activeTags, activeMood, activeFreezeFilter, printReadyOnly, activeColorCount, sortBy]);

  const applyPreset = useCallback((preset: FilterPreset) => {
    setActiveCollection(preset.collection);
    setActiveTags(preset.tags ?? (preset.tag === "all" || !preset.tag ? [] : [preset.tag]));
    setActiveMood(preset.mood as PaletteMood | "all");
    setActiveFreezeFilter(preset.freezeFilter);
    setPrintReadyOnly(preset.printReadyOnly);
    setA11yFilter(preset.a11yFilter ?? "all");
    setFlatToneFilter(preset.flatToneFilter ?? false);
    setActiveColorCount(preset.colorCount);
    setSortBy(preset.sortBy as typeof sortBy);
  }, []);

  const deletePreset = useCallback((id: string) => {
    setFilterPresets((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const baseFiltered = palettes.filter((p) => {
    const matchesCollection =
      activeCollection === "all" || p.collectionId === activeCollection;
    const matchesTag =
      activeTags.length === 0
        ? true
        : activeTags[0] === "__mine__"
        ? !p.tags?.length
        : activeTags.some((t) => p.tags?.includes(t));

    if (validColorSearch) {
      const minDelta = Math.min(...p.colors.map((c) => deltaE(c.hex, validColorSearch)));
      return matchesCollection && matchesTag && minDelta <= COLOR_MATCH_THRESHOLD;
    }

    const q = search.toLowerCase();
    const matchesSearch = !search ||
      p.name.toLowerCase().includes(q) ||
      (!!p.notes && p.notes.toLowerCase().includes(q)) ||
      p.colors.some((c) => !!c.name && c.name.toLowerCase().includes(q)) ||
      p.colors.some((c) => !!c.note && c.note.toLowerCase().includes(q));
    return matchesSearch && matchesCollection && matchesTag;
  });

  const moodCounts = new Map<PaletteMood, number>();
  for (const p of baseFiltered) {
    const mood = getPaletteMood(p.colors);
    moodCounts.set(mood, (moodCounts.get(mood) ?? 0) + 1);
  }

  const moodFiltered =
    activeMood === "all"
      ? baseFiltered
      : baseFiltered.filter((p) => getPaletteMood(p.colors) === activeMood);

  const colorCountTally = new Map<number, number>();
  for (const p of moodFiltered) {
    const n = p.colors.length;
    colorCountTally.set(n, (colorCountTally.get(n) ?? 0) + 1);
  }
  const distinctColorCounts = [...colorCountTally.keys()].sort((a, b) => a - b);

  const countFiltered = activeColorCount === "all" ? moodFiltered : moodFiltered.filter((p) => p.colors.length === activeColorCount);

  const anyFrozen = palettes.some((p) => p.frozen);
  const frozenInView = countFiltered.filter((p) => p.frozen).length;

  const freezeFiltered = activeFreezeFilter === "locked" ? countFiltered.filter((p) => p.frozen) : countFiltered;
  const anyPrintRisk = countFiltered.some((p) => palettePrintRiskAny(p));
  const anyA11y = freezeFiltered.some((p) => getPaletteA11yLevel(p) !== null);
  const aaLargeInView = freezeFiltered.filter((p) => { const l = getPaletteA11yLevel(p); return l === "AA" || l === "AA Large"; }).length;
  const aaInView = freezeFiltered.filter((p) => getPaletteA11yLevel(p) === "AA").length;
  const a11yFiltered = a11yFilter === "all" ? freezeFiltered
    : a11yFilter === "AA Large" ? freezeFiltered.filter((p) => { const l = getPaletteA11yLevel(p); return l === "AA" || l === "AA Large"; })
    : freezeFiltered.filter((p) => getPaletteA11yLevel(p) === "AA");
  const anyFlatTone = a11yFiltered.some((p) => isPaletteFlatTone(p));
  const flatToneCount = a11yFiltered.filter((p) => isPaletteFlatTone(p)).length;
  const flatToneFiltered = flatToneFilter ? a11yFiltered.filter((p) => isPaletteFlatTone(p)) : a11yFiltered;
  const hueFiltered = activeHueSector === null
    ? flatToneFiltered
    : flatToneFiltered.filter((p) =>
        p.colors.some((c) => {
          const rgb = hexToRgb(c.hex);
          if (!rgb) return false;
          const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
          if (s < 10 || l < 5 || l > 95) return false;
          return Math.floor(h / 30) % 12 === activeHueSector;
        })
      );
  const hueFilteredCount = hueFiltered.length;
  const printSafeCount = hueFiltered.filter((p) => !palettePrintRiskAny(p)).length;
  const filtered = printReadyOnly ? hueFiltered.filter((p) => !palettePrintRiskAny(p)) : hueFiltered;

  const sorted = validColorSearch
    ? [...filtered].sort((a, b) => {
        const aMin = Math.min(...a.colors.map((c) => deltaE(c.hex, validColorSearch)));
        const bMin = Math.min(...b.colors.map((c) => deltaE(c.hex, validColorSearch)));
        return aMin - bMin;
      })
    : [...filtered].sort((a, b) => {
        switch (sortBy) {
          case "newest": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case "oldest": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case "name-asc": return a.name.localeCompare(b.name);
          case "name-desc": return b.name.localeCompare(a.name);
          case "most-colors": return b.colors.length - a.colors.length;
          case "most-notes": return (b.notes?.length ?? 0) - (a.notes?.length ?? 0);
          case "light-first": return paletteMeanLightness(b) - paletteMeanLightness(a);
          case "dark-first": return paletteMeanLightness(a) - paletteMeanLightness(b);
          case "most-clipped": return paletteGamutClippedCount(b) - paletteGamutClippedCount(a);
          case "most-print-risk": return palettePrintRiskCount(b) - palettePrintRiskCount(a);
          case "most-varied": return paletteOklchLRange(b) - paletteOklchLRange(a);
          case "print-safe-first": return palettePrintRiskCount(a) - palettePrintRiskCount(b);
        }
      });

  const coverPaletteId = activeCollectionInfo?.coverPaletteId ?? null;

  const frozenSelectedCount = selectedIds.size > 0
    ? [...selectedIds].filter(id => palettes.find(p => p.id === id)?.frozen).length
    : 0;
  const deletableSelectedIds = selectedIds.size > 0
    ? [...selectedIds].filter(id => !palettes.find(p => p.id === id)?.frozen)
    : [];

  // Pinned palettes always first; cover palette first within the unpinned section
  const displayList = (() => {
    const pinnedItems = sorted.filter((p) => p.pinned);
    const rest = sorted.filter((p) => !p.pinned);
    if (activeCollection !== "all" && coverPaletteId) {
      const coverIdx = rest.findIndex((p) => p.id === coverPaletteId);
      if (coverIdx > 0) {
        const reordered = [...rest];
        const [cover] = reordered.splice(coverIdx, 1);
        reordered.unshift(cover);
        return [...pinnedItems, ...reordered];
      }
    }
    return [...pinnedItems, ...rest];
  })();
  const pinnedDisplay = displayList.filter((p) => p.pinned);
  const unpinnedDisplay = displayList.filter((p) => !p.pinned);
  // Keep ref current so J/K handler always sees the latest ordered list without re-registering
  displayListRef.current = displayList;

  // Color Browser: all unique hex values from currently-filtered palettes, sorted by oklch hue
  const colorIndex = useMemo(() => {
    const map = new Map<string, { hex: string; paletteIds: string[]; paletteNames: string[]; hue: number; lightness: number }>();
    filtered.forEach((palette) => {
      palette.colors.forEach((c) => {
        const hex = c.hex.toLowerCase();
        const oklch = hexToOklch(hex);
        const hue = oklch ? oklch.h : 0;
        const lightness = oklch ? oklch.l : 0.5;
        const existing = map.get(hex);
        if (existing) {
          if (!existing.paletteIds.includes(palette.id)) {
            existing.paletteIds.push(palette.id);
            existing.paletteNames.push(palette.name);
          }
        } else {
          map.set(hex, { hex, paletteIds: [palette.id], paletteNames: [palette.name], hue, lightness });
        }
      });
    });
    return [...map.values()].sort((a, b) => {
      const ah = ((a.hue % 360) + 360) % 360;
      const bh = ((b.hue % 360) + 360) % 360;
      if (Math.abs(ah - bh) > 1) return ah - bh;
      return a.lightness - b.lightness;
    });
  }, [filtered]);

  const paletteLookup = useMemo(() => {
    const map = new Map<string, { name: string; colors: { hex: string }[]; collectionId?: string }>();
    for (const p of palettes) {
      map.set(p.id, { name: p.name, colors: p.colors, collectionId: p.collectionId });
    }
    return map;
  }, [palettes]);

  const handleSetCover = (palette: Palette) => {
    if (activeCollection === "all") return;
    const newCoverId = palette.id === coverPaletteId ? undefined : palette.id;
    updateCollection(activeCollection, { coverPaletteId: newCoverId });
  };

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setBulkDeleteConfirm(false);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setBulkDeleteConfirm(false);
    setBulkTagOpen(false);
    setBulkTagInput("");
  }, []);

  const applyBulkTag = useCallback((tag: string) => {
    const normalized = tag.toLowerCase().trim();
    if (!normalized) return;
    [...selectedIds].forEach((id) => {
      const p = palettes.find((pp) => pp.id === id);
      if (!p) return;
      const tags = p.tags ?? [];
      if (!tags.includes(normalized)) {
        updatePalette(id, { tags: [...tags, normalized] });
      }
    });
    setBulkTagInput("");
    setBulkTagOpen(false);
  }, [selectedIds, palettes, updatePalette]);

  const removeBulkTag = useCallback((tag: string) => {
    const normalized = tag.toLowerCase().trim();
    if (!normalized) return;
    [...selectedIds].forEach((id) => {
      const p = palettes.find((pp) => pp.id === id);
      if (!p) return;
      const tags = p.tags ?? [];
      if (tags.includes(normalized)) {
        updatePalette(id, { tags: tags.filter((t) => t !== normalized) });
      }
    });
    setBulkTagInput("");
    setBulkTagOpen(false);
  }, [selectedIds, palettes, updatePalette]);

  const bulkToggleFreeze = useCallback(() => {
    const allFrozen = [...selectedIds].every(id => palettes.find(p => p.id === id)?.frozen);
    [...selectedIds].forEach((id) => {
      updatePalette(id, { frozen: !allFrozen });
    });
  }, [selectedIds, palettes, updatePalette]);

  const selectAllVisible = useCallback(() => {
    setSelectedIds(new Set(sorted.map((p) => p.id)));
    setBulkDeleteConfirm(false);
  }, [sorted]);

  // Clear keyboard focus when the focused palette is filtered out of view
  useEffect(() => {
    if (focusedCardId && !displayList.some((p) => p.id === focusedCardId)) {
      setFocusedCardId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted]);

  const toggleTag = useCallback((tag: string) => {
    if (tag === "all") { setActiveTags([]); return; }
    if (tag === "__mine__") { setActiveTags(["__mine__"]); return; }
    setActiveTags((prev) => {
      const withoutMine = prev.filter((t) => t !== "__mine__");
      return withoutMine.includes(tag)
        ? withoutMine.filter((t) => t !== tag)
        : [...withoutMine, tag];
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--background)]/90 backdrop-blur-md border-b border-[var(--border-subtle)]">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-300 via-violet-300 to-sky-300 flex-shrink-0" />
            <span className="text-base font-semibold tracking-tight">Palette</span>
            <span className="text-xs text-[var(--muted)] hidden sm:block">— color intelligence for creators</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-[var(--muted)]">
              <Sparkles size={12} />
              <span>{palettes.length} palette{palettes.length !== 1 ? "s" : ""}</span>
            </div>
            <button
              onClick={() => setShowHelp(true)}
              title="Keyboard shortcuts (?)"
              className="flex items-center justify-center w-5 h-5 rounded text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors text-[11px] font-semibold font-mono border border-[var(--border)] leading-none"
            >
              ?
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-8">
          {/* Left panel — Extractor */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-3">
                Extract
              </h2>
              <Extractor
                seedHex={trendSeed?.hex}
                seedName={trendSeed?.name}
                onSeedConsumed={() => setTrendSeed(undefined)}
              />
            </div>

            {/* Library stats panel */}
            {palettes.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-3">
                  Stats
                </h2>
                <div className="border border-[var(--border)] rounded-[var(--radius-sm)] overflow-hidden text-center">
                  <div className="grid grid-cols-3 divide-x divide-[var(--border)]">
                    <div className="px-2 py-2.5 bg-[var(--surface)]">
                      <div className="text-sm font-bold tabular-nums leading-none">
                        <AnimatedStat value={palettes.length} />
                      </div>
                      <div className="text-[9px] text-[var(--muted)] uppercase tracking-wide mt-1">palettes</div>
                    </div>
                    <div className="px-2 py-2.5 bg-[var(--surface)]">
                      <div className="text-sm font-bold tabular-nums leading-none">
                        <AnimatedStat value={totalSwatches} />
                      </div>
                      <div className="text-[9px] text-[var(--muted)] uppercase tracking-wide mt-1">swatches</div>
                    </div>
                    <div className="px-2 py-2.5 bg-[var(--surface)]">
                      <div className="text-sm font-bold tabular-nums leading-none">
                        <AnimatedStat value={collections.length} />
                      </div>
                      <div className="text-[9px] text-[var(--muted)] uppercase tracking-wide mt-1">collections</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-[var(--border)] border-t border-[var(--border)]">
                    <div className="px-2 py-2.5 bg-[var(--surface)]">
                      <div className="text-sm font-bold tabular-nums leading-none">
                        <AnimatedStat value={annotationPct} suffix="%" />
                      </div>
                      <div className="text-[9px] text-[var(--muted)] uppercase tracking-wide mt-1">annotated</div>
                    </div>
                    <div className="px-2 py-2.5 bg-[var(--surface)] flex flex-col items-center justify-center">
                      {topMood ? (
                        <>
                          <div className="flex items-center gap-1 leading-none">
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: MOOD_PILL_STYLES[topMood].dot }}
                            />
                            <span className="text-[11px] font-semibold">{topMood}</span>
                          </div>
                          <div className="text-[9px] text-[var(--muted)] uppercase tracking-wide mt-1">top mood</div>
                        </>
                      ) : (
                        <>
                          <div className="text-sm font-bold leading-none">—</div>
                          <div className="text-[9px] text-[var(--muted)] uppercase tracking-wide mt-1">top mood</div>
                        </>
                      )}
                    </div>
                    <div
                      className="px-2 py-2.5 bg-[var(--surface)]"
                      title={oldestCreatedAt ? `Oldest palette: ${formatDate(oldestCreatedAt)}` : undefined}
                    >
                      <div className="text-[11px] font-semibold leading-none truncate">{oldestSince ?? "—"}</div>
                      <div className="text-[9px] text-[var(--muted)] uppercase tracking-wide mt-1">oldest</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-[var(--border)] border-t border-[var(--border)]">
                    <div className="px-2 py-2.5 bg-[var(--surface)]" title={pinnedCount > 0 ? `${pinnedCount} palette${pinnedCount !== 1 ? "s" : ""} pinned to top` : "No pinned palettes"}>
                      <div className="text-sm font-bold tabular-nums leading-none" style={{ color: pinnedCount > 0 ? "#f97316" : undefined }}>
                        <AnimatedStat value={pinnedCount} />
                      </div>
                      <div className="text-[9px] text-[var(--muted)] uppercase tracking-wide mt-1">pinned</div>
                    </div>
                    <div className="px-2 py-2.5 bg-[var(--surface)]" title={frozenCount > 0 ? `${frozenCount} palette${frozenCount !== 1 ? "s" : ""} frozen` : "No frozen palettes"}>
                      <div className="text-sm font-bold tabular-nums leading-none" style={{ color: frozenCount > 0 ? "#6366f1" : undefined }}>
                        <AnimatedStat value={frozenCount} />
                      </div>
                      <div className="text-[9px] text-[var(--muted)] uppercase tracking-wide mt-1">frozen</div>
                    </div>
                    <div className="px-2 py-2.5 bg-[var(--surface)]" title={`Average palette size: ${avgColors} color${avgColors !== 1 ? "s" : ""}`}>
                      <div className="text-sm font-bold tabular-nums leading-none">
                        <AnimatedStat value={avgColors} />
                      </div>
                      <div className="text-[9px] text-[var(--muted)] uppercase tracking-wide mt-1">avg size</div>
                    </div>
                  </div>
                  {/* Sparkline — palette size distribution */}
                  <div className="border-t border-[var(--border)] px-3 py-2 bg-[var(--surface)]">
                    <div className="text-[9px] text-[var(--muted)] uppercase tracking-wide mb-2">size distribution</div>
                    <div className="flex gap-1.5">
                      {[
                        { label: "1–4", count: bucketSmall, color: "#a78bfa" },
                        { label: "5–6", count: bucketMed,   color: "#818cf8" },
                        { label: "7+",  count: bucketLarge,  color: "#60a5fa" },
                      ].map(({ label, count, color }) => {
                        const barH = count === 0 ? 2 : Math.max(3, Math.round((count / bucketMax) * 24));
                        return (
                          <div key={label} className="flex-1 flex flex-col items-center">
                            <div className="w-full flex flex-col justify-end mb-1" style={{ height: 24 }}>
                              <div
                                className="w-full rounded-[2px] transition-all duration-500"
                                style={{
                                  height: barH,
                                  backgroundColor: count > 0 ? color : "var(--border)",
                                }}
                                title={`${count} palette${count !== 1 ? "s" : ""}`}
                              />
                            </div>
                            <div className="text-[8px] text-[var(--muted)] leading-none">{label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* Hue coverage wheel */}
                  <div className="border-t border-[var(--border)] px-3 py-2.5 bg-[var(--surface)] flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="text-[9px] text-[var(--muted)] uppercase tracking-wide">hue coverage</div>
                        {activeCollection !== "all" && (
                          <div className="text-[8px] text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-1 py-px rounded leading-none truncate max-w-[70px]" title={activeCollectionInfo?.name}>
                            {activeCollectionInfo?.name}
                          </div>
                        )}
                      </div>
                      <div className="text-[9px] text-[var(--muted)]/60 tabular-nums leading-snug">
                        {activeHueSector !== null
                          ? <span style={{ color: `hsl(${activeHueSector * 30 + 15}, 70%, 50%)` }}>{HUE_SECTOR_NAMES[activeHueSector]} · {hueFilteredCount} palette{hueFilteredCount !== 1 ? "s" : ""}</span>
                          : <>{hueCoveredCount}/12 sectors</>
                        }
                      </div>
                      {hueIsNarrow && activeHueSector === null && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                          <span className="text-[8px] text-amber-500 leading-none">Narrow range</span>
                        </div>
                      )}
                      <div className="text-[8px] text-[var(--muted)]/40 mt-0.5 leading-snug">
                        {activeHueSector !== null ? "click arc to change · click again to clear" : "click arc to filter · hover for name"}
                      </div>
                    </div>
                    <LibraryHueWheel
                      buckets={hueBuckets}
                      activeSector={activeHueSector}
                      onSectorClick={(s) => setActiveHueSector(activeHueSector === s ? null : s)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Discover button */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-3">
                Discover
              </h2>
              <button
                onClick={() => setShowTrendLibrary(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-sm)] border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--surface-2)] transition-all text-sm group"
              >
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-rose-200 via-violet-200 to-sky-200 flex items-center justify-center flex-shrink-0">
                  <Compass size={13} className="text-violet-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-[var(--foreground)]">Trend Library</div>
                  <div className="text-[11px] text-[var(--muted)]">22 seasonal palettes to fork</div>
                </div>
              </button>
              <button
                onClick={() => setShowImport(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-sm)] border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--surface-2)] transition-all text-sm group mt-1"
              >
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-100 via-teal-100 to-cyan-100 flex items-center justify-center flex-shrink-0">
                  <Import size={13} className="text-teal-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-[var(--foreground)]">Import Palette</div>
                  <div className="text-[11px] text-[var(--muted)]">Hex codes or from a URL</div>
                </div>
              </button>
              {palettes.length >= 2 && (
                <button
                  onClick={() => setShowDuplicates(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-sm)] border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--surface-2)] transition-all text-sm group mt-1"
                >
                  <div className="w-7 h-7 rounded-md bg-gradient-to-br from-violet-100 to-rose-100 dark:from-violet-900/30 dark:to-rose-900/30 flex items-center justify-center flex-shrink-0">
                    <ScanSearch size={13} className="text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-[var(--foreground)]">Find Duplicates</div>
                    <div className="text-[11px] text-[var(--muted)]">Detect near-identical palettes</div>
                  </div>
                </button>
              )}
              {/* Tag inventory — compact count summary */}
              {palettes.length > 0 && (allUniqueTags.length > 0 || untaggedCount > 0) && (
                <div className="mt-2 flex flex-wrap gap-x-2.5 gap-y-0.5 pl-1">
                  {untaggedCount > 0 && (
                    <button
                      onClick={() => toggleTag("__mine__")}
                      className={`text-[11px] transition-colors ${
                        activeTags[0] === "__mine__"
                          ? "text-[var(--accent)] font-medium"
                          : "text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      Mine <span className="tabular-nums font-semibold">{untaggedCount}</span>
                    </button>
                  )}
                  {allUniqueTags.map((tag) => {
                    const count = palettes.filter((p) => p.tags?.includes(tag)).length;
                    const label = tag.charAt(0).toUpperCase() + tag.slice(1);
                    const specialStyle = SPECIAL_TAG_STYLES[tag];
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`flex items-center gap-1 text-[11px] transition-colors ${
                          activeTags.includes(tag)
                            ? `${specialStyle?.sidebarActiveText ?? "text-[var(--accent)]"} font-medium`
                            : "text-[var(--muted)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: specialStyle?.dot ?? getTagDotColor(tag) }}
                        />
                        {label} <span className="tabular-nums font-semibold">{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Collections sidebar */}
            {collections.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
                    Collections
                  </h2>
                  <select
                    value={collectionSortBy}
                    onChange={(e) => setCollectionSortBy(e.target.value as typeof collectionSortBy)}
                    title="Sort collections"
                    className="ml-auto text-[9px] font-medium bg-transparent text-[var(--muted)] hover:text-[var(--foreground)] border-0 outline-none cursor-pointer transition-colors py-0 pr-0 appearance-none"
                  >
                    <option value="default">Added</option>
                    <option value="cohesion-desc">Most cohesive</option>
                    <option value="name-asc">A → Z</option>
                    <option value="count-desc">Most palettes</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => setActiveCollection("all")}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] text-sm transition-colors ${
                      activeCollection === "all"
                        ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                        : "hover:bg-[var(--surface-2)] text-[var(--foreground)]"
                    }`}
                  >
                    <Layers size={13} />
                    All palettes
                    <span className="ml-auto text-xs opacity-60">{palettes.length}</span>
                  </button>
                  {sortedActiveCollections.map((c) => {
                    const collectionPalettes = palettes.filter((p) => p.collectionId === c.id);
                    const count = collectionPalettes.length;
                    const swatchCount = collectionPalettes.reduce((acc, p) => acc + p.colors.length, 0);
                    const cohesionScore = count >= 2 ? computeCohesionScore(collectionPalettes) : null;
                    const scoreColor =
                      cohesionScore === null ? undefined :
                      cohesionScore >= 80 ? "#10b981" :
                      cohesionScore >= 60 ? "#0ea5e9" :
                      cohesionScore >= 40 ? "#f59e0b" : "#f43f5e";
                    const isActive = activeCollection === c.id;
                    const isRenaming = renamingCollectionId === c.id;
                    const isFlashing = flashedCollectionId === c.id;
                    const collectionPrintSafe = count > 0 && swatchCount > 0 && collectionPalettes.every(p => !palettePrintRiskAny(p));

                    const scoreAndCount = (
                      <div className="ml-auto flex items-center gap-1.5 shrink-0">
                        {collectionPrintSafe && (
                          <span title="All palettes in this collection are print-safe (no CMYK gamut risk)" className="flex items-center">
                            <CheckCircle2
                              size={9}
                              className={`flex-shrink-0 ${isActive ? "opacity-60" : "text-emerald-500 dark:text-emerald-400"}`}
                            />
                          </span>
                        )}
                        {cohesionScore !== null && (
                          <span
                            className="text-[9px] font-bold tabular-nums leading-none"
                            style={{ color: isActive ? "currentColor" : scoreColor, opacity: isActive ? 0.75 : 1 }}
                            title={`Cohesion score: ${cohesionScore}/100`}
                          >
                            {cohesionScore}
                          </span>
                        )}
                        <div
                          className="flex flex-col items-end leading-none gap-[2px]"
                          title={`${count} palette${count !== 1 ? "s" : ""} · ${swatchCount} swatch${swatchCount !== 1 ? "es" : ""}`}
                        >
                          <span className="text-xs opacity-60 tabular-nums">{count}</span>
                          {swatchCount > 0 && (
                            <span className="text-[8px] opacity-35 tabular-nums">{swatchCount}</span>
                          )}
                        </div>
                      </div>
                    );

                    return (
                      <div
                        key={c.id}
                        id={`col-${c.id}`}
                        className="group/col relative flex items-center gap-1"
                        onMouseEnter={() => !isRenaming && setHoveredCollectionId(c.id)}
                        onMouseLeave={() => setHoveredCollectionId(null)}
                      >
                        {isFlashing && (
                          <div
                            className="absolute inset-0 rounded-[var(--radius-sm)] pointer-events-none"
                            style={{
                              background: "rgba(139,92,246,1)",
                              animation: "col-flash 750ms ease-out forwards",
                            }}
                          />
                        )}
                        {isRenaming ? (
                          <div className={`flex-1 flex flex-col gap-0.5 px-3 py-2 rounded-[var(--radius-sm)] text-sm ${
                            isActive ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "bg-[var(--surface-2)]"
                          }`}>
                            <div className="flex items-center gap-2">
                              <FolderOpen size={13} className="shrink-0" />
                              <input
                                autoFocus
                                type="text"
                                value={inlineCollectionName}
                                onChange={(e) => setInlineCollectionName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") { e.preventDefault(); commitCollectionRename(); }
                                  if (e.key === "Escape") { e.preventDefault(); cancelCollectionRename(); }
                                }}
                                onBlur={(e) => {
                                  if ((e.relatedTarget as HTMLElement | null)?.dataset?.descField === "true") return;
                                  commitCollectionRename();
                                }}
                                className="flex-1 min-w-0 bg-transparent outline-none text-sm"
                                spellCheck={false}
                              />
                              {scoreAndCount}
                            </div>
                            <input
                              type="text"
                              data-desc-field="true"
                              placeholder="Add a description…"
                              value={inlineCollectionDesc}
                              onChange={(e) => setInlineCollectionDesc(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") { e.preventDefault(); commitCollectionRename(); }
                                if (e.key === "Escape") { e.preventDefault(); cancelCollectionRename(); }
                              }}
                              onBlur={commitCollectionRename}
                              className="ml-[21px] bg-transparent outline-none text-xs italic placeholder:opacity-40"
                              style={{ color: "inherit", opacity: 0.65 }}
                              spellCheck={false}
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => setActiveCollection(c.id)}
                            className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] text-sm transition-colors ${
                              isActive
                                ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                                : "hover:bg-[var(--surface-2)] text-[var(--foreground)]"
                            }`}
                          >
                            <FolderOpen size={13} className="shrink-0" />
                            <span
                              className="truncate"
                              title={c.description ?? undefined}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setRenamingCollectionId(c.id);
                                setInlineCollectionName(c.name);
                                setInlineCollectionDesc(c.description ?? "");
                                setHoveredCollectionId(null);
                              }}
                            >
                              {c.name}
                            </span>
                            {scoreAndCount}
                          </button>
                        )}
                        {!isRenaming && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenamingCollectionId(c.id);
                              setInlineCollectionName(c.name);
                              setInlineCollectionDesc(c.description ?? "");
                              setHoveredCollectionId(null);
                            }}
                            className="p-1.5 rounded opacity-0 group-hover/col:opacity-100 transition-opacity hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)] shrink-0"
                            title={`Rename "${c.name}"`}
                          >
                            <Pencil size={12} />
                          </button>
                        )}
                        {!isRenaming && count > 0 && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (collectionExporting === c.id) return;
                              setCollectionExporting(c.id);
                              try {
                                await batchExportZip(collectionPalettes, c.name);
                                setExportToast({ count: collectionPalettes.length, source: c.name });
                              } finally {
                                setCollectionExporting(null);
                              }
                            }}
                            className="p-1.5 rounded opacity-0 group-hover/col:opacity-100 transition-opacity hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)] shrink-0"
                            title={`Export all ${count} palette${count !== 1 ? "s" : ""} in "${c.name}" as ZIP`}
                          >
                            {collectionExporting === c.id
                              ? <Loader2 size={12} className="animate-spin" />
                              : <Download size={12} />
                            }
                          </button>
                        )}
                        {!isRenaming && (
                          <button
                            onClick={() => {
                              if (activeCollection === c.id) setActiveCollection("all");
                              updateCollection(c.id, { archived: true });
                            }}
                            className="p-1.5 rounded opacity-0 group-hover/col:opacity-100 transition-opacity hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-amber-500 shrink-0"
                            title={`Archive "${c.name}"`}
                          >
                            <Archive size={12} />
                          </button>
                        )}
                        {!isRenaming && (
                          <button
                            onClick={() => setCohesionTarget(c)}
                            className="p-1.5 rounded opacity-0 group-hover/col:opacity-100 transition-opacity hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)] shrink-0"
                            title="Cohesion view"
                          >
                            <BarChart2 size={12} />
                          </button>
                        )}

                        {/* Palette preview tooltip — appears on hover to the right */}
                        {!isRenaming && collectionPalettes.length > 0 && (
                          <div
                            className={`hidden lg:block absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 transition-opacity duration-200 ${
                              hoveredCollectionId === c.id ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                            }`}
                            onMouseEnter={() => setHoveredCollectionId(c.id)}
                            onMouseLeave={() => setHoveredCollectionId(null)}
                          >
                            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-2xl p-3 w-60">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] truncate">{c.name}</p>
                              {c.description && (
                                <p className="text-[10px] italic text-[var(--muted)] mt-0.5 mb-2 line-clamp-2" style={{ opacity: 0.7 }}>{c.description}</p>
                              )}
                              <div className={`space-y-1 ${c.description ? "" : "mt-2.5"}`}>
                                {collectionPalettes.slice(0, 7).map((p) => (
                                  <div key={p.id} className="group/row flex items-center gap-2">
                                    <div className="flex rounded-sm overflow-hidden h-[14px] flex-1 min-w-0">
                                      {p.colors.slice(0, 8).map((color, i) => (
                                        <div key={i} className="flex-1" style={{ backgroundColor: color.hex }} />
                                      ))}
                                    </div>
                                    <span className="text-[9px] text-[var(--muted)] truncate shrink-0 max-w-[64px]">{p.name}</span>
                                    <button
                                      onClick={() => { const copy = duplicatePalette(p.id); if (copy) setRenameTarget(copy); }}
                                      title={`Duplicate "${p.name}"`}
                                      className="shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity p-0.5 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)]"
                                    >
                                      <CopyPlus size={10} />
                                    </button>
                                  </div>
                                ))}
                                {collectionPalettes.length > 7 && (
                                  <p className="text-[9px] text-[var(--muted)] text-center pt-0.5">
                                    +{collectionPalettes.length - 7} more
                                  </p>
                                )}
                              </div>
                              {(cohesionScore !== null || collectionPrintSafe) && (
                                <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle)] space-y-1.5">
                                  {cohesionScore !== null && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] text-[var(--muted)]">Cohesion</span>
                                      <span className="text-[10px] font-bold tabular-nums" style={{ color: scoreColor ?? "var(--muted)" }}>
                                        {cohesionScore}/100
                                      </span>
                                    </div>
                                  )}
                                  {collectionPrintSafe && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] text-[var(--muted)]">Print-safe</span>
                                      <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                                        <CheckCircle2 size={9} />
                                        All safe
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Archived collections — collapsible section */}
                {archivedCollections.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-[var(--border-subtle)]">
                    <button
                      onClick={() => setShowArchivedCollections((v) => !v)}
                      className="w-full flex items-center gap-1.5 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                    >
                      {showArchivedCollections ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                      Archived · {archivedCollections.length}
                    </button>
                    <AnimatePresence>
                      {showArchivedCollections && (
                        <motion.div
                          key="archived-list"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-0.5 mt-1.5">
                            {archivedCollections.map((c) => {
                              const count = palettes.filter((p) => p.collectionId === c.id).length;
                              const isActive = activeCollection === c.id;
                              return (
                                <div key={c.id} className="group/col-arch flex items-center gap-1">
                                  <button
                                    onClick={() => setActiveCollection(c.id)}
                                    className={`flex-1 flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs transition-colors ${
                                      isActive
                                        ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                                        : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                                    }`}
                                  >
                                    <FolderOpen size={11} className="shrink-0 opacity-60" />
                                    <span className="truncate">{c.name}</span>
                                    <span className="ml-auto opacity-50">{count}</span>
                                  </button>
                                  <button
                                    onClick={() => updateCollection(c.id, { archived: false })}
                                    className="p-1.5 rounded opacity-0 group-hover/col-arch:opacity-100 transition-opacity hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-emerald-600 shrink-0"
                                    title={`Restore "${c.name}" to active collections`}
                                  >
                                    <RotateCcw size={11} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right panel — Library */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] shrink-0">
                Library
              </h2>
              {activeCollectionInfo && (
                <span className="text-[11px] text-[var(--muted)] font-normal normal-case tracking-normal shrink-0 truncate max-w-[140px]">
                  — {activeCollectionInfo.name} · {activeCollectionCount}
                </span>
              )}
              {/* View mode toggle */}
              {palettes.length > 0 && (
                <div className="flex items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden shrink-0 mr-auto">
                  <button
                    onClick={() => setViewMode("palettes")}
                    className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      viewMode === "palettes"
                        ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                    title="Palette view"
                  >
                    Palettes
                  </button>
                  <button
                    onClick={() => setViewMode("colors")}
                    className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      viewMode === "colors"
                        ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                    title="Browse all colors by hue"
                  >
                    Colors
                    {viewMode === "colors" && colorIndex.length > 0 && (
                      <span className="ml-1 opacity-70">{colorIndex.length}</span>
                    )}
                  </button>
                </div>
              )}
              {palettes.length > 0 && (
                <>
                  {!colorSearchActive && (
                    <>
                      <div className="flex-1 relative">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                        <input
                          ref={searchInputRef}
                          type="text"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              e.currentTarget.blur();
                              setSearch("");
                            }
                          }}
                          placeholder="Search palettes, colors & notes…"
                          className="w-full text-sm bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-sm)] pl-8 pr-8 py-1.5 outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--muted)]"
                        />
                        {!search && (
                          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)] font-mono bg-[var(--surface-2)] border border-[var(--border)] rounded px-1 py-0.5 pointer-events-none select-none leading-none">
                            /
                          </kbd>
                        )}
                        {search && (
                          <button
                            onClick={() => { setSearch(""); searchInputRef.current?.focus(); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                            aria-label="Clear search"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--surface)] px-2 py-1.5 text-[var(--muted)] hover:border-[var(--accent)] transition-colors">
                        <ArrowUpDown size={11} className="shrink-0" />
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                          className="bg-transparent outline-none text-xs text-[var(--foreground)] cursor-pointer appearance-none"
                          aria-label="Sort palettes"
                        >
                          <option value="newest">Newest</option>
                          <option value="oldest">Oldest</option>
                          <option value="name-asc">Name A→Z</option>
                          <option value="name-desc">Name Z→A</option>
                          <option value="most-colors">Most colors</option>
                          <option value="most-notes">Most annotated</option>
                          <option value="light-first">Lightest first</option>
                          <option value="dark-first">Darkest first</option>
                          <option value="most-clipped">Most gamut-clipped</option>
                          <option value="most-print-risk">Most print risk</option>
                          <option value="most-varied">Most varied</option>
                          <option value="print-safe-first">Print safe first</option>
                        </select>
                      </div>
                    </>
                  )}
                  {colorSearchActive && (
                    <>
                      {/* Color swatch + native picker */}
                      <div
                        className="relative w-8 h-8 rounded-[var(--radius-sm)] overflow-hidden flex-shrink-0 border-2 border-[var(--accent)] cursor-pointer"
                        style={{ backgroundColor: validColorSearch || "#cccccc" }}
                        title="Click to open color picker"
                      >
                        <input
                          type="color"
                          value={validColorSearch || "#cccccc"}
                          onChange={(e) => setColorSearchHex(e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          aria-label="Pick a color"
                        />
                      </div>
                      {/* Hex input */}
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={colorSearchHex}
                          onChange={(e) => {
                            let v = e.target.value.trim();
                            if (v && !v.startsWith("#")) v = "#" + v;
                            setColorSearchHex(v.slice(0, 7));
                          }}
                          onFocus={async () => {
                            setShowSearchHistory(true);
                            if (colorSearchHex) return;
                            try {
                              const text = await navigator.clipboard.readText();
                              const cleaned = text.trim();
                              const hex = cleaned.startsWith("#") ? cleaned : "#" + cleaned;
                              if (isValidHex(hex)) setColorSearchHex(hex);
                            } catch { /* clipboard access denied */ }
                          }}
                          onBlur={() => setTimeout(() => setShowSearchHistory(false), 150)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") setShowSearchHistory(false);
                          }}
                          placeholder="#rrggbb — find by color"
                          autoFocus
                          className="w-full text-sm bg-[var(--surface)] border border-[var(--accent)] rounded-[var(--radius-sm)] pl-3 pr-3 py-1.5 outline-none transition-colors placeholder:text-[var(--muted)] font-mono"
                          spellCheck={false}
                        />
                        <AnimatePresence>
                          {showSearchHistory && colorSearchHistory.length > 0 && (
                            <motion.div
                              key="color-search-history"
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ duration: 0.15 }}
                              className="absolute top-full left-0 right-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] shadow-xl z-50 overflow-hidden"
                            >
                              <div className="flex items-center justify-between px-2.5 pt-2 pb-1">
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Recent</span>
                                <button
                                  onMouseDown={(e) => { e.preventDefault(); setColorSearchHistory([]); setShowSearchHistory(false); }}
                                  className="text-[10px] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                                >
                                  Clear
                                </button>
                              </div>
                              {colorSearchHistory.map((hex) => (
                                <div
                                  key={hex}
                                  className="group/hist flex items-center hover:bg-[var(--surface-2)] transition-colors"
                                >
                                  <button
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setColorSearchHex(hex);
                                      setShowSearchHistory(false);
                                    }}
                                    className="flex-1 flex items-center gap-2.5 px-2.5 py-1.5 text-left"
                                  >
                                    <div
                                      className="w-5 h-5 rounded-sm flex-shrink-0 border border-[var(--border)]"
                                      style={{ backgroundColor: hex }}
                                    />
                                    <span className="text-sm font-mono text-[var(--foreground)]">{hex}</span>
                                  </button>
                                  <button
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setColorSearchHistory((h) => h.filter((v) => v !== hex));
                                    }}
                                    title="Remove from history"
                                    className="opacity-0 group-hover/hist:opacity-100 transition-opacity mr-2 p-1 rounded text-[var(--muted)] hover:text-[var(--foreground)]"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              ))}
                              <div className="h-1.5" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      {validColorSearch && (
                        <span className="text-[10px] text-[var(--muted)] shrink-0 whitespace-nowrap">sorted by match</span>
                      )}
                    </>
                  )}
                  {/* Active view badge — shown when current filters match a saved preset exactly */}
                  {!colorSearchActive && !savePresetOpen && activePresetId && (
                    <span
                      title={`Active view: ${filterPresets.find((p) => p.id === activePresetId)?.name}`}
                      className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-700 border border-violet-300 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-700 shrink-0 whitespace-nowrap"
                    >
                      <CheckCircle2 size={9} className="shrink-0" />
                      {filterPresets.find((p) => p.id === activePresetId)?.name}
                    </span>
                  )}
                  {/* Save view button — shown when filters are non-default and no preset is active */}
                  {!colorSearchActive && !savePresetOpen && isFilterActive && !activePresetId && (
                    <button
                      onClick={() => { setSavePresetOpen(true); setPresetNameInput(""); }}
                      title="Save current filters as a view"
                      className="p-1.5 rounded-[var(--radius-sm)] border transition-all shrink-0 border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-violet-400 hover:text-violet-600 dark:hover:border-violet-600 dark:hover:text-violet-400"
                    >
                      <BookmarkPlus size={13} />
                    </button>
                  )}
                  {!colorSearchActive && savePresetOpen && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        ref={presetNameInputRef}
                        type="text"
                        value={presetNameInput}
                        onChange={(e) => setPresetNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && presetNameInput.trim()) savePreset(presetNameInput.trim());
                          if (e.key === "Escape") setSavePresetOpen(false);
                        }}
                        placeholder="View name…"
                        autoFocus
                        maxLength={32}
                        className="w-28 text-xs bg-[var(--surface)] border border-violet-400 rounded-[var(--radius-sm)] px-2 py-1.5 outline-none placeholder:text-[var(--muted)] focus:border-violet-500"
                      />
                      <button
                        onClick={() => { if (presetNameInput.trim()) savePreset(presetNameInput.trim()); }}
                        disabled={!presetNameInput.trim()}
                        className="text-xs px-2 py-1.5 rounded-[var(--radius-sm)] bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setSavePresetOpen(false)}
                        className="p-1 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                        title="Cancel"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  {/* Color search toggle */}
                  <button
                    onClick={() => {
                      if (colorSearchActive) setActiveMood("all");
                      setColorSearchActive(!colorSearchActive);
                      setColorSearchHex("");
                    }}
                    title={colorSearchActive ? "Exit color search" : "Search by color"}
                    className={`p-1.5 rounded-[var(--radius-sm)] border transition-all shrink-0 ${
                      colorSearchActive
                        ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    <Pipette size={13} />
                  </button>
                </>
              )}
            </div>

            {/* Inline mood filter — only shown when color search is active */}
            <AnimatePresence>
              {colorSearchActive && validColorSearch && baseFiltered.length > 0 && (
                <motion.div
                  key="color-search-mood"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap items-center gap-1.5 pb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)] shrink-0 mr-0.5">
                      Filter
                    </span>
                    {/* Mood pills sourced from color-search results */}
                    {moodCounts.size >= 2 && (
                      <>
                        <button
                          onClick={() => setActiveMood("all")}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                            activeMood === "all"
                              ? "bg-[var(--accent)] text-[var(--accent-fg)] border-[var(--accent)] shadow-sm"
                              : "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                          }`}
                          title="Show all moods"
                        >
                          All moods
                          <span className={`text-[10px] ${activeMood === "all" ? "opacity-70" : "opacity-50"}`}>
                            {baseFiltered.length}
                          </span>
                        </button>
                        {MOOD_ORDER.filter((m) => moodCounts.has(m)).map((mood) => {
                          const count = moodCounts.get(mood)!;
                          const style = MOOD_PILL_STYLES[mood];
                          const isActive = activeMood === mood;
                          return (
                            <button
                              key={mood}
                              onClick={() => setActiveMood(isActive ? "all" : mood)}
                              title={`${isActive ? "Clear" : "Show only"} ${mood} palettes`}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                                isActive ? style.activeClass : style.inactiveClass
                              }`}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: style.dot }}
                              />
                              {mood.charAt(0).toUpperCase() + mood.slice(1)}
                              <span className="text-[10px] opacity-60">{count}</span>
                            </button>
                          );
                        })}
                        {anyFrozen && (
                          <span className="text-[var(--border)] text-xs select-none px-0.5" aria-hidden>·</span>
                        )}
                      </>
                    )}
                    {/* Locked pill — always shown in color search context when any frozen */}
                    {anyFrozen && (
                      <button
                        onClick={() => setActiveFreezeFilter(activeFreezeFilter === "locked" ? "all" : "locked")}
                        title={activeFreezeFilter === "locked" ? "Show all palettes" : "Show only locked palettes"}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                          activeFreezeFilter === "locked"
                            ? "bg-indigo-100 text-indigo-700 border-indigo-300 shadow-sm dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700"
                            : "bg-[var(--surface)] text-indigo-500 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/50 dark:text-indigo-400 dark:border-indigo-800/60 dark:hover:bg-indigo-950/20"
                        }`}
                      >
                        <Lock size={9} className="flex-shrink-0" />
                        Locked
                        <span className="text-[10px] opacity-60">{frozenInView}</span>
                      </button>
                    )}
                    {/* Special tag pills (harmony, trend, shared) present in color search results */}
                    {(() => {
                      const specialTagsInResults = ["harmony", "trend", "shared", "shades"]
                        .filter((tag) => baseFiltered.some((p) => p.tags?.includes(tag)));
                      if (specialTagsInResults.length === 0) return null;
                      return (
                        <>
                          <span className="text-[var(--border)] text-xs select-none px-0.5" aria-hidden>·</span>
                          {specialTagsInResults.map((tag) => {
                            const style = SPECIAL_TAG_STYLES[tag];
                            if (!style) return null;
                            const count = baseFiltered.filter((p) => p.tags?.includes(tag)).length;
                            const isActive = activeTags.includes(tag);
                            return (
                              <button
                                key={tag}
                                onClick={() => toggleTag(tag)}
                                title={`${isActive ? "Clear" : "Show only"} ${tag} palettes`}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                                  isActive ? style.activeClass : style.inactiveClass
                                }`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: style.dot }} />
                                {tag.charAt(0).toUpperCase() + tag.slice(1)}
                                <span className="text-[10px] opacity-60">{count}</span>
                              </button>
                            );
                          })}
                        </>
                      );
                    })()}
                    {/* Single-mood label when only one mood in results */}
                    {moodCounts.size === 1 && (() => {
                      const [mood] = [...moodCounts.keys()];
                      const style = MOOD_PILL_STYLES[mood];
                      return (
                        <span
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${style.inactiveClass}`}
                          title={`All ${baseFiltered.length} matching palettes are ${mood} mood`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: style.dot }} />
                          {mood.charAt(0).toUpperCase() + mood.slice(1)}
                          <span className="text-[10px] opacity-60">{baseFiltered.length}</span>
                        </span>
                      );
                    })()}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tag filter pills */}
            <AnimatePresence>
              {allUniqueTags.length > 0 && (
                <motion.div
                  key="tag-pills"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    {[
                      { key: "all", label: "All", count: palettes.length },
                      ...(untaggedCount > 0 ? [{ key: "__mine__", label: "Mine", count: untaggedCount }] : []),
                      ...allUniqueTags.map((tag) => ({
                        key: tag,
                        label: tag.charAt(0).toUpperCase() + tag.slice(1),
                        count: palettes.filter((p) => p.tags?.includes(tag)).length,
                      })),
                    ].map(({ key, label, count }) => {
                      const specialStyle = SPECIAL_TAG_STYLES[key];
                      const isActive =
                        key === "all"
                          ? activeTags.length === 0
                          : key === "__mine__"
                          ? activeTags[0] === "__mine__"
                          : activeTags.includes(key);
                      return (
                        <button
                          key={key}
                          onClick={() => toggleTag(key)}
                          title={
                            key === "all"
                              ? "Show all palettes"
                              : isActive
                              ? activeTags.length > 1
                                ? `Remove "${label}" from filter`
                                : `Clear "${label}" filter`
                              : activeTags.length > 0 && key !== "__mine__"
                              ? `Also show "${label}" palettes`
                              : `Filter by "${label}"`
                          }
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                            isActive
                              ? (specialStyle?.activeClass ?? "bg-[var(--accent)] text-[var(--accent-fg)] border-[var(--accent)] shadow-sm")
                              : (specialStyle?.inactiveClass ?? "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--foreground)]")
                          }`}
                        >
                          {key !== "all" && key !== "__mine__" && (
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: specialStyle?.dot ?? getTagDotColor(key) }}
                            />
                          )}
                          {label}
                          <span className={`text-[10px] ${isActive ? "opacity-70" : "opacity-50"}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                    {activeTags.length > 1 && (
                      <span className="flex items-center text-[10px] text-[var(--muted)] pl-0.5 select-none">
                        → {sorted.length} palettes
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mood + Locked filter pills — hidden when color search is active (inline strip handles it) */}
            <AnimatePresence>
              {!colorSearchActive && (moodCounts.size >= 2 || anyFrozen || anyPrintRisk || anyA11y || anyFlatTone || activeHueSector !== null) && (
                <motion.div
                  key="mood-pills"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap items-center gap-1.5 pb-1">
                    {moodCounts.size >= 2 && (
                      <>
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)] shrink-0 mr-0.5">
                          Mood
                        </span>
                        <button
                          onClick={() => setActiveMood("all")}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                            activeMood === "all"
                              ? "bg-[var(--accent)] text-[var(--accent-fg)] border-[var(--accent)] shadow-sm"
                              : "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                          }`}
                        >
                          All
                          <span className={`text-[10px] ${activeMood === "all" ? "opacity-70" : "opacity-50"}`}>
                            {baseFiltered.length}
                          </span>
                        </button>
                        {MOOD_ORDER.filter((m) => moodCounts.has(m)).map((mood) => {
                          const count = moodCounts.get(mood)!;
                          const style = MOOD_PILL_STYLES[mood];
                          const isActive = activeMood === mood;
                          const label = mood.charAt(0).toUpperCase() + mood.slice(1);
                          return (
                            <button
                              key={mood}
                              onClick={() => setActiveMood(isActive ? "all" : mood)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                                isActive ? style.activeClass : style.inactiveClass
                              }`}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: style.dot }}
                              />
                              {label}
                              <span className="text-[10px] opacity-60">{count}</span>
                            </button>
                          );
                        })}
                      </>
                    )}

                    {/* Locked filter pill — separated visually when mood pills also present */}
                    {anyFrozen && (
                      <>
                        {moodCounts.size >= 2 && (
                          <span className="text-[var(--border)] text-xs select-none px-0.5" aria-hidden>·</span>
                        )}
                        <button
                          onClick={() => setActiveFreezeFilter(activeFreezeFilter === "locked" ? "all" : "locked")}
                          title={activeFreezeFilter === "locked" ? "Show all palettes" : "Show only locked palettes"}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                            activeFreezeFilter === "locked"
                              ? "bg-indigo-100 text-indigo-700 border-indigo-300 shadow-sm dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700"
                              : "bg-[var(--surface)] text-indigo-500 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/50 dark:text-indigo-400 dark:border-indigo-800/60 dark:hover:bg-indigo-950/20"
                          }`}
                        >
                          <Lock size={9} className="flex-shrink-0" />
                          Locked
                          <span className="text-[10px] opacity-60">{frozenInView}</span>
                        </button>
                      </>
                    )}
                    {anyPrintRisk && (
                      <>
                        {(moodCounts.size >= 2 || anyFrozen) && (
                          <span className="text-[var(--border)] text-xs select-none px-0.5" aria-hidden>·</span>
                        )}
                        <button
                          onClick={() => setPrintReadyOnly(!printReadyOnly)}
                          title={printReadyOnly ? "Show all palettes" : "Show only print-safe palettes (all swatches safe for CMYK)"}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                            printReadyOnly
                              ? "bg-emerald-100 text-emerald-700 border-emerald-300 shadow-sm dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700"
                              : "bg-[var(--surface)] text-emerald-600 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/50 dark:text-emerald-500 dark:border-emerald-800/60 dark:hover:bg-emerald-950/20"
                          }`}
                        >
                          <CheckCircle2 size={9} className="flex-shrink-0" />
                          Print-safe
                          {printReadyOnly && <span className="text-[10px] opacity-60">{printSafeCount}</span>}
                        </button>
                      </>
                    )}
                    {anyA11y && (
                      <>
                        {(moodCounts.size >= 2 || anyFrozen || anyPrintRisk) && (
                          <span className="text-[var(--border)] text-xs select-none px-0.5" aria-hidden>·</span>
                        )}
                        <button
                          onClick={() => setA11yFilter(
                            a11yFilter === "all" ? "AA Large" : a11yFilter === "AA Large" ? "AA" : "all"
                          )}
                          title={
                            a11yFilter === "all"
                              ? `Filter to accessible palettes — click for AA Large (≥3:1), click again for strict AA (≥4.5:1)`
                              : a11yFilter === "AA Large"
                              ? `Showing AA Large accessible palettes (best pair ≥3:1) — click for strict AA only`
                              : `Showing strict AA palettes (best pair ≥4.5:1) — click to clear`
                          }
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                            a11yFilter !== "all"
                              ? "bg-violet-100 text-violet-700 border-violet-300 shadow-sm dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700"
                              : "bg-[var(--surface)] text-violet-600 border-violet-200 hover:border-violet-400 hover:bg-violet-50/50 dark:text-violet-400 dark:border-violet-800/60 dark:hover:bg-violet-950/20"
                          }`}
                        >
                          <ShieldCheck size={9} className="flex-shrink-0" />
                          {a11yFilter !== "all" ? a11yFilter : "A11y"}
                          <span className="text-[10px] opacity-60">
                            {a11yFilter === "AA" ? aaInView : aaLargeInView}
                          </span>
                        </button>
                      </>
                    )}
                    {anyFlatTone && (
                      <>
                        {(moodCounts.size >= 2 || anyFrozen || anyPrintRisk || anyA11y) && (
                          <span className="text-[var(--border)] text-xs select-none px-0.5" aria-hidden>·</span>
                        )}
                        <button
                          onClick={() => setFlatToneFilter(!flatToneFilter)}
                          title={
                            flatToneFilter
                              ? `Showing flat-tone palettes (all colors L 20–80%) — click to clear`
                              : `Filter to flat-tone palettes — all colors mid-range lightness, limited contrast spread`
                          }
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                            flatToneFilter
                              ? "bg-amber-100 text-amber-700 border-amber-300 shadow-sm dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700"
                              : "bg-[var(--surface)] text-amber-600 border-amber-200 hover:border-amber-400 hover:bg-amber-50/50 dark:text-amber-400 dark:border-amber-800/60 dark:hover:bg-amber-950/20"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                          Flat Tone
                          <span className="text-[10px] opacity-60">{flatToneCount}</span>
                        </button>
                      </>
                    )}
                    {activeHueSector !== null && (
                      <>
                        {(moodCounts.size >= 2 || anyFrozen || anyPrintRisk || anyA11y || anyFlatTone) && (
                          <span className="text-[var(--border)] text-xs select-none px-0.5" aria-hidden>·</span>
                        )}
                        <button
                          onClick={() => setActiveHueSector(null)}
                          title={`Showing palettes with ${HUE_SECTOR_NAMES[activeHueSector]} tones — click to clear hue filter`}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border shadow-sm"
                          style={{
                            backgroundColor: `hsl(${activeHueSector * 30 + 15}, 85%, 92%)`,
                            color: `hsl(${activeHueSector * 30 + 15}, 60%, 32%)`,
                            borderColor: `hsl(${activeHueSector * 30 + 15}, 60%, 75%)`,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: `hsl(${activeHueSector * 30 + 15}, 85%, 55%)` }}
                          />
                          {HUE_SECTOR_NAMES[activeHueSector]}
                          <span className="text-[10px] opacity-70">{hueFilteredCount}</span>
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Color count filter pills */}
            <AnimatePresence>
              {!colorSearchActive && distinctColorCounts.length >= 2 && (
                <motion.div
                  key="count-pills"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap items-center gap-1.5 pb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)] shrink-0 mr-0.5">
                      # Colors
                    </span>
                    <button
                      onClick={() => setActiveColorCount("all")}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                        activeColorCount === "all"
                          ? "bg-[var(--accent)] text-[var(--accent-fg)] border-[var(--accent)] shadow-sm"
                          : "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      All
                      <span className={`text-[10px] ${activeColorCount === "all" ? "opacity-70" : "opacity-50"}`}>
                        {moodFiltered.length}
                      </span>
                    </button>
                    {distinctColorCounts.map((n) => {
                      const count = colorCountTally.get(n)!;
                      const isActive = activeColorCount === n;
                      return (
                        <button
                          key={n}
                          onClick={() => setActiveColorCount(isActive ? "all" : n)}
                          title={`Show only palettes with ${n} color${n === 1 ? "" : "s"}`}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                            isActive
                              ? "bg-[var(--accent)] text-[var(--accent-fg)] border-[var(--accent)] shadow-sm"
                              : "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                          }`}
                        >
                          <span className="font-mono tabular-nums">{n}</span>
                          <span className={`text-[10px] ${isActive ? "opacity-70" : "opacity-50"}`}>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Saved view presets row */}
            <AnimatePresence>
              {filterPresets.length > 0 && !colorSearchActive && (
                <motion.div
                  key="filter-presets"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap items-center gap-1.5 pb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)] shrink-0 mr-0.5 flex items-center gap-1">
                      <BookMarked size={9} />
                      Saved
                    </span>
                    {filterPresets.map((preset) => {
                      const isActive = preset.id === activePresetId;
                      return (
                        <div key={preset.id} className="group/preset flex items-center">
                          <button
                            onClick={() => applyPreset(preset)}
                            title={isActive ? `Viewing: ${preset.name}` : `Apply view: ${preset.name}`}
                            className={`flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-l-full text-xs font-medium transition-all border border-r-0 ${
                              isActive
                                ? "bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-700"
                                : "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50/60 dark:hover:border-violet-700 dark:hover:text-violet-300 dark:hover:bg-violet-950/20"
                            }`}
                          >
                            {isActive && <CheckCircle2 size={9} className="shrink-0" />}
                            {preset.name}
                          </button>
                          <button
                            onClick={() => deletePreset(preset.id)}
                            title={`Delete view "${preset.name}"`}
                            className={`flex items-center px-1.5 py-1 rounded-r-full text-xs transition-all border hover:border-rose-300 hover:text-rose-500 hover:bg-rose-50/60 dark:hover:border-rose-700 dark:hover:text-rose-400 dark:hover:bg-rose-950/20 opacity-0 group-hover/preset:opacity-100 ${
                              isActive
                                ? "bg-violet-100 text-violet-400 border-violet-300 dark:bg-violet-950/40 dark:border-violet-700"
                                : "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)]"
                            }`}
                          >
                            <X size={9} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Compare anchor hint banner */}
            <AnimatePresence>
              {compareAnchor && !compareTarget && (
                <motion.div
                  key="compare-hint"
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -6, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-sm)] border border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/30 text-sm">
                    <ArrowLeftRight size={13} className="text-violet-500 shrink-0" />
                    <span className="text-violet-700 dark:text-violet-400 text-xs">
                      Comparing <strong className="font-semibold">{compareAnchor.name}</strong> — hover another palette and press{" "}
                      <kbd className="inline-flex items-center justify-center w-4 h-3.5 rounded text-[8px] font-mono font-semibold bg-violet-100 dark:bg-violet-900/50 border border-violet-300 dark:border-violet-700 leading-none mx-0.5">C</kbd>{" "}
                      or click{" "}
                      <ArrowLeftRight size={10} className="inline -mt-0.5 mx-0.5" /> to compare
                    </span>
                    <button
                      onClick={() => setCompareAnchor(null)}
                      className="ml-auto p-0.5 rounded hover:bg-violet-100 dark:hover:bg-violet-900/40 text-violet-400 hover:text-violet-600 transition-colors shrink-0"
                      title="Cancel compare"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {palettes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="flex gap-1.5 mb-4">
                  {["#f9a8d4", "#c4b5fd", "#93c5fd", "#6ee7b7", "#fcd34d"].map((c, i) => (
                    <div key={i} className="w-8 h-8 rounded-full" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <p className="text-sm text-[var(--muted)]">Drop an image to extract your first palette</p>
              </div>
            ) : activeCollection !== "all" && activeCollectionCount === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="mb-5 w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-50 to-sky-50 dark:from-violet-950/30 dark:to-sky-950/30 border border-[var(--border)] flex items-center justify-center">
                  <FolderOpen size={26} className="text-[var(--muted)]" />
                </div>
                <p className="text-sm font-semibold text-[var(--foreground)] mb-2">
                  &ldquo;{activeCollectionInfo?.name}&rdquo; is empty
                </p>
                <p className="text-xs text-[var(--muted)] max-w-[240px] leading-relaxed mb-6">
                  Click the <FolderOpen size={11} className="inline-block align-middle -mt-0.5 mx-0.5" /> icon on any palette card, or select multiple palettes and use the bulk action bar to add them here.
                </p>
                <button
                  onClick={() => setActiveCollection("all")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] text-xs font-medium text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
                >
                  <Layers size={12} />
                  Browse all palettes
                </button>
              </motion.div>
            ) : sorted.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                {/* Faded palette strip with search icon overlay */}
                <div className="relative mb-5 w-44 h-10">
                  <div className="absolute inset-0 flex rounded-xl overflow-hidden opacity-[0.18] blur-[2px]">
                    {["#f9a8d4", "#c4b5fd", "#93c5fd", "#6ee7b7", "#fcd34d", "#fb923c"].map((c, i) => (
                      <div key={i} className="flex-1" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-9 h-9 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-sm flex items-center justify-center">
                      <Search size={15} className="text-[var(--muted)]" />
                    </div>
                  </div>
                </div>

                <p className="text-sm font-semibold text-[var(--foreground)] mb-1.5">No matching palettes</p>
                <p className="text-xs text-[var(--muted)] max-w-[260px] leading-relaxed mb-5">
                  {validColorSearch
                    ? `No palettes contain a color within ΔE ≤ ${COLOR_MATCH_THRESHOLD} of ${validColorSearch}.`
                    : "Try adjusting or clearing the active filters below."}
                </p>

                {/* Active filter chips — each dismissible individually */}
                <div className="flex flex-wrap gap-1.5 justify-center mb-5 max-w-xs">
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
                    >
                      <Search size={10} className="shrink-0" />
                      &ldquo;{search}&rdquo;
                      <X size={10} className="ml-0.5 shrink-0" />
                    </button>
                  )}
                  {activeTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: tag === "__mine__" ? "#a1a1aa" : getTagDotColor(tag) }}
                      />
                      {tag === "__mine__" ? "Mine" : tag.charAt(0).toUpperCase() + tag.slice(1)}
                      <X size={10} className="shrink-0" />
                    </button>
                  ))}
                  {activeMood !== "all" && (
                    <button
                      onClick={() => setActiveMood("all")}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: MOOD_PILL_STYLES[activeMood].dot }}
                      />
                      {activeMood.charAt(0).toUpperCase() + activeMood.slice(1)} mood
                      <X size={10} className="shrink-0" />
                    </button>
                  )}
                  {activeCollection !== "all" && (
                    <button
                      onClick={() => setActiveCollection("all")}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
                    >
                      <FolderOpen size={10} className="shrink-0" />
                      {activeCollectionInfo?.name ?? "Collection"}
                      <X size={10} className="shrink-0" />
                    </button>
                  )}
                  {validColorSearch && (
                    <button
                      onClick={() => { setColorSearchActive(false); setColorSearchHex(""); }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0 border border-[var(--border-subtle)]"
                        style={{ backgroundColor: validColorSearch }}
                      />
                      {validColorSearch}
                      <X size={10} className="shrink-0" />
                    </button>
                  )}
                  {activeFreezeFilter === "locked" && (
                    <button
                      onClick={() => setActiveFreezeFilter("all")}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
                    >
                      <Lock size={10} className="shrink-0 text-indigo-400" />
                      Locked only
                      <X size={10} className="shrink-0" />
                    </button>
                  )}
                  {activeColorCount !== "all" && (
                    <button
                      onClick={() => setActiveColorCount("all")}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
                    >
                      <span className="font-mono text-[10px] font-semibold shrink-0">#</span>
                      {activeColorCount} colors
                      <X size={10} className="shrink-0" />
                    </button>
                  )}
                  {printReadyOnly && (
                    <button
                      onClick={() => setPrintReadyOnly(false)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
                    >
                      <CheckCircle2 size={10} className="shrink-0 text-emerald-500" />
                      Print-safe only
                      <X size={10} className="shrink-0" />
                    </button>
                  )}
                  {activeHueSector !== null && (
                    <button
                      onClick={() => setActiveHueSector(null)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: `hsl(${activeHueSector * 30 + 15}, 85%, 58%)` }}
                      />
                      {HUE_SECTOR_NAMES[activeHueSector]} hue
                      <X size={10} className="shrink-0" />
                    </button>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setActiveTags([]);
                    setActiveMood("all");
                    setActiveFreezeFilter("all");
                    setActiveColorCount("all");
                    setPrintReadyOnly(false);
                    setColorSearchActive(false);
                    setColorSearchHex("");
                    setActiveHueSector(null);
                  }}
                  className="gap-1.5"
                >
                  <X size={12} />
                  Clear all filters
                </Button>
              </motion.div>
            ) : viewMode === "colors" ? (
              <ColorBrowser
                colorIndex={colorIndex}
                paletteLookup={paletteLookup}
                onSelectColor={(hex) => {
                  setViewMode("palettes");
                  setColorSearchActive(true);
                  setColorSearchHex(hex);
                }}
                onJumpToPalette={handleJumpToPalette}
                collections={collections.filter((c) => !c.archived)}
                collectionFilter={colorBrowserCollection}
                onCollectionFilterChange={setColorBrowserCollection}
              />
            ) : (
              <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AnimatePresence mode="popLayout">
                  {pinnedDisplay.length > 0 && (
                    <motion.div
                      key="__pinned-label"
                      layout
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="col-span-full flex items-center gap-2 py-0.5"
                    >
                      <Pin size={10} style={{ color: "#f97316", flexShrink: 0 }} />
                      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#f97316" }}>Pinned</span>
                      <div className="flex-1 h-px" style={{ background: "rgba(249,115,22,0.2)" }} />
                      <span className="text-[10px] tabular-nums" style={{ color: "var(--muted)" }}>{pinnedDisplay.length}</span>
                    </motion.div>
                  )}
                  {pinnedDisplay.map((palette) => {
                    const isCoverPalette = activeCollection !== "all" && palette.id === coverPaletteId;
                    const palCollectionName = palette.collectionId
                      ? (collections.find((c) => c.id === palette.collectionId)?.name)
                      : undefined;
                    const palCollectionSize = palette.collectionId
                      ? palettes.filter((p) => p.collectionId === palette.collectionId).length
                      : undefined;
                    return (
                      <PaletteCard
                        key={palette.id}
                        cardId={`pc-${palette.id}`}
                        palette={palette}
                        onExport={setExportTarget}
                        onRename={setRenameTarget}
                        onAssignCollection={setCollectionTarget}
                        onHarmony={setHarmonyTarget}
                        onContrast={setContrastTarget}
                        onEditSwatch={(p, i) => setEditTarget({ palette: p, swatchIndex: i })}
                        onShadeScale={(p, i) => setShadeTarget({ hex: p.colors[i].hex, name: p.colors[i].name })}
                        onCompare={(p) => {
                          if (!compareAnchor) {
                            setCompareAnchor(p);
                          } else if (compareAnchor.id === p.id) {
                            setCompareAnchor(null);
                          } else {
                            setCompareTarget(p);
                          }
                        }}
                        isCompareAnchor={compareAnchor?.id === palette.id}
                        compareActive={!!compareAnchor}
                        onDuplicate={(p) => { const copy = duplicatePalette(p.id); if (copy) setRenameTarget(copy); }}
                        isSelected={selectedIds.has(palette.id)}
                        selectionActive={selectedIds.size > 0}
                        onSelect={toggleSelect}
                        colorMatchHex={validColorSearch ?? undefined}
                        isCover={isCoverPalette}
                        onSetCover={activeCollection !== "all" ? handleSetCover : undefined}
                        className={isCoverPalette ? "sm:col-span-2" : ""}
                        searchQuery={search || undefined}
                        collectionName={palCollectionName}
                        collectionSize={palCollectionSize}
                        onJumpToCollection={jumpToCollection}
                        onClearCollection={palette.collectionId ? () => updatePalette(palette.id, { collectionId: undefined }) : undefined}
                        onFilterByTag={(tag) => toggleTag(tag)}
                        activeTags={activeTags.length > 0 ? activeTags : undefined}
                        onPin={(p) => togglePin(p.id)}
                        isPinned={!!palette.pinned}
                        isHighlighted={palette.id === highlightedPaletteId}
                        isFocused={focusedCardId === palette.id}
                        keyboardFocusActive={focusedCardId !== null}
                      />
                    );
                  })}
                  {pinnedDisplay.length > 0 && unpinnedDisplay.length > 0 && (
                    <motion.div
                      key="__library-label"
                      layout
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="col-span-full flex items-center gap-2 py-0.5 mt-1"
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>Library</span>
                      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                      <span className="text-[10px] tabular-nums" style={{ color: "var(--muted)" }}>{unpinnedDisplay.length}</span>
                    </motion.div>
                  )}
                  {unpinnedDisplay.map((palette) => {
                    const isCoverPalette = activeCollection !== "all" && palette.id === coverPaletteId;
                    const palCollectionName = palette.collectionId
                      ? (collections.find((c) => c.id === palette.collectionId)?.name)
                      : undefined;
                    const palCollectionSize = palette.collectionId
                      ? palettes.filter((p) => p.collectionId === palette.collectionId).length
                      : undefined;
                    return (
                      <PaletteCard
                        key={palette.id}
                        cardId={`pc-${palette.id}`}
                        palette={palette}
                        onExport={setExportTarget}
                        onRename={setRenameTarget}
                        onAssignCollection={setCollectionTarget}
                        onHarmony={setHarmonyTarget}
                        onContrast={setContrastTarget}
                        onEditSwatch={(p, i) => setEditTarget({ palette: p, swatchIndex: i })}
                        onShadeScale={(p, i) => setShadeTarget({ hex: p.colors[i].hex, name: p.colors[i].name })}
                        onCompare={(p) => {
                          if (!compareAnchor) {
                            setCompareAnchor(p);
                          } else if (compareAnchor.id === p.id) {
                            setCompareAnchor(null);
                          } else {
                            setCompareTarget(p);
                          }
                        }}
                        isCompareAnchor={compareAnchor?.id === palette.id}
                        compareActive={!!compareAnchor}
                        onDuplicate={(p) => { const copy = duplicatePalette(p.id); if (copy) setRenameTarget(copy); }}
                        isSelected={selectedIds.has(palette.id)}
                        selectionActive={selectedIds.size > 0}
                        onSelect={toggleSelect}
                        colorMatchHex={validColorSearch ?? undefined}
                        isCover={isCoverPalette}
                        onSetCover={activeCollection !== "all" ? handleSetCover : undefined}
                        className={isCoverPalette ? "sm:col-span-2" : ""}
                        searchQuery={search || undefined}
                        collectionName={palCollectionName}
                        collectionSize={palCollectionSize}
                        onJumpToCollection={jumpToCollection}
                        onClearCollection={palette.collectionId ? () => updatePalette(palette.id, { collectionId: undefined }) : undefined}
                        onFilterByTag={(tag) => toggleTag(tag)}
                        activeTags={activeTags.length > 0 ? activeTags : undefined}
                        onPin={(p) => togglePin(p.id)}
                        isPinned={!!palette.pinned}
                        isHighlighted={palette.id === highlightedPaletteId}
                        isFocused={focusedCardId === palette.id}
                        keyboardFocusActive={focusedCardId !== null}
                      />
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      <ShadeModal
        color={shadeTarget}
        onClose={() => setShadeTarget(null)}
        onSaveAsPalette={(colors) => {
          const baseName = shadeTarget?.name || shadeTarget?.hex?.toUpperCase() || "Color";
          addPalette({ name: `${baseName} · Shades`, colors, tags: ["shades"] });
        }}
      />
      <CompareModal
        paletteA={compareAnchor}
        paletteB={compareTarget}
        onClose={() => { setCompareAnchor(null); setCompareTarget(null); }}
      />
      <ExportModal palette={exportTarget} onClose={() => setExportTarget(null)} />
      <RenameModal palette={renameTarget} onClose={() => setRenameTarget(null)} />
      <CollectionModal palette={collectionTarget} onClose={() => setCollectionTarget(null)} />
      <HarmonyModal palette={harmonyTarget} onClose={() => setHarmonyTarget(null)} />
      <ContrastModal palette={contrastTarget} onClose={() => setContrastTarget(null)} />
      <SwatchEditor
        palette={editTarget?.palette ?? null}
        swatchIndex={editTarget?.swatchIndex ?? 0}
        onClose={() => setEditTarget(null)}
      />
      <CohesionModal
        collection={cohesionTarget}
        palettes={cohesionTarget ? palettes.filter((p) => p.collectionId === cohesionTarget.id) : []}
        onClose={() => setCohesionTarget(null)}
        onEditPalette={(palette, swatchIndex) => setEditTarget({ palette, swatchIndex })}
      />
      {showTrendLibrary && (
        <TrendLibrary
          onClose={() => setShowTrendLibrary(false)}
          onSave={(colors, name) => {
            addPalette({ name, colors: colors.map((hex) => ({ hex })), tags: ["trend"] });
          }}
          onUseInExtractor={(colors, name) => {
            setTrendSeed({ hex: colors.join(", "), name });
            setShowTrendLibrary(false);
          }}
        />
      )}
      <AnimatePresence>
        {showImport && (
          <ImportModal
            onClose={() => setShowImport(false)}
            onImport={(name, colors) => {
              addPalette({ name, colors, tags: [] });
            }}
          />
        )}
      </AnimatePresence>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            key="bulk-bar"
            initial={{ y: 72, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 72, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="fixed bottom-0 inset-x-0 z-50 bg-[var(--surface)]/95 backdrop-blur-md border-t border-[var(--border)] shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
          >
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <CheckSquare size={14} className="text-[var(--accent)] shrink-0" />
                <span className="text-sm font-medium">
                  {selectedIds.size} palette{selectedIds.size !== 1 ? "s" : ""} selected
                </span>
                {sorted.length > selectedIds.size && (
                  <button
                    onClick={selectAllVisible}
                    className="text-xs text-[var(--accent)] hover:underline shrink-0"
                  >
                    Select all {sorted.length}
                  </button>
                )}
              </div>

              <div className="flex-1" />

              {/* Assign to collection */}
              {activeCollections.length > 0 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <FolderOpen size={13} className="text-[var(--muted)]" />
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const colId = e.target.value === "__none__" ? undefined : e.target.value;
                      assignPalettesToCollection([...selectedIds], colId);
                      clearSelection();
                      e.target.value = "";
                    }}
                    className="text-xs bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-sm)] px-2 py-1.5 outline-none focus:border-[var(--accent)] cursor-pointer transition-colors"
                    aria-label="Assign to collection"
                  >
                    <option value="" disabled>Move to collection…</option>
                    <option value="__none__">Remove from collection</option>
                    {activeCollections.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Bulk tag */}
              <div className="relative shrink-0">
                <Button
                  variant={bulkTagOpen ? "outline" : "ghost"}
                  size="sm"
                  onClick={() => {
                    const next = !bulkTagOpen;
                    setBulkTagOpen(next);
                    if (next) setTimeout(() => bulkTagInputRef.current?.focus(), 50);
                  }}
                  className="gap-1.5"
                  title="Add or remove a tag from all selected palettes"
                >
                  <Tag size={13} />
                  Tag
                </Button>
                <AnimatePresence>
                  {bulkTagOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.12 }}
                      className="absolute bottom-full mb-2 left-0 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] shadow-lg p-3 min-w-[220px] z-10"
                    >
                      <p className="text-[11px] text-[var(--muted)] mb-2 font-medium">
                        Tag {selectedIds.size} palette{selectedIds.size !== 1 ? "s" : ""}
                      </p>
                      <div className="flex gap-1.5">
                        <input
                          ref={bulkTagInputRef}
                          type="text"
                          value={bulkTagInput}
                          onChange={(e) => setBulkTagInput(e.target.value.toLowerCase())}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && bulkTagInput.trim()) applyBulkTag(bulkTagInput);
                            if (e.key === "Escape") setBulkTagOpen(false);
                          }}
                          placeholder="tag name…"
                          className="flex-1 text-xs bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-sm)] px-2 py-1.5 outline-none focus:border-[var(--accent)] min-w-0"
                        />
                        <button
                          onClick={() => bulkTagInput.trim() && applyBulkTag(bulkTagInput)}
                          disabled={!bulkTagInput.trim()}
                          title="Add tag to all selected"
                          className="px-2.5 py-1 text-xs font-semibold bg-[var(--accent)] text-[var(--accent-fg)] rounded-[var(--radius-sm)] disabled:opacity-40 hover:opacity-90 transition-opacity"
                        >
                          +Add
                        </button>
                        <button
                          onClick={() => bulkTagInput.trim() && removeBulkTag(bulkTagInput)}
                          disabled={!bulkTagInput.trim()}
                          title="Remove tag from all selected"
                          className="px-2 py-1 text-xs bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-sm)] disabled:opacity-40 hover:bg-red-50 hover:text-red-500 hover:border-red-200 dark:hover:bg-red-950/30 dark:hover:text-red-400 dark:hover:border-red-800 transition-colors"
                        >
                          −
                        </button>
                      </div>
                      {allLibraryTagsForBulk.filter((t) => !bulkTagInput.trim() || t.includes(bulkTagInput.trim())).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {allLibraryTagsForBulk
                            .filter((t) => !bulkTagInput.trim() || t.includes(bulkTagInput.trim()))
                            .slice(0, 8)
                            .map((t) => (
                              <button
                                key={t}
                                onClick={() => applyBulkTag(t)}
                                title={`Add "${t}" to all selected`}
                                className="px-1.5 py-0.5 text-[10px] bg-[var(--surface-2)] rounded border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                              >
                                {t}
                              </button>
                            ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bulk freeze/unfreeze */}
              <Button
                variant={frozenSelectedCount === selectedIds.size ? "outline" : "ghost"}
                size="sm"
                onClick={bulkToggleFreeze}
                className={`shrink-0 gap-1.5${frozenSelectedCount === selectedIds.size ? " text-indigo-500 border-indigo-300 dark:border-indigo-700" : ""}`}
                title={
                  frozenSelectedCount === selectedIds.size
                    ? `Unlock all ${selectedIds.size} selected palettes`
                    : frozenSelectedCount > 0
                      ? `Freeze ${selectedIds.size - frozenSelectedCount} unlocked (${frozenSelectedCount} already locked)`
                      : `Lock all ${selectedIds.size} selected palettes — prevents editing and deletion`
                }
              >
                {frozenSelectedCount === selectedIds.size
                  ? <LockOpen size={13} className="text-indigo-500" />
                  : <Lock size={13} />}
                {frozenSelectedCount === selectedIds.size ? "Unlock" : "Lock"}
                {frozenSelectedCount > 0 && frozenSelectedCount < selectedIds.size && (
                  <span className="text-[10px] opacity-55 tabular-nums">({frozenSelectedCount}/{selectedIds.size})</span>
                )}
              </Button>

              {/* Batch export ZIP */}
              <Button
                variant="outline"
                size="sm"
                disabled={bulkExporting}
                onClick={async () => {
                  setBulkExporting(true);
                  const targets = palettes.filter((p) => selectedIds.has(p.id));
                  try {
                    await batchExportZip(targets);
                    setExportToast({ count: targets.length });
                  } finally {
                    setBulkExporting(false);
                  }
                }}
                className="shrink-0 gap-1.5"
                title="Download selected palettes as a ZIP of PNG cards"
              >
                {bulkExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                {bulkExporting ? "Exporting…" : `Export ZIP`}
              </Button>

              {/* Bulk delete */}
              <Button
                variant={bulkDeleteConfirm ? "danger" : "outline"}
                size="sm"
                disabled={deletableSelectedIds.length === 0}
                onClick={() => {
                  if (bulkDeleteConfirm) {
                    deletePalettes(deletableSelectedIds);
                    clearSelection();
                  } else {
                    setBulkDeleteConfirm(true);
                    setTimeout(() => setBulkDeleteConfirm(false), 2500);
                  }
                }}
                className="shrink-0 gap-1.5"
                title={deletableSelectedIds.length === 0 ? "All selected palettes are locked" : undefined}
              >
                <Trash2 size={13} />
                {bulkDeleteConfirm
                  ? frozenSelectedCount > 0
                    ? `Delete ${deletableSelectedIds.length} (${frozenSelectedCount} locked)`
                    : `Delete ${selectedIds.size}?`
                  : `Delete ${selectedIds.size}`}
              </Button>

              {/* Clear selection */}
              <button
                onClick={clearSelection}
                className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-2)] text-[var(--muted)] transition-colors shrink-0"
                title="Clear selection"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export success toast */}
      <AnimatePresence>
        {exportToast && (
          <motion.div
            key="export-toast"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="fixed bottom-6 right-6 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-2xl px-4 py-3 flex items-center gap-3 max-w-xs"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <CheckCircle2 size={15} className="text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--foreground)] leading-tight">
                {exportToast.count === 1 ? "1 palette exported" : `${exportToast.count} palettes exported`}
              </p>
              <p className="text-xs text-[var(--muted)] leading-tight mt-0.5">
                {exportToast.source ? `${exportToast.source} · ZIP downloaded` : "ZIP downloaded"}
              </p>
            </div>
            <button
              onClick={() => setExportToast(null)}
              className="flex-shrink-0 p-1 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] transition-colors"
            >
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard help overlay */}
      <KeyboardHelpModal open={showHelp} onClose={() => setShowHelp(false)} />

      {/* Duplicates detector */}
      {showDuplicates && <DuplicatesModal onClose={() => setShowDuplicates(false)} />}

      {/* Fork-from-share toast */}
      <AnimatePresence>
        {forkPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-2xl px-5 py-4 flex items-center gap-4 max-w-sm w-[calc(100vw-2rem)]"
          >
            {/* Palette strip preview */}
            <div className="flex rounded-md overflow-hidden h-10 w-20 flex-shrink-0">
              {forkPrompt.colors.map((c, i) => (
                <div key={i} className="flex-1" style={{ backgroundColor: c.hex }} />
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{forkPrompt.name}</p>
              <p className="text-xs text-[var(--muted)]">Fork this palette to your library?</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => {
                  addPalette({ name: forkPrompt.name, colors: forkPrompt.colors, tags: ["shared"] });
                  setForkPrompt(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-medium hover:opacity-90 transition-opacity"
              >
                <BookMarked size={11} />
                Fork
              </button>
              <button
                onClick={() => setForkPrompt(null)}
                className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-2)] text-[var(--muted)] transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
