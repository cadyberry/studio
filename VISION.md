# Palette — Color Intelligence for Creators

## One-Line Pitch
The color palette tool built for print-on-demand creators who need beautiful, print-ready color systems — not just swatches.

## The Problem
Tools like Coolors and Adobe Color are generic. They don't understand the POD creator workflow: extracting palettes from AI-generated art, keeping a shop's color story cohesive, checking how colors will look in print vs screen, or organizing dozens of designs into collections that feel unified. Creators end up copying hex codes into spreadsheets and hoping for the best.

## Who It's For
- Print-on-demand shop owners (like Unavoided) using AI art tools
- Independent designers building cohesive product lines
- Visual creators who work across multiple products and need consistent color language

## MVP Feature Set
1. **Palette Extractor** — Upload any image, get a 5–8 color palette extracted from it instantly
2. **Palette Library** — Save, name, and organize extracted palettes
3. **Collection Groups** — Organize palettes into named collections (e.g., "Spring Drop", "Dark Academia")
4. **Export** — Download palettes as PNG swatch strips, copy hex codes, or export as CSS variables
5. **Harmony View** — Preview palette as background, text, and button combinations to see usability at a glance

## V2 Features
- CMYK preview mode (see how colors shift in print)
- AI-powered palette naming and mood detection
- "Cohesion score" — does this set of palettes feel like one brand?
- Printful/Redbubble mockup preview with your palette applied
- Trend library — curated seasonal color palettes for POD drops
- Browser extension to extract palettes from any webpage

## Tech Stack
- **Next.js 14 (App Router)** — modern React with excellent DX, ISR-ready for future features
- **TypeScript** — catch errors early across a multi-session build
- **Tailwind CSS** — rapid, beautiful styling with design-token discipline
- **Framer Motion** — smooth, delightful UI animations worthy of a design tool
- **color-thief-browser** — proven canvas-based color extraction (no server needed)
- **Zustand** — lightweight state management for palette/collection data
- **localStorage** — zero-backend MVP, data lives in browser until we add a backend
- **shadcn/ui** — accessible component primitives, no design debt

**Why no backend for MVP?** Cady's primary use is personal — one browser, one creator. localStorage is instant to ship and zero-cost. Sync/auth can be added when multi-device need is proven.

## Phased Roadmap
### Phase 1 — MVP (Sessions 1–4)
- Project skeleton, design system, layout shell
- Image upload + color extraction + palette display
- Save palettes to library (localStorage)
- Collection grouping
- Export (PNG swatches + hex copy)

### Phase 2 — Polish & Utility (Sessions 5–8)
- Harmony preview (see palette in UI context)
- Palette editing (swap, adjust, lock colors)
- Search and filter library
- CMYK shift preview

### Phase 3 — Intelligence (Sessions 9–12)
- AI palette naming via Claude API
- Cohesion analysis across a collection
- Trend/season palette library
- Shareable palette URLs

### Phase 4 — Integration (Sessions 13+)
- Mockup preview
- Printful color matching
- Browser extension
