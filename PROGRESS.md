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

---

## 2026-05-21 — Session 2: Harmony View

### What was done
- Built **Harmony View** — the feature that differentiates Palette from generic color tools
- Added WCAG 2.1 color science utilities to `utils.ts`:
  - `getRelativeLuminance` — linear RGB luminance per WCAG spec
  - `getContrastRatio` — contrast ratio from 1:1 to 21:1
  - `assignColorRoles` — smart auto-assignment of semantic roles (background, surface, accent, secondary, text) using luminance sort + saturation ranking
- Built `HarmonyModal.tsx` — a full mock product shop page (nav, hero, product cards, footer) rendered using the extracted palette's auto-assigned color roles, so creators can instantly visualize their palette as a real UI system
- Added AA/AAA WCAG contrast badges for each color role pairing
- Added an Eye icon button to PaletteCard that opens the harmony view
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **No backend needed** — all harmony computation is pure client-side math
- **Auto role assignment** uses luminance + saturation (lightest → background, darkest → text, most saturated → accent) rather than asking users to assign manually
- **Mini mockup is a live render** (not a static image), so every palette gets a unique, accurate preview

### What's next (Session 3)
- Palette editing: click any swatch in the library to open a color picker and swap/nudge that color
- Collection cohesion view: when viewing a collection, stack all palettes to see if they feel like one brand
- "Dark preview" toggle in Harmony View: swap background and text roles to see dark mode interpretation
