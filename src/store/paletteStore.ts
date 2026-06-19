"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Palette, Collection, CohesionRecord } from "@/types";
import { generateId } from "@/lib/utils";

interface PaletteStore {
  palettes: Palette[];
  collections: Collection[];
  cohesionHistory: Record<string, CohesionRecord[]>;

  recordCohesionScore: (collectionId: string, score: number, label: CohesionRecord["label"]) => void;
  getCohesionHistory: (collectionId: string) => CohesionRecord[];

  addPalette: (palette: Omit<Palette, "id" | "createdAt" | "updatedAt">) => Palette;
  updatePalette: (id: string, updates: Partial<Palette>) => void;
  deletePalette: (id: string) => void;
  deletePalettes: (ids: string[]) => void;
  duplicatePalette: (id: string) => Palette | null;
  assignPalettesToCollection: (ids: string[], collectionId: string | undefined) => void;
  togglePin: (id: string) => void;

  addCollection: (name: string, description?: string) => Collection;
  updateCollection: (id: string, updates: Partial<Collection>) => void;
  deleteCollection: (id: string) => void;

  getPalettesByCollection: (collectionId: string | null) => Palette[];
}

export const usePaletteStore = create<PaletteStore>()(
  persist(
    (set, get) => ({
      palettes: [],
      collections: [],
      cohesionHistory: {},

      recordCohesionScore: (collectionId, score, label) => {
        const now = new Date().toISOString();
        const today = now.slice(0, 10); // "YYYY-MM-DD"
        const history = get().cohesionHistory[collectionId] ?? [];
        const last = history[history.length - 1];
        // Skip if same score already recorded today
        if (last && last.date.slice(0, 10) === today && last.score === score) return;
        const next = [...history, { date: now, score, label }].slice(-60);
        set((s) => ({ cohesionHistory: { ...s.cohesionHistory, [collectionId]: next } }));
      },

      getCohesionHistory: (collectionId) => {
        return get().cohesionHistory[collectionId] ?? [];
      },

      addPalette: (palette) => {
        const now = new Date().toISOString();
        const newPalette: Palette = {
          ...palette,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ palettes: [newPalette, ...s.palettes] }));
        return newPalette;
      },

      updatePalette: (id, updates) => {
        set((s) => ({
          palettes: s.palettes.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
          ),
        }));
      },

      deletePalette: (id) => {
        set((s) => ({ palettes: s.palettes.filter((p) => p.id !== id) }));
      },

      deletePalettes: (ids) => {
        const idSet = new Set(ids);
        set((s) => ({ palettes: s.palettes.filter((p) => !idSet.has(p.id)) }));
      },

      togglePin: (id) => {
        set((s) => ({
          palettes: s.palettes.map((p) =>
            p.id === id ? { ...p, pinned: !p.pinned } : p
          ),
        }));
      },

      assignPalettesToCollection: (ids, collectionId) => {
        const idSet = new Set(ids);
        const now = new Date().toISOString();
        set((s) => ({
          palettes: s.palettes.map((p) =>
            idSet.has(p.id) ? { ...p, collectionId, updatedAt: now } : p
          ),
        }));
      },

      duplicatePalette: (id) => {
        const palette = get().palettes.find((p) => p.id === id);
        if (!palette) return null;
        return get().addPalette({
          name: `${palette.name} (copy)`,
          colors: [...palette.colors],
          tags: [...palette.tags],
          collectionId: palette.collectionId,
          notes: palette.notes,
        });
      },

      addCollection: (name, description) => {
        const now = new Date().toISOString();
        const newCollection: Collection = {
          id: generateId(),
          name,
          description,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ collections: [newCollection, ...s.collections] }));
        return newCollection;
      },

      updateCollection: (id, updates) => {
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
          ),
        }));
      },

      deleteCollection: (id) => {
        set((s) => ({
          collections: s.collections.filter((c) => c.id !== id),
          // Unassign palettes from deleted collection
          palettes: s.palettes.map((p) =>
            p.collectionId === id ? { ...p, collectionId: undefined } : p
          ),
        }));
      },

      getPalettesByCollection: (collectionId) => {
        const { palettes } = get();
        if (collectionId === null) return palettes.filter((p) => !p.collectionId);
        return palettes.filter((p) => p.collectionId === collectionId);
      },
    }),
    {
      name: "palette-studio-storage",
    }
  )
);
