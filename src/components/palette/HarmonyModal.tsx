"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Button from "@/components/ui/Button";
import type { Palette } from "@/types";
import {
  assignColorRoles,
  getContrastRatio,
  getContrastColor,
  type RoleAssignment,
  type ColorRole,
} from "@/lib/utils";

interface HarmonyModalProps {
  palette: Palette | null;
  onClose: () => void;
}

const ROLE_META: Record<ColorRole, { label: string; desc: string }> = {
  background: { label: "Background", desc: "Page backgrounds" },
  surface:    { label: "Surface",    desc: "Cards & elevated panels" },
  accent:     { label: "Accent",     desc: "Buttons, links, highlights" },
  secondary:  { label: "Secondary",  desc: "Tags, subtle fills" },
  text:       { label: "Text",       desc: "Headings & body copy" },
};

function ContrastBadge({ ratio }: { ratio: number }) {
  const aaa = ratio >= 7;
  const aa = ratio >= 4.5;
  return (
    <span
      style={{ fontSize: 9 }}
      className={`inline-flex items-center px-1.5 py-0.5 rounded font-bold tracking-wide ${
        aaa
          ? "bg-emerald-100 text-emerald-700"
          : aa
          ? "bg-sky-100 text-sky-700"
          : "bg-rose-100 text-rose-600"
      }`}
    >
      {aaa ? "AAA" : aa ? "AA" : "Fail"}
      <span className="ml-0.5 opacity-70">{ratio.toFixed(1)}</span>
    </span>
  );
}

