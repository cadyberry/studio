"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Share2, Check } from "lucide-react";
import Button from "@/components/ui/Button";
import type { Palette, Collection } from "@/types";
import { hexToRgb, rgbToHsl } from "@/lib/utils";

interface CohesionModalProps {
  collection: Collection | null;
  palettes: Palette[];
  onClose: () => void;
  onEditPalette?: (palette: Palette, swatchIndex: number) => void;
}

interface CohesionAnalysis {
  overall: number;
  hue: number;
  saturation: number;
  lightness: number;
  hueMean: number;
  hueSpread: number;
  satMean: number;
  label: "Fragmented" | "Developing" | "Cohesive" | "Unified";
  outlierIndex: number | null;
}

function analyzeCollectionCohesion(palettes: Palette[]): CohesionAnalysis {
  const allHsl = palettes.flatMap((p) =>
    p.colors
      .map((c) => {
        const rgb = hexToRgb(c.hex);
        return rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null;
      })
      .filter((v): v is { h: number; s: number; l: number } => v !== null)
  );

  const empty: CohesionAnalysis = {
    overall: 0, hue: 0, saturation: 0, lightness: 0,
    hueMean: 0, hueSpread: 0, satMean: 0,
    label: "Fragmented", outlierIndex: null,
  };
  if (allHsl.length === 0) return empty;

  // Circular hue statistics — handles the 0°/360° wraparound correctly
  const hueRads = allHsl.map((h) => (h.h * Math.PI) / 180);
  const meanSin = hueRads.reduce((s, r) => s + Math.sin(r), 0) / hueRads.length;
  const meanCos = hueRads.reduce((s, r) => s + Math.cos(r), 0) / hueRads.length;
  const R = Math.sqrt(meanSin * meanSin + meanCos * meanCos); // 1 = perfectly clustered
  const hueMean = Math.round(((Math.atan2(meanSin, meanCos) * 180) / Math.PI + 360) % 360);
  const hueScore = Math.round(R * 100);
  const hueSpread = Math.round((1 - R) * 180);

  // Saturation consistency
  const sats = allHsl.map((h) => h.s);
  const satMean = Math.round(sats.reduce((a, b) => a + b, 0) / sats.length);
  const satStd = Math.sqrt(sats.reduce((sum, s) => sum + (s - satMean) ** 2, 0) / sats.length);
  const satScore = Math.max(0, Math.round(100 - (satStd / 35) * 100));

  // Lightness consistency
  const lights = allHsl.map((h) => h.l);
  const lightMean = lights.reduce((a, b) => a + b, 0) / lights.length;
  const lightStd = Math.sqrt(lights.reduce((sum, l) => sum + (l - lightMean) ** 2, 0) / lights.length);
  const lightScore = Math.max(0, Math.round(100 - (lightStd / 35) * 100));

  const overall = Math.round(hueScore * 0.5 + satScore * 0.3 + lightScore * 0.2);

  // Outlier: palette whose hue+saturation profile deviates most from the collection mean
  let outlierIndex: number | null = null;
  if (palettes.length >= 3) {
    const distances = palettes.map((p) => {
      const palHsl = p.colors
        .map((c) => {
          const rgb = hexToRgb(c.hex);
          return rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null;
        })
        .filter((v): v is { h: number; s: number; l: number } => v !== null);

      if (palHsl.length === 0) return 0;

      const avgHueDist =
        palHsl.reduce((sum, hsl) => {
          const diff = Math.abs(hsl.h - hueMean);
          return sum + Math.min(diff, 360 - diff);
        }, 0) / palHsl.length;

      const avgSatDist =
        palHsl.reduce((sum, hsl) => sum + Math.abs(hsl.s - satMean), 0) / palHsl.length;

      return avgHueDist * 0.7 + avgSatDist * 0.3;
    });

    const maxDist = Math.max(...distances);
    const avgDist = distances.reduce((a, b) => a + b, 0) / distances.length;
    if (maxDist > avgDist * 2 && maxDist > 25) {
      outlierIndex = distances.indexOf(maxDist);
    }
  }

  const label: CohesionAnalysis["label"] =
    overall >= 80 ? "Unified" :
    overall >= 60 ? "Cohesive" :
    overall >= 40 ? "Developing" : "Fragmented";

  return {
    overall, hue: hueScore, saturation: satScore, lightness: lightScore,
    hueMean, hueSpread, satMean, label, outlierIndex,
  };
}

