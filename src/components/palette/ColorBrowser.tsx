"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Layers, Search, X } from "lucide-react";
import { getContrastColor } from "@/lib/utils";

interface ColorEntry {
  hex: string;
  paletteIds: string[];
  paletteNames: string[];
  hue: number;
  lightness: number;
}

interface PaletteStrip {
  name: string;
  colors: { hex: string }[];
  collectionId?: string;
}

interface CollectionOption {
  id: string;
  name: string;
}

interface ColorBrowserProps {
  colorIndex: ColorEntry[];
  onSelectColor: (hex: string) => void;
  paletteLookup: Map<string, PaletteStrip>;
  onJumpToPalette?: (paletteId: string) => void;
  collections?: CollectionOption[];
  collectionFilter?: string;
  onCollectionFilterChange?: (id: string) => void;
}

const HUE_BANDS = [
  { label: "Reds", min: 0, max: 30 },
  { label: "Oranges", min: 30, max: 60 },
  { label: "Yellows", min: 60, max: 90 },
  { label: "Yellow-Greens", min: 90, max: 150 },
  { label: "Greens", min: 150, max: 195 },
  { label: "Cyans", min: 195, max: 240 },
  { label: "Blues", min: 240, max: 285 },
  { label: "Purples", min: 285, max: 330 },
  { label: "Pinks", min: 330, max: 360 },
];

const BAND_ABBREV: Record<string, string> = {
  Reds: "R",
  Oranges: "O",
  Yellows: "Y",
  "Yellow-Greens": "YG",
  Greens: "G",
  Cyans: "Cy",
  Blues: "B",
  Purples: "Pu",
  Pinks: "Pk",
  Neutrals: "N",
};

// Representative hex for each hue band — used to tint the jump index pills
const BAND_COLOR: Record<string, string> = {
  Reds: "#e05252",
  Oranges: "#e07828",
  Yellows: "#c8a81a",
  "Yellow-Greens": "#78b83a",
  Greens: "#1eb87a",
  Cyans: "#1ab8c0",
  Blues: "#3b70e8",
  Purples: "#8b52e0",
  Pinks: "#e04e8a",
  Neutrals: "#888888",
};

function getBand(hue: number): string {
  const h = ((hue % 360) + 360) % 360;
  for (const band of HUE_BANDS) {
    if (h >= band.min && h < band.max) return band.label;
  }
  return "Reds"; // 360 wraps to 0
}

function bandId(label: string): string {
  return `color-band-${label.replace(/\s+/g, "-")}`;
}