function MockShopPage({ roles }: { roles: RoleAssignment[] }) {
  const getHex = (role: ColorRole, fallback: string) =>
    roles.find((r) => r.role === role)?.hex ?? fallback;

  const bg      = getHex("background", "#ffffff");
  const surface = getHex("surface",    bg);
  const accent  = getHex("accent",     "#333333");
  const text    = getHex("text",       "#111111");
  const second  = getHex("secondary",  surface);

  const onAccent  = getContrastColor(accent);
  const onSurface = getContrastColor(surface);
  const onBg      = getContrastColor(bg);

  const products = [
    { label: "Bloom Print",  price: "$24", shade: 0.18 },
    { label: "Dusk Puzzle",  price: "$38", shade: 0.28 },
    { label: "Haze Tote",    price: "$18", shade: 0.10 },
  ];

  return (
    <div
      style={{ backgroundColor: bg, fontFamily: "system-ui, -apple-system, sans-serif" }}
      className="rounded-[10px] overflow-hidden border border-[var(--border)] text-[13px]"
    >
      {/* Nav */}
      <div
        style={{
          backgroundColor: bg,
          borderBottom: `1px solid ${text}18`,
          padding: "9px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: accent }} />
          <span style={{ color: text, fontWeight: 700, fontSize: 13, letterSpacing: "-0.01em" }}>
            SHOP
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {["Collections", "About"].map((item) => (
            <span key={item} style={{ color: text, opacity: 0.5, fontSize: 11 }}>
              {item}
            </span>
          ))}
          <div
            style={{
              backgroundColor: accent,
              color: onAccent,
              padding: "3px 10px",
              borderRadius: 99,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            Cart
          </div>
        </div>
      </div>

      {/* Hero */}
      <div style={{ backgroundColor: accent, padding: "22px 20px 20px" }}>
        <div style={{ color: onAccent, fontWeight: 800, fontSize: 20, letterSpacing: "-0.02em", marginBottom: 5 }}>
          New Collection
        </div>
        <div style={{ color: onAccent, opacity: 0.75, fontSize: 12, marginBottom: 14, lineHeight: 1.5 }}>
          Limited edition prints, puzzles & apparel
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div
            style={{
              backgroundColor: onAccent,
              color: accent,
              padding: "6px 14px",
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 700,
              cursor: "default",
            }}
          >
            Shop Now
          </div>
          <div
            style={{
              border: `1.5px solid ${onAccent}55`,
              color: onAccent,
              padding: "6px 14px",
              borderRadius: 7,
              fontSize: 12,
              cursor: "default",
            }}
          >
            Browse All
          </div>
        </div>
      </div>

      {/* Products */}
      <div style={{ backgroundColor: bg, padding: "16px 16px 18px" }}>
        <div
          style={{
            color: onBg,
            opacity: 0.4,
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 10,
          }}
        >
          Featured
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {products.map((p, i) => (
            <div
              key={i}
              style={{
                backgroundColor: surface,
                borderRadius: 8,
                overflow: "hidden",
                border: `1px solid ${text}12`,
              }}
            >
              <div
                style={{
                  height: 56,
                  backgroundColor: second,
                  opacity: p.shade + 0.45,
                  backgroundImage: `linear-gradient(135deg, ${accent}55 0%, ${second}88 100%)`,
                }}
              />
              <div style={{ padding: "7px 8px 8px" }}>
                <div style={{ color: onSurface, fontSize: 10, fontWeight: 600, marginBottom: 2 }}>
                  {p.label}
                </div>
                <div style={{ color: accent, fontSize: 10, fontWeight: 700 }}>{p.price}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          backgroundColor: bg,
          borderTop: `1px solid ${text}12`,
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ color: onBg, opacity: 0.35, fontSize: 10 }}>© 2026 SHOP</span>
        <div style={{ display: "flex", gap: 8 }}>
          {[accent, second, surface].map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: c }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function RoleCard({ assignment, bgHex, textHex }: {
  assignment: RoleAssignment;
  bgHex: string;
  textHex: string;
}) {
  const meta = ROLE_META[assignment.role];
  const contrastVsBg   = getContrastRatio(assignment.hex, bgHex);
  const contrastVsText = getContrastRatio(assignment.hex, textHex);

  const showTextContrast  = assignment.role === "background" || assignment.role === "surface" || assignment.role === "accent";
  const showBgContrast    = assignment.role === "text" || assignment.role === "accent" || assignment.role === "secondary";

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-[var(--radius-sm)] bg-[var(--surface-2)]">
      <div
        className="w-9 h-9 rounded-lg flex-shrink-0 border border-black/[0.08]"
        style={{ backgroundColor: assignment.hex }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold">{meta.label}</div>
        <div className="font-mono text-[10px] text-[var(--muted)] mt-0.5">
          {assignment.hex.toUpperCase()}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        {showTextContrast && (
          <ContrastBadge ratio={contrastVsText} />
        )}
        {showBgContrast && assignment.role !== "text" && (
          <ContrastBadge ratio={contrastVsBg} />
        )}
        {assignment.role === "text" && (
          <ContrastBadge ratio={contrastVsBg} />
        )}
      </div>
    </div>
  );
}

export default function HarmonyModal({ palette, onClose }: HarmonyModalProps) {
  if (!palette) return null;

  const roles = assignColorRoles(palette.colors);
  const bgHex   = roles.find((r) => r.role === "background")?.hex ?? "#ffffff";
  const textHex = roles.find((r) => r.role === "text")?.hex ?? "#000000";

  const bgTextContrast = getContrastRatio(bgHex, textHex);

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
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
          className="bg-[var(--surface)] rounded-[var(--radius-lg)] w-full max-w-lg shadow-2xl overflow-hidden my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Swatch header */}
          <div className="flex h-12">
            {palette.colors.map((color, i) => (
              <div key={i} className="flex-1" style={{ backgroundColor: color.hex }} />
            ))}
          </div>

          <div className="p-5">
            {/* Title row */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold">{palette.name}</h2>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Harmony view — palette applied as a UI system
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X size={14} />
              </Button>
            </div>

            {/* Mock page preview */}
            <MockShopPage roles={roles} />

            {/* Contrast summary */}
            <div className="mt-3 flex items-center gap-2 text-xs text-[var(--muted)]">
              <span>Text / Background contrast:</span>
              <ContrastBadge ratio={bgTextContrast} />
              <span className="ml-auto opacity-60">
                {bgTextContrast >= 7 ? "AAA pass" : bgTextContrast >= 4.5 ? "AA pass" : "Below AA — adjust text or bg"}
              </span>
            </div>

            {/* Color roles */}
            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-2">
                Color Roles
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {roles.map((assignment, i) => (
                  <RoleCard
                    key={i}
                    assignment={assignment}
                    bgHex={bgHex}
                    textHex={textHex}
                  />
                ))}
              </div>
            </div>

            <p className="text-[10px] text-[var(--muted)] mt-3 leading-relaxed">
              Roles are auto-assigned by luminance & saturation. Contrast badges show WCAG 2.1 ratios against background/text.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
