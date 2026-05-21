export type Season = "spring" | "summer" | "fall" | "winter" | "evergreen";

export interface TrendPalette {
  id: string;
  name: string;
  season: Season;
  mood: string;
  colors: string[];
}

export const SEASON_META: Record<Season, { label: string; gradient: string }> = {
  spring:    { label: "Spring",    gradient: "from-rose-200 via-pink-100 to-green-200" },
  summer:    { label: "Summer",    gradient: "from-amber-300 via-orange-200 to-cyan-200" },
  fall:      { label: "Fall",      gradient: "from-orange-400 via-amber-300 to-red-500" },
  winter:    { label: "Winter",    gradient: "from-blue-200 via-indigo-200 to-slate-300" },
  evergreen: { label: "Evergreen", gradient: "from-violet-200 via-rose-100 to-amber-100" },
};

export const TREND_PALETTES: TrendPalette[] = [
  // ── Spring ───────────────────────────────────────────────────────────────────
  {
    id: "spring-cherry",
    name: "Cherry Blossom",
    season: "spring",
    mood: "Soft · Romantic · Feminine",
    colors: ["#fce4ec", "#f8bbd9", "#e57fa8", "#c2185b", "#880e4f"],
  },
  {
    id: "spring-garden",
    name: "Garden Walk",
    season: "spring",
    mood: "Fresh · Botanical · Uplifting",
    colors: ["#f1f8e9", "#c5e1a5", "#8bc34a", "#558b2f", "#33691e"],
  },
  {
    id: "spring-peach",
    name: "Peach Bloom",
    season: "spring",
    mood: "Warm · Tender · Inviting",
    colors: ["#fff9f5", "#ffd1a3", "#ffaa5e", "#e8845a", "#8b4a28"],
  },
  {
    id: "spring-lilac",
    name: "Lilac Fields",
    season: "spring",
    mood: "Dreamy · Quiet · Whimsical",
    colors: ["#f8f4ff", "#e6ddf8", "#c3a8e8", "#9068c4", "#4a2880"],
  },

  // ── Summer ────────────────────────────────────────────────────────────────────
  {
    id: "summer-golden",
    name: "Golden Shore",
    season: "summer",
    mood: "Warm · Coastal · Luminous",
    colors: ["#fff8e1", "#ffe082", "#ffb300", "#f57c00", "#e64a19"],
  },
  {
    id: "summer-coral",
    name: "Electric Coral",
    season: "summer",
    mood: "Bold · Vibrant · Playful",
    colors: ["#fff3e0", "#ff8a65", "#ff5722", "#c62828", "#4a148c"],
  },
  {
    id: "summer-lagoon",
    name: "Tropic Lagoon",
    season: "summer",
    mood: "Refreshing · Aqua · Breezy",
    colors: ["#e0f7fa", "#80deea", "#00bcd4", "#0097a7", "#006064"],
  },
  {
    id: "summer-sunset",
    name: "Retro Sunset",
    season: "summer",
    mood: "70s · Warm · Nostalgic",
    colors: ["#fff0d8", "#ffb347", "#ff6b6b", "#c94040", "#7a1c4b"],
  },

  // ── Fall ─────────────────────────────────────────────────────────────────────
  {
    id: "fall-harvest",
    name: "Harvest Spice",
    season: "fall",
    mood: "Rich · Earthy · Warm",
    colors: ["#fdf5e8", "#f2c464", "#d4813a", "#8b3a1a", "#3c1810"],
  },
  {
    id: "fall-crimson",
    name: "Crimson Forest",
    season: "fall",
    mood: "Moody · Dramatic · Wild",
    colors: ["#f5e6d3", "#d4845a", "#8b2500", "#3d1a00", "#1a0a00"],
  },
  {
    id: "fall-plum",
    name: "Autumn Plum",
    season: "fall",
    mood: "Jeweled · Lush · Sophisticated",
    colors: ["#f8f0f8", "#d4a0c0", "#9c5880", "#6a2a50", "#2d0d20"],
  },
  {
    id: "fall-sienna",
    name: "Sienna & Sage",
    season: "fall",
    mood: "Organic · Grounded · Studio",
    colors: ["#f4efe8", "#c8a878", "#8a6848", "#5c3820", "#2a1808"],
  },

  // ── Winter ────────────────────────────────────────────────────────────────────
  {
    id: "winter-arctic",
    name: "Arctic Frost",
    season: "winter",
    mood: "Icy · Minimal · Clean",
    colors: ["#e8f4f8", "#b3e5fc", "#4fc3f7", "#0288d1", "#01579b"],
  },
  {
    id: "winter-pine",
    name: "Midnight Pine",
    season: "winter",
    mood: "Deep · Festive · Luxe",
    colors: ["#f4f0e8", "#a8c5a0", "#4a7c59", "#1e3d2f", "#0b1f18"],
  },
  {
    id: "winter-silver",
    name: "Silver & Snow",
    season: "winter",
    mood: "Quiet · Elegant · Serene",
    colors: ["#f5f7fa", "#d4d9e8", "#8a9ab8", "#4a5578", "#1a2040"],
  },
  {
    id: "winter-burgundy",
    name: "Velvet Burgundy",
    season: "winter",
    mood: "Opulent · Warm · Dramatic",
    colors: ["#f9f0f0", "#e8c0c4", "#c06878", "#8b2040", "#3d0818"],
  },

  // ── Evergreen ─────────────────────────────────────────────────────────────────
  {
    id: "ever-academia",
    name: "Dark Academia",
    season: "evergreen",
    mood: "Scholarly · Moody · Classic",
    colors: ["#f3ede2", "#c4a882", "#7a6048", "#4a3728", "#1e1408"],
  },
  {
    id: "ever-ocean",
    name: "Ocean Depth",
    season: "evergreen",
    mood: "Serene · Bold · Nautical",
    colors: ["#e3f2fd", "#81d4fa", "#0288d1", "#01579b", "#0d2b3e"],
  },
  {
    id: "ever-rose",
    name: "Vintage Rose",
    season: "evergreen",
    mood: "Nostalgic · Soft · Romantic",
    colors: ["#fdf0f0", "#e8c4c0", "#c4847a", "#8b4a47", "#3d1c1a"],
  },
  {
    id: "ever-desert",
    name: "Desert Dusk",
    season: "evergreen",
    mood: "Terracotta · Organic · Modern",
    colors: ["#faf5ec", "#e8c4a0", "#c4856a", "#8b4a32", "#2d1a0f"],
  },
  {
    id: "ever-lavender",
    name: "Lavender Dream",
    season: "evergreen",
    mood: "Soft · Dreamy · Feminine",
    colors: ["#f8f4ff", "#e0d0f8", "#b09ad8", "#7b5ea8", "#3d2460"],
  },
  {
    id: "ever-matcha",
    name: "Matcha Ritual",
    season: "evergreen",
    mood: "Earthy · Zen · Natural",
    colors: ["#f4f8f0", "#c8d8a8", "#8aac68", "#4a7030", "#1e3010"],
  },
];

export const SEASONS: Season[] = ["spring", "summer", "fall", "winter", "evergreen"];