export default function ColorBrowser({ colorIndex, onSelectColor, paletteLookup, onJumpToPalette, collections, collectionFilter = "all", onCollectionFilterChange }: ColorBrowserProps) {
  const [hoveredHex, setHoveredHex] = useState<string | null>(null);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [activeBand, setActiveBand] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Apply collection filter: keep only colors where at least one source palette is in the selected collection
  const visibleColorIndex = useMemo(() => {
    if (collectionFilter === "all" || !collections?.length) return colorIndex;
    return colorIndex.filter((c) =>
      c.paletteIds.some((pid) => paletteLookup.get(pid)?.collectionId === collectionFilter)
    );
  }, [colorIndex, collectionFilter, collections, paletteLookup]);

  // Apply text search: hex prefix match OR hue-band name match
  const searchedColorIndex = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return visibleColorIndex;
    const isHexSearch = /^#?[0-9a-f]{1,6}$/.test(q);
    if (isHexSearch) {
      const hexQ = q.startsWith("#") ? q.slice(1) : q;
      return visibleColorIndex.filter((c) => c.hex.slice(1).toLowerCase().startsWith(hexQ));
    }
    // Name/keyword search: hue band label OR any containing palette name
    return visibleColorIndex.filter((c) => {
      const range = (() => {
        const hex = c.hex.replace("#", "");
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return Math.max(r, g, b) - Math.min(r, g, b);
      })();
      const isNeutral = range < 28;
      const sectionLabel = isNeutral ? "neutrals" : getBand(c.hue).toLowerCase();
      if (sectionLabel.includes(q)) return true;
      return c.paletteNames.some((name) => name.toLowerCase().includes(q));
    });
  }, [visibleColorIndex, searchQuery]);

  // Separate neutrals (low chroma) from chromatic colors
  const { neutrals, chromatics } = useMemo(() => {
    const neutrals: ColorEntry[] = [];
    const chromatics: ColorEntry[] = [];
    for (const c of searchedColorIndex) {
      const hex = c.hex.replace("#", "");
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const range = Math.max(r, g, b) - Math.min(r, g, b);
      if (range < 28) {
        neutrals.push(c);
      } else {
        chromatics.push(c);
      }
    }
    return { neutrals: neutrals.sort((a, b) => a.lightness - b.lightness), chromatics };
  }, [visibleColorIndex]);

  const bands = useMemo(() => {
    const bandMap = new Map<string, ColorEntry[]>();
    for (const band of HUE_BANDS) bandMap.set(band.label, []);
    for (const c of chromatics) {
      const label = getBand(c.hue);
      bandMap.get(label)?.push(c);
    }
    return HUE_BANDS.map((b) => ({ label: b.label, colors: bandMap.get(b.label) ?? [] })).filter((b) => b.colors.length > 0);
  }, [chromatics]);

  // All sections in order (chromatic bands + neutrals)
  const allSections = useMemo(() => {
    const sections = bands.map((b) => b.label);
    if (neutrals.length > 0) sections.push("Neutrals");
    return sections;
  }, [bands, neutrals]);

  // Color count per section — used in jump index chip tooltips
  const sectionCounts = useMemo(() => {
    const m = new Map<string, number>(bands.map((b) => [b.label, b.colors.length]));
    if (neutrals.length > 0) m.set("Neutrals", neutrals.length);
    return m;
  }, [bands, neutrals]);

  // IntersectionObserver: track which band header is most visible
  const setupObserver = useCallback(() => {
    observerRef.current?.disconnect();
    const entries = new Map<string, number>();

    const observer = new IntersectionObserver(
      (observed) => {
        for (const entry of observed) {
          entries.set(entry.target.id, entry.intersectionRatio);
        }
        // Pick the topmost section whose header is visible
        let top: string | null = null;
        let topY = Infinity;
        for (const [id, ratio] of entries) {
          if (ratio > 0) {
            const el = document.getElementById(id);
            if (el) {
              const y = el.getBoundingClientRect().top;
              if (y < topY) { topY = y; top = id; }
            }
          }
        }
        if (top) {
          setActiveBand(top.replace("color-band-", "").replace(/-/g, " ").replace("Yellow Greens", "Yellow-Greens"));
        }
      },
      { threshold: [0, 0.1, 1], rootMargin: "0px 0px -60% 0px" }
    );

    for (const label of allSections) {
      const el = document.getElementById(bandId(label));
      if (el) observer.observe(el);
    }

    observerRef.current = observer;
  }, [allSections]);

  useEffect(() => {
    setupObserver();
    return () => observerRef.current?.disconnect();
  }, [setupObserver]);

  const scrollToBand = (label: string) => {
    const el = document.getElementById(bandId(label));
    if (!el) return;
    // Offset for the sticky header (~56px) + small gap
    const top = el.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top, behavior: "smooth" });
    setActiveBand(label);
  };

  const handleCopy = (e: React.MouseEvent, hex: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 800);
  };

  const renderSwatch = (c: ColorEntry) => {
    const isHovered = hoveredHex === c.hex;
    const isCopied = copiedHex === c.hex;
    const fg = getContrastColor(c.hex);
    const count = c.paletteIds.length;

    // Build properly aligned (id, palette) pairs; tag each with collection membership
    const paletteEntries = c.paletteIds
      .map((id) => ({ id, palette: paletteLookup.get(id) }))
      .filter((e): e is { id: string; palette: PaletteStrip } => !!e.palette)
      .map((e) => ({
        ...e,
        inActiveCollection: collectionFilter !== "all" && e.palette.collectionId === collectionFilter,
      }));

    // When filtering, in-collection palettes bubble to the top
    if (collectionFilter !== "all") {
      paletteEntries.sort((a, b) => (b.inActiveCollection ? 1 : 0) - (a.inActiveCollection ? 1 : 0));
    }

    const filteringByCollection = collectionFilter !== "all" && !!activeCollectionName;

    // Count distinct OTHER collections this color appears in (excluding the active filter)
    const otherCollectionCount = filteringByCollection
      ? new Set(
          paletteEntries
            .filter((e) => !e.inActiveCollection && e.palette.collectionId)
            .map((e) => e.palette.collectionId!)
        ).size
      : 0;

    return (
      <motion.div
        key={c.hex}
        layout
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        title={`${c.hex.toUpperCase()} — in ${count} palette${count !== 1 ? "s" : ""}: ${c.paletteNames.slice(0, 3).join(", ")}${count > 3 ? ` +${count - 3} more` : ""}`}
        style={{ backgroundColor: c.hex }}
        className="relative rounded-[var(--radius-sm)] cursor-pointer transition-transform hover:scale-105 hover:z-10 hover:shadow-md"
        onMouseEnter={() => setHoveredHex(c.hex)}
        onMouseLeave={() => setHoveredHex(null)}
        onClick={() => onSelectColor(c.hex)}
      >
        {/* square aspect ratio */}
        <div className="w-full" style={{ paddingBottom: "100%" }} />

        {/* Count badge — shows when there are multiple palettes */}
        {count > 1 && !isHovered && (
          <div
            className="absolute bottom-0.5 right-0.5 text-[8px] font-bold leading-none px-[3px] py-[2px] rounded-[2px]"
            style={{
              backgroundColor: fg === "#fafaf8" ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.55)",
              color: fg,
            }}
          >
            {count}
          </div>
        )}

        {/* Hover overlay — hex + copy */}
        {isHovered && (
          <div
            className="absolute inset-0 rounded-[var(--radius-sm)] flex flex-col items-center justify-center gap-0.5 p-0.5"
            style={{ backgroundColor: fg === "#fafaf8" ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.72)" }}
          >
            <span
              className="text-[8px] font-mono font-bold leading-none"
              style={{ color: fg === "#fafaf8" ? "#fff" : "#111" }}
            >
              {c.hex.slice(1).toUpperCase()}
            </span>
            <button
              className="flex items-center justify-center w-5 h-5 rounded"
              style={{ backgroundColor: fg === "#fafaf8" ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)" }}
              onClick={(e) => handleCopy(e, c.hex)}
              title="Copy hex"
            >
              {isCopied
                ? <Check size={9} style={{ color: fg === "#fafaf8" ? "#fff" : "#111" }} />
                : <Copy size={9} style={{ color: fg === "#fafaf8" ? "#fff" : "#111" }} />
              }
            </button>
          </div>
        )}

        {/* Palette detail panel — floats above the swatch on hover */}
        {isHovered && paletteEntries.length > 0 && (
          <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30"
            style={{ minWidth: 156 }}
          >
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-sm)] shadow-2xl p-1.5 space-y-0.5">
              {/* Collection context header — shown when a collection filter is active */}
              {filteringByCollection && (
                <div className="flex items-center gap-1 px-1 pb-0.5 mb-0.5 border-b border-[var(--border)]">
                  <Layers size={8} className="text-[var(--accent)] flex-shrink-0" />
                  <span className="text-[8px] font-semibold text-[var(--accent)] truncate leading-none">
                    {activeCollectionName}
                  </span>
                </div>
              )}
              {paletteEntries.slice(0, 5).map(({ id, palette: p, inActiveCollection }) => (
                <button
                  key={id}
                  className={`flex items-center gap-1.5 w-full rounded-[3px] px-1 py-0.5 hover:bg-[var(--surface-2)] transition-colors text-left ${
                    filteringByCollection && !inActiveCollection ? "opacity-40" : ""
                  }`}
                  title={onJumpToPalette ? `Go to "${p.name}"` : p.name}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onJumpToPalette?.(id);
                  }}
                >
                  {/* In-collection indicator dot */}
                  {filteringByCollection && (
                    <div
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        inActiveCollection
                          ? "bg-[var(--accent)]"
                          : "bg-[var(--border)]"
                      }`}
                    />
                  )}
                  <div className="flex rounded-[2px] overflow-hidden flex-shrink-0" style={{ width: 72, height: 10 }}>
                    {p.colors.slice(0, 8).map((col, ci) => (
                      <div key={ci} className="flex-1" style={{ backgroundColor: col.hex }} />
                    ))}
                  </div>
                  <span className="text-[9px] text-[var(--foreground)] truncate flex-1 min-w-0 leading-none">{p.name}</span>
                </button>
              ))}
              {paletteEntries.length > 5 && (
                <p className="text-[9px] text-[var(--muted)] text-center leading-none py-0.5">
                  +{paletteEntries.length - 5} more
                </p>
              )}
              {filteringByCollection && otherCollectionCount > 0 && (
                <p className="text-[9px] text-[var(--muted)]/55 text-center leading-none border-t border-[var(--border)] mt-0.5 pt-1 pb-0.5">
                  also in {otherCollectionCount} other collection{otherCollectionCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            {/* Downward arrow */}
            <div className="flex justify-center">
              <div
                className="w-2 h-1.5"
                style={{
                  borderLeft: "4px solid transparent",
                  borderRight: "4px solid transparent",
                  borderTop: "4px solid var(--border)",
                }}
              />
            </div>
            {/* Transparent gap filler — keeps pointer inside this subtree as mouse crosses mb-2 gap to swatch */}
            <div className="absolute top-full left-0 right-0 h-2" />
          </div>
        )}
      </motion.div>
    );
  };

  const activeCollectionName = collectionFilter !== "all"
    ? collections?.find((c) => c.id === collectionFilter)?.name
    : null;

  if (colorIndex.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-[var(--muted)]">No colors in the current view</p>
      </div>
    );
  }

  return (
    <div className="flex gap-1">
      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-xs text-[var(--muted)]">
            {searchQuery.trim()
              ? <>{searchedColorIndex.length} <span className="text-[var(--foreground)]/70">match{searchedColorIndex.length !== 1 ? "es" : ""}</span> of {visibleColorIndex.length}</>
              : <>{visibleColorIndex.length}{collectionFilter !== "all" && colorIndex.length !== visibleColorIndex.length ? ` of ${colorIndex.length}` : ""} unique color{visibleColorIndex.length !== 1 ? "s" : ""}</>
            }{!searchQuery.trim() && <span className="hidden sm:inline"> — click any swatch to find palettes that contain it</span>}
          </p>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {/* Search bar */}
            <div className="relative flex items-center">
              <Search size={10} className="absolute left-2 text-[var(--muted)] pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") { setSearchQuery(""); searchInputRef.current?.blur(); } }}
                placeholder="hex, hue, or palette name…"
                className="text-[11px] bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-sm)] pl-6 pr-6 py-0.5 leading-tight outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--muted)]/50 w-48"
                spellCheck={false}
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); searchInputRef.current?.focus(); }}
                  className="absolute right-1.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                  title="Clear search"
                >
                  <X size={10} />
                </button>
              )}
            </div>
            {collections && collections.length > 0 && onCollectionFilterChange && (
              <div className="flex items-center gap-1.5">
                <Layers size={11} className="text-[var(--muted)] flex-shrink-0" />
                <select
                  value={collectionFilter}
                  onChange={(e) => onCollectionFilterChange(e.target.value)}
                  className="text-[11px] text-[var(--foreground)] bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-sm)] px-2 py-0.5 leading-tight cursor-pointer hover:border-[var(--border-hover,var(--border))] transition-colors appearance-none pr-5"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 6px center" }}
                  title="Filter colors by collection"
                >
                  <option value="all">All collections</option>
                  {collections.map((col) => (
                    <option key={col.id} value={col.id}>{col.name}</option>
                  ))}
                </select>
                {activeCollectionName && (
                  <button
                    onClick={() => onCollectionFilterChange("all")}
                    className="text-[10px] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors leading-none"
                    title="Clear collection filter"
                  >
                    ×
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {searchedColorIndex.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            {searchQuery.trim() ? (
              <>
                <p className="text-sm text-[var(--muted)]">No colors match &ldquo;{searchQuery.trim()}&rdquo;</p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-2 text-xs text-[var(--muted)] underline underline-offset-2 hover:text-[var(--foreground)] transition-colors"
                >
                  Clear search
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-[var(--muted)]">
                  No colors in &ldquo;{activeCollectionName}&rdquo;
                </p>
                {onCollectionFilterChange && (
                  <button
                    onClick={() => onCollectionFilterChange("all")}
                    className="mt-2 text-xs text-[var(--muted)] underline underline-offset-2 hover:text-[var(--foreground)] transition-colors"
                  >
                    Show all collections
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <>
            {bands.map((band) => (
              <div key={band.label}>
                <div id={bandId(band.label)} className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] select-none">
                    {band.label}
                  </span>
                  <span className="text-[10px] text-[var(--muted)]/60 tabular-nums">{band.colors.length}</span>
                  <div className="flex-1 h-px bg-[var(--border)]" />
                </div>
                <div
                  className="grid gap-1.5"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))" }}
                >
                  {band.colors.map(renderSwatch)}
                </div>
              </div>
            ))}

            {neutrals.length > 0 && (
              <div>
                <div id={bandId("Neutrals")} className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] select-none">
                    Neutrals
                  </span>
                  <span className="text-[10px] text-[var(--muted)]/60 tabular-nums">{neutrals.length}</span>
                  <div className="flex-1 h-px bg-[var(--border)]" />
                </div>
                <div
                  className="grid gap-1.5"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))" }}
                >
                  {neutrals.map(renderSwatch)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sticky hue-band jump index — iOS-style right edge letter list */}
      {allSections.length > 1 && (
        <div className="w-5 flex-shrink-0 relative">
          <nav
            className="sticky flex flex-col items-center gap-px"
            style={{ top: 72 }}
            aria-label="Jump to color band"
          >
            {allSections.map((label, index) => {
              const isActive = activeBand === label;
              const count = sectionCounts.get(label) ?? 0;
              const bandColor = BAND_COLOR[label];
              return (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.18, ease: "easeOut" }}
                >
                  <button
                    onClick={() => scrollToBand(label)}
                    title={`${label} · ${count} color${count !== 1 ? "s" : ""}`}
                    className="w-5 h-5 flex items-center justify-center rounded text-[9px] font-bold leading-none transition-all select-none hover:opacity-90 hover:scale-110"
                    style={
                      isActive
                        ? {
                            backgroundColor: bandColor ?? "var(--accent)",
                            color: bandColor ? getContrastColor(bandColor) : "var(--accent-fg)",
                            boxShadow: `0 0 0 2px ${bandColor ?? "var(--accent)"}40`,
                          }
                        : {
                            color: bandColor ?? "var(--muted)",
                            opacity: 0.65,
                          }
                    }
                  >
                    {BAND_ABBREV[label] ?? label.slice(0, 2)}
                  </button>
                </motion.div>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
