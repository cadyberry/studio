import type { Metadata } from "next";
import SharedPaletteView from "@/components/palette/SharedPaletteView";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const name = typeof params.n === "string" ? params.n : "Shared Palette";
  return {
    title: `${name} — Palette`,
    description: `A color palette shared from Palette — color intelligence for creators.`,
  };
}

export default async function SharedPalettePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const name = typeof params.n === "string" ? params.n : "Shared Palette";
  const colorsStr = typeof params.c === "string" ? params.c : "";
  const notes = typeof params.no === "string" ? params.no : undefined;
  const swatchNamesStr = typeof params.s === "string" ? params.s : "";
  const swatchNames = swatchNamesStr
    ? swatchNamesStr.split(",").map((s) => { try { return decodeURIComponent(s); } catch { return s; } })
    : [];

  const colors = colorsStr
    .split(",")
    .map((h) => h.trim())
    .filter((h) => /^[0-9a-fA-F]{6}$/.test(h))
    .map((h, i) => ({ hex: `#${h}`, ...(swatchNames[i] ? { name: swatchNames[i] } : {}) }));

  if (colors.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <div className="text-center">
          <p className="text-[var(--muted)] mb-4">This palette link is invalid or missing colors.</p>
          <a href="/" className="text-sm underline underline-offset-2 hover:text-[var(--foreground)] transition-colors text-[var(--muted)]">
            Go to Palette →
          </a>
        </div>
      </div>
    );
  }

  return <SharedPaletteView name={name} colors={colors} notes={notes} />;
}
