"use client";

import { create } from "zustand";

interface SessionStore {
  viewedPaletteIds: Set<string>;
  markViewed: (id: string) => void;
}

// Non-persisted — resets on every page reload (intentional)
export const useSessionStore = create<SessionStore>()((set) => ({
  viewedPaletteIds: new Set(),
  markViewed: (id) =>
    set((s) => {
      if (s.viewedPaletteIds.has(id)) return s;
      const next = new Set(s.viewedPaletteIds);
      next.add(id);
      return { viewedPaletteIds: next };
    }),
}));
