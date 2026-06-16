"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, AlertTriangle } from "lucide-react";

interface SharePayload {
  v: 1;
  name: string;
  overall: number;
  hue: number;
  sat: number;
  light: number;
  label: "Fragmented" | "Developing" | "Cohesive" | "Unified";
  hueMean: number;
  hueSpread: number;
  satMean: number;
  hueDesc: string;
  satDesc: string;
  lightDesc: string;
  outlier: string | null;
  palettes: Array<{ n: string; c: string[] }>;
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
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
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

function PaletteStrip({ name, colors, isOutlier }: { name: string; colors: string[]; isOutlier: boolean }) {
  return (
    <div
      className={`w-full flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-1.5 ${
        isOutlier ? "bg-rose-50 ring-1 ring-rose-200" : ""
      }`}
    >
      <div
        className="w-[88px] shrink-0 text-xs truncate font-medium"
        style={{ color: isOutlier ? "#be123c" : "var(--foreground)" }}
      >
        {name}
      </div>
      <div className="flex-1 h-6 flex rounded overflow-hidden">
        {colors.map((hex, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: `#${hex}` }} />
        ))}
      </div>
      <div className="w-4 shrink-0 flex justify-center">
        {isOutlier && <AlertTriangle size={11} className="text-rose-400" />}
      </div>
    </div>
  );
}

export default function SharedCohesionView({ encoded }: { encoded: string }) {
  const payload = useMemo<SharePayload | null>(() => {
    try {
      return JSON.parse(decodeURIComponent(atob(encoded))) as SharePayload;
    } catch {
      return null;
    }
  }, [encoded]);

  if (!payload || payload.v !== 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <div className="text-center">
          <p className="text-[var(--muted)] mb-4">This cohesion report link is invalid or expired.</p>
          <a href="/" className="text-sm underline underline-offset-2 hover:text-[var(--foreground)] transition-colors text-[var(--muted)]">
            Go to Palette →
          </a>
        </div>
      </div>
    );
  }

  const mainColor = scoreColor(payload.overall);

  const headerColors = payload.palettes
    .flatMap((p) => p.c)
    .filter((_, i, arr) => i % Math.max(1, Math.floor(arr.length / 16)) === 0)
    .slice(0, 16);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--background)]/90 backdrop-blur-md border-b border-[var(--border-subtle)]">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Palette</span>
          </a>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-rose-300 via-violet-300 to-sky-300" />
          </div>
        </div>
      </header>

      {/* Composite color bar */}
      <div className="flex h-1.5">
        {headerColors.map((hex, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: `#${hex}` }} />
        ))}
      </div>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10 space-y-10">
        {/* Title block */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-1">
            Brand Cohesion Report
          </div>
          <h1 className="text-2xl font-bold">{payload.name}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            {payload.palettes.length} palette{payload.palettes.length !== 1 ? "s" : ""} analyzed
          </p>
        </div>

        {/* Score */}
        <div className="bg-[var(--surface)] rounded-[var(--radius-lg)] p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-4">
            Cohesion Score
          </div>
          <div className="flex items-end gap-3 mb-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
              className="text-6xl font-black tabular-nums leading-none"
              style={{ color: mainColor }}
            >
              {payload.overall}
            </motion.div>
            <div className="mb-1">
              <div className="text-base font-bold" style={{ color: mainColor }}>
                {payload.label}
              </div>
              <div className="text-xs text-[var(--muted)]">out of 100</div>
            </div>
          </div>
          <AnimatedBar score={payload.overall} color={mainColor} />
          <div className="flex justify-between text-[9px] text-[var(--muted)] mt-1.5 px-0.5">
            <span>Fragmented</span>
            <span>Developing</span>
            <span>Cohesive</span>
            <span>Unified</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="bg-[var(--surface)] rounded-[var(--radius-lg)] p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-4">
            Breakdown
          </div>
          <div className="space-y-4">
            <MetricRow
              label="Hue Harmony"
              score={payload.hue}
              description={payload.hueDesc}
            />
            <MetricRow
              label="Saturation"
              score={payload.sat}
              description={payload.satDesc}
            />
            <MetricRow
              label="Lightness"
              score={payload.light}
              description={payload.lightDesc}
            />
          </div>
          <p className="text-[10px] text-[var(--muted)] leading-relaxed mt-4">
            Scored by circular hue variance (50%), saturation consistency (30%), and lightness balance (20%).
          </p>
        </div>

        {/* Palettes */}
        <div className="bg-[var(--surface)] rounded-[var(--radius-lg)] p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-3">
            Palettes
          </div>
          <div className="space-y-0.5">
            {payload.palettes.map((p, i) => (
              <PaletteStrip
                key={i}
                name={p.n}
                colors={p.c}
                isOutlier={payload.outlier === p.n}
              />
            ))}
          </div>

          {payload.outlier && (
            <div className="flex items-start gap-2.5 p-3 rounded-[var(--radius-sm)] bg-rose-50 border border-rose-200 mt-3">
              <AlertTriangle size={13} className="text-rose-500 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700 leading-relaxed">
                <span className="font-semibold">{payload.outlier}</span>{" "}
                has a notably different hue and saturation profile from the rest of this collection.
              </p>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="text-center pb-6">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors underline underline-offset-2"
          >
            Open Palette to analyze your own collections →
          </a>
        </div>
      </main>
    </div>
  );
}