function hueName(deg: number): string {
  if (deg < 15 || deg >= 345) return "Reds";
  if (deg < 45) return "Oranges";
  if (deg < 75) return "Yellows";
  if (deg < 150) return "Greens";
  if (deg < 195) return "Teals";
  if (deg < 255) return "Blues";
  if (deg < 285) return "Purples";
  return "Pinks";
}

function scoreColor(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#0ea5e9";
  if (score >= 40) return "#f59e0b";
  return "#f43f5e";
}

function AnimatedBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="relative h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

function MetricRow({ label, score, description }: {
  label: string;
  score: number;
  description: string;
}) {
  const color = scoreColor(score);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[var(--muted)]">{description}</span>
          <span className="font-bold tabular-nums w-6 text-right" style={{ color }}>
            {score}
          </span>
        </div>
      </div>
      <AnimatedBar score={score} color={color} />
    </div>
  );
}

function PaletteStrip({
  palette,
  isOutlier,
  onEdit,
}: {
  palette: Palette;
  isOutlier: boolean;
  onEdit?: (palette: Palette) => void;
}) {
  const Tag = onEdit ? "button" : "div";
  return (
    <Tag
      onClick={onEdit ? () => onEdit(palette) : undefined}
      title={onEdit ? `Edit ${palette.name}` : undefined}
      className={`w-full flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-1.5 transition-colors text-left ${
        isOutlier
          ? "bg-rose-50 ring-1 ring-rose-200"
          : onEdit
          ? "hover:bg-[var(--surface-2)] cursor-pointer"
          : "hover:bg-[var(--surface-2)]"
      }`}
    >
      <div
        className="w-[88px] shrink-0 text-xs truncate font-medium"
        style={{ color: isOutlier ? "#be123c" : "var(--foreground)" }}
      >
        {palette.name}
      </div>
      <div className="flex-1 h-6 flex rounded overflow-hidden">
        {palette.colors.map((c, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: c.hex }} />
        ))}
      </div>
      <div className="w-4 shrink-0 flex justify-center">
        {isOutlier && <AlertTriangle size={11} className="text-rose-400" />}
      </div>
    </Tag>
  );
}

