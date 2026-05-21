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

---

## 2026-05-21 — Session 3: Swatch Color Editor

### What was done
- Built **SwatchEditor** — a full color editing modal triggered by a pencil icon on any swatch
  - Native `<input type="color">` for visual selection
  - HSL sliders (H 0–360°, S 0–100%, L 0–100%) with live CSS gradient tracks (rainbow for hue, saturation/lightness context-aware)
  - Hex text input with blur/enter validation and auto-normalization
  - Live palette strip preview with the edited swatch highlighted (ring inset)
  - WCAG contrast badges against white and black (AA threshold highlighted)
  - Original color swatch for reference; Reset button (disabled when unchanged)
- Added `hslToRgb`, `hslToHex`, `isValidHex` utilities to `utils.ts`
- Updated `PaletteCard`: pencil icon appears on individual swatch hover (stops propagation so copy-on-click still works)
- Wired `SwatchEditor` into `page.tsx` with `editTarget` state
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **HSL as intermediate state** — sliders operate in HSL space (more intuitive for "nudge hue" or "lighten") while hex is kept in sync for copy/save
- **Gradient slider tracks** are pure CSS, showing context (saturation slider shows actual current lightness, not just a gray→saturated band) so creators see exactly what they'll get
- **Pencil separate from copy click** — edit icon uses stopPropagation; body click still copies hex, preserving muscle memory

### What's next (Session 4)
- Collection cohesion view: stack all palettes in a collection to check brand unity
- "Dark preview" toggle in Harmony View
- CMYK shift preview (see how screen colors shift in print)

---

## 2026-05-21 — Session 4: Collection Cohesion View

### What was done
- Built **CohesionModal** — brand unity analysis for a collection of palettes
  - Stacked palette strips: every palette in the collection displayed side-by-side so creators can visually scan for outliers at a glance
  - **Cohesion Score (0–100)** with animated score reveal and label: Fragmented / Developing / Cohesive / Unified
  - **Three-axis breakdown** with animated bars:
    - Hue Harmony — uses circular statistics (mean resultant length R) so the hue wraparound at 0°/360° doesn't distort the score; includes dominant hue family name ("Warm-leaning", "Blues family", etc.)
    - Saturation consistency — standard deviation of all palette saturation values, normalized
    - Lightness balance — same approach for lightness
  - **Outlier detection** — per-palette deviation from collection mean; flags the most deviant palette with a warning icon and explanatory callout when it's 2× more distant than average
  - Composite header strip assembled from all palette colors in the collection
- Added BarChart2 icon button to each collection row in sidebar (reveals on hover, separate from the select-collection button to avoid nested-button HTML)
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **Circular statistics for hue** — naïve mean/std of hue degrees fails badly at wraparound (e.g., red at 5° and red at 355° would appear as opposites). Used mean resultant length (R) from circular statistics instead, giving an accurate cohesion signal.
- **Separate cohesion button from collection select** — sidebar row is now a flex group: the main button selects the collection, the BarChart2 button opens cohesion view (both at top level, no nested buttons)
- **Threshold for outlier callout** — requires 3+ palettes, max distance > 2× average AND > 25 units, to avoid false positives on small or uniform collections

### What's next (Session 5)
- "Dark preview" toggle in Harmony View: invert role assignments to simulate dark mode interpretation
- CMYK shift preview: show how screen RGB colors shift when printed (sRGB → CMYK gamut mapping approximation)
- Palette editing from the cohesion view: click a palette strip to jump to its swatch editor

---

## 2026-05-21 — Session 5: CMYK Print Preview

### What was done
- Built **CMYK print simulation** inside Harmony View — the most creator-relevant feature for POD work
- Added full color science pipeline to `utils.ts`:
  - `rgbToCmyk` / `cmykToRgb` — standard conversion
  - `applyInkLimit` — 300% Total Area Coverage cap (industry standard for offset printing)
  - `rgbToLab` — sRGB → linear → XYZ (D65) → CIELAB conversion pipeline
  - `deltaE` — CIE76 color difference (perceptually accurate distance)
  - `simulateCmykPrint` — full round-trip returning print hex, CMYK values, ΔE, and risk level (safe/caution/high)
- Updated `HarmonyModal.tsx`:
  - **Screen / Print toggle** in the header animates the swatch strip and entire mock shop preview through CMYK simulation
  - Print mode: each color role shows CMYK channel bars (C/M/Y/K with color-coded tracks) + ΔE risk badge
  - Screen / print side-by-side swatches in each role card so shift is visually obvious
  - Warning banner appears automatically when high-risk (ΔE > 10) or caution (ΔE 3–10) colors are detected
  - Footer note explains the 300% TAC limit and ICC profile caveat honestly
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **CIE76 over simpler RGB distance** — RGB Euclidean distance doesn't match human perception; LAB space gives meaningful ΔE thresholds (< 3 = safe, 3–10 = review, > 10 = shift)
- **300% TAC as the standard** — industry default for offset/digital; some POD providers go 280% but 300% is the safe common baseline
- **All client-side** — the simulation is just math; zero new dependencies, zero latency, works offline
- **Print mode animates the full mock shop** — you see the entire UI color story shift, not just isolated swatches

### What's next (Session 6)
- Dark mode preview toggle: invert luminance roles to see how the palette reads in a dark UI
- Palette editing from the cohesion view: click a palette strip in CohesionModal to jump to swatch editor
- "Copy as CMYK" export option in the Export modal
