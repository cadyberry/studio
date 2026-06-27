export interface ColorSwatch {
  hex: string;
  name?: string;
  note?: string;
}

export interface Palette {
  id: string;
  name: string;
  colors: ColorSwatch[];
  sourceImage?: string; // base64 thumbnail
  collectionId?: string;
  tags: string[];
  frozen?: boolean;
  pinned?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  coverPaletteId?: string;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CohesionRecord {
  date: string; // ISO timestamp
  score: number;
  label: "Fragmented" | "Developing" | "Cohesive" | "Unified";
}

export interface FilterPreset {
  id: string;
  name: string;
  collection: string;
  tag: string;
  mood: string;
  freezeFilter: "all" | "locked";
  printReadyOnly: boolean;
  colorCount: number | "all";
  sortBy: string;
  createdAt: string;
}