export default function CohesionModal({ collection, palettes, onClose, onEditPalette }: CohesionModalProps) {
  const [copied, setCopied] = useState(false);

  if (!collection) return null;

  const analysis = analyzeCollectionCohesion(palettes);
  const mainColor = scoreColor(analysis.overall);

  function buildShareUrl(): string {
    const outlierPalette =
      analysis.outlierIndex !== null && palettes[analysis.outlierIndex]
        ? palettes[analysis.outlierIndex].name
        : null;

    const hueDesc =
      analysis.hueSpread <= 25
        ? `${hueName(analysis.hueMean)} family`
        : analysis.hueSpread <= 65
        ? `${hueName(analysis.hueMean)}-leaning`
        : "Broad hue range";

    const satDesc =
      analysis.satMean > 65 ? "Vivid tones" :
      analysis.satMean > 35 ? "Moderate tones" : "Muted tones";

    const lightDesc =
      analysis.lightness >= 75 ? "Consistent depth" :
      analysis.lightness >= 50 ? "Some variation" : "High contrast mix";

    const payload = {
      v: 1,
      name: collection!.name,
      overall: analysis.overall,
      hue: analysis.hue,
      sat: analysis.saturation,
      light: analysis.lightness,
      label: analysis.label,
      hueMean: analysis.hueMean,
      hueSpread: analysis.hueSpread,
      satMean: analysis.satMean,
      hueDesc,
      satDesc,
      lightDesc,
      outlier: outlierPalette,
      palettes: palettes.map((p) => ({
        n: p.name,
        c: p.colors.map((c) => c.hex.replace("#", "")),
      })),
    };
    const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
    return `${window.location.origin}/c?r=${encoded}`;
  }

  function handleShare() {
    const url = buildShareUrl();
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const hueDesc =
    analysis.hueSpread <= 25
      ? `${hueName(analysis.hueMean)} family`
      : analysis.hueSpread <= 65
      ? `${hueName(analysis.hueMean)}-leaning`
      : "Broad hue range";

  const satDesc =
    analysis.satMean > 65 ? "Vivid tones" :
    analysis.satMean > 35 ? "Moderate tones" : "Muted tones";

  const lightDesc =
    analysis.lightness >= 75 ? "Consistent depth" :
    analysis.lightness >= 50 ? "Some variation" : "High contrast mix";

  // Build a representative color strip from all palettes for the header
  const headerColors = palettes
    .flatMap((p) => p.colors)
    .filter((_, i, arr) => i % Math.max(1, Math.floor(arr.length / 16)) === 0)
    .slice(0, 16);

  return (
    <AnimatePresence>
      <motion.div
        key="cohesion-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="bg-[var(--surface)] rounded-[var(--radius-lg)] w-full max-w-md shadow-2xl overflow-hidden my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Composite color bar from all palettes in the collection */}
          <div className="flex h-2">
            {headerColors.map((c, i) => (
              <div key={i} className="flex-1" style={{ backgroundColor: c.hex }} />
            ))}
          </div>

          <div className="p-5 space-y-5">
            {/* Title */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold">{collection.name}</h2>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  {palettes.length} palette{palettes.length !== 1 ? "s" : ""} — brand cohesion analysis
                </p>
              </div>
              <div className="flex items-center gap-1">
                {palettes.length >= 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleShare}
                    title="Copy shareable link to this report"
                    className={copied ? "text-emerald-600" : ""}
                  >
                    {copied ? <Check size={14} /> : <Share2 size={14} />}
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X size={14} />
                </Button>
              </div>
            </div>

            {palettes.length === 0 ? (
              <p className="text-sm text-[var(--muted)] py-6 text-center">
                No palettes in this collection yet.
              </p>
            ) : palettes.length === 1 ? (
              <p className="text-sm text-[var(--muted)] py-6 text-center">
                Add at least 2 palettes to analyze cohesion.
              </p>
            ) : (
              <>
                {/* Stacked palette strips */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-2">
                    Palettes
                  </div>
                  <div className="space-y-0.5">
                    {palettes.map((p, i) => (
                      <PaletteStrip
                        key={p.id}
                        palette={p}
                        isOutlier={analysis.outlierIndex === i}
                        onEdit={onEditPalette ? (pal) => { onClose(); onEditPalette(pal, 0); } : undefined}
                      />
                    ))}
                  </div>
                </div>

                {/* Cohesion Score */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-3">
                    Cohesion Score
                  </div>
                  <div className="flex items-end gap-3 mb-3">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
                      className="text-5xl font-black tabular-nums leading-none"
                      style={{ color: mainColor }}
                    >
                      {analysis.overall}
                    </motion.div>
                    <div className="mb-1">
                      <div className="text-sm font-bold" style={{ color: mainColor }}>
                        {analysis.label}
                      </div>
                      <div className="text-xs text-[var(--muted)]">out of 100</div>
                    </div>
                  </div>
                  <AnimatedBar score={analysis.overall} color={mainColor} />
                  <div className="flex justify-between text-[9px] text-[var(--muted)] mt-1.5 px-0.5">
                    <span>Fragmented</span>
                    <span>Developing</span>
                    <span>Cohesive</span>
                    <span>Unified</span>
                  </div>
                </div>

                {/* Breakdown */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-3">
                    Breakdown
                  </div>
                  <div className="space-y-3">
                    <MetricRow
                      label="Hue Harmony"
                      score={analysis.hue}
                      description={hueDesc}
                    />
                    <MetricRow
                      label="Saturation"
                      score={analysis.saturation}
                      description={satDesc}
                    />
                    <MetricRow
                      label="Lightness"
                      score={analysis.lightness}
                      description={lightDesc}
                    />
                  </div>
                </div>

                {/* Outlier callout */}
                {analysis.outlierIndex !== null && palettes[analysis.outlierIndex] && (
                  <div className="flex items-start gap-2.5 p-3 rounded-[var(--radius-sm)] bg-rose-50 border border-rose-200">
                    <AlertTriangle size={13} className="text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-rose-700 leading-relaxed">
                      <span className="font-semibold">
                        {palettes[analysis.outlierIndex].name}
                      </span>{" "}
                      has a notably different hue and saturation profile from the rest of this
                      collection. Consider adjusting it or moving it to a separate collection.
                    </p>
                  </div>
                )}

                <p className="text-[10px] text-[var(--muted)] leading-relaxed">
                  Scored by circular hue variance (50%), saturation consistency (30%), and lightness balance (20%).
                </p>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
