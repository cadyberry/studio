# Progress Log

---

## 2026-05-21 — Session 1: Vision + MVP

### What was done
- Defined full project vision in VISION.md: **Palette** — color intelligence for print-on-demand creators
- Scaffolded Next.js 14 (App Router) project with TypeScript + Tailwind CSS
- Installed: framer-motion, zustand, lucide-react, Radix UI primitives
- Built custom design system (CSS vars, global styles, Button component)
- Implemented color extraction from image upload using a pure canvas/median-cut algorithm (no external dependency)
- Built Zustand store with localStorage persistence for palettes and collections
- Built full UI:
  - Drag-and-drop / click-to-upload extractor with image thumbnail preview
  - Animated color strip display with copy-on-click for individual swatches
  - Save palette flow with auto-name from filename
  - Palette library grid with search
  - Collection grouping (create, assign, filter by)
  - Export modal: PNG strip download, copy hex list, copy CSS variables, copy JSON
  - Rename and collection-assign modals
  - PaletteCard with hover actions (rename, collection, export, delete with confirm)
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **No backend for MVP** — localStorage is instant to ship and the tool is single-user to start
- **Custom median-cut color extraction** instead of color-thief to avoid canvas taint issues and have full control over the algorithm
- **Framer Motion layout animations** on the palette grid for a polished feel without performance cost

### What's next (Session 2)
- Harmony View: preview extracted palette as background, text, button, and card context
- Visual cohesion: show all palettes in a collection stacked to see if they "belong together"
- Palette editing: click a swatch to swap/adjust its color
