# Progress Log

---

## 2026-05-24 — Session 52: Active Tag Filter Indicator on Cards

### What was done
- **Active tag filter indicator on palette card tag pills** — when a tag filter is active, the matching tag pill on every card renders in a visually distinct "selected" state so the user can immediately see which filter is active without looking at the sidebar or filter row
  - Default tag pills (no active filter): same as before — muted background, hover opacity
  - Active-filter tag pill: accent ring + tinted background + semibold text; `trend` pills go rose-200/ring-rose-400; `shared` go sky-200/ring-sky-400; generic tags go `bg-[var(--accent)]/15 ring-[var(--accent)]/60` — all consistent with the filter row's active pill language
  - Tooltip changes to "Clear 'tag' filter" on the active pill to signal that clicking it will deactivate the filter
  - **Toggle-to-clear behavior**: clicking an already-active tag pill now calls `setActiveTag("all")`, clearing the filter — before this session, re-clicking the active tag was a no-op; now it cleanly dismisses the filter from the card itself
  - New `activeTag?: string` prop added to `PaletteCardProps` — optional; defaults to no highlight when absent (SharedPaletteView, etc. unchanged)
  - `page.tsx` passes `activeTag={activeTag !== "all" ? activeTag : undefined}` and uses the toggle: `onFilterByTag={(tag) => setActiveTag(activeTag === tag ? "all" : tag)}`
- Production build: clean TypeScript compile, zero errors

### Key decisions
- **Ring not fill** — an outline ring signals "selected state" without overriding the tag's semantic color (rose for trend, sky for shared); a solid accent fill would lose the tag identity
- **Accent tint for generic tags** — `bg-[var(--accent)]/15` is pale enough to not overpower the card's primary swatch strip, but distinct from the muted default; matches the filter row's active pill vocabulary
- **Toggle-to-clear on re-click** — the natural user expectation when clicking a "pressed" button is that it releases; pre-session the re-click was a dead interaction; now it's a shortcut to "I'm done with this filter"
- **`activeTag !== "all"` guard** — avoids passing the string "all" down into the card as an active tag (no tag is named "all", but the guard is explicit and defensive)

### What's next (Session 53)
- **Palette card harmony mini-preview** — on hover, show 2–3 derived complementary/analogous colors as a tiny swatch strip below the main swatches, giving a quick harmony hint without opening the full modal
- **Collection swatch count** — secondary stat on each collection sidebar row showing total swatch count (not just palette count)
- **Harmony color math in utils** — add `getComplementary`, `getAnalogous` helpers to `utils.ts` so card and modal can share the same derivation logic

---

## 2026-05-24 — Session 51: Tag Filter from Card

### What was done
- **Tag pills on palette cards are now clickable filters** — clicking any tag pill on a palette card immediately filters the library to show only palettes with that tag, with no need to use the sidebar or filter row
  - Tag pills render as `<button>` elements when `onFilterByTag` is provided — `cursor-pointer`, `hover:opacity-75`, and a `title` tooltip ("Filter library by 'tag'") make the affordance clear
  - `e.stopPropagation()` on the click prevents the tag click from triggering card selection or bulk-select
  - When `onFilterByTag` is absent (SharedPaletteView, or any future read-only context), pills fall back to static `<span>` — no behavior change in those contexts
  - Wired in `page.tsx` via `onFilterByTag={(tag) => setActiveTag(tag)}` — uses the exact same state as the sidebar inventory and filter row, so all three filter paths are fully in sync; active tag chip, filter row pill highlight, and library result all update instantly
- Production build: clean TypeScript compile, zero errors

### Key decisions
- **`<button>` not `<span>` when clickable** — semantic HTML; screen readers announce clickable tags correctly; native keyboard (Tab + Enter) support for free
- **`e.stopPropagation()` not `e.preventDefault()`** — we want the click to register (so `onClick` fires), just not bubble to the card wrapper; `preventDefault` would block the button action entirely
- **Falls back to `<span>` when prop absent** — `SharedPaletteView` and similar read-only contexts don't pass `onFilterByTag`, so no accidental interactive elements appear where filtering doesn't make sense
- **No new state** — `setActiveTag` already exists; the card just becomes another entry point into the same state machine

### What's next (Session 52)
- **Palette card harmony mini-preview** — on hover, show 2–3 derived complementary/analogous colors on the card as a tiny swatch strip below the main swatches
- **Collection palette count badge** — show total swatch count (not just palette count) as a secondary stat on each collection sidebar row
- **Tag filter active indicator on card** — when a tag filter is active, highlight the matching tag pill on cards so the user can see which tag is currently filtering

---

## 2026-05-24 — Session 50: Collection Archived State

### What was done
- **Collection archived state** — soft-archive any collection to remove it from the active sidebar without deleting it or its palettes
  - **Archive button** on every active collection row (amber hover to distinguish it from the ZIP export/cohesion buttons) — appears on hover alongside the existing export and cohesion buttons
  - Archiving the currently active collection automatically resets the view to "All palettes" — no orphaned active filter
  - **Collapsible "Archived · N" section** at the bottom of the collections sidebar, collapsed by default; animated expand/collapse via Framer Motion height transition (18ms)
  - Each archived collection row shows its palette count and a **RotateCcw restore button** (emerald hover) — positive semantic, easy one-click restoration
  - Archived collections are excluded from the bulk-select "Move to collection" dropdown — you assign to active collections, not archived ones; but archived collections are still navigable by expanding the section
  - **ZIP export button icon** changed from `Archive` → `Download` to free the `Archive` icon for its new collection-archiving semantic (no confusion between the two)
  - `archived?: boolean` added to `Collection` type — optional, backward-compatible; all existing collections are active by default
- Production build: clean TypeScript compile, zero errors

### Key decisions
- **`archived` flag, not deletion** — archiving is always reversible; palettes in archived collections are never hidden from the "All palettes" view
- **Collapsed by default** — the whole point of archiving is to keep the workspace clean; expanding requires an intentional click, so archived collections stay out of the way
- **Amber hover on archive button** — amber is the universal "caution/warning" color here; it signals "this is a de-emphasize action" without being destructive red; contrasts with the emerald restore button
- **Auto-reset to "all" on archive** — if you're viewing "Spring Drop" and archive it, you shouldn't be left in a filtered state with no palettes showing; dropping to "all" is the safest exit
- **Excluded from bulk assignment dropdown** — the dropdown is a forward-looking action ("move this palette to…"); archived collections are past work, not active destinations

### What's next (Session 51)
- **Palette card harmony mini-preview** — on hover, show 2–3 derived complementary/analogous colors on the card as a tiny swatch strip below the main swatches
- **Tag filter from card** — clicking a tag pill on a palette card filters the library to that tag (currently tag pills on cards are display-only; making them clickable routes to `setActiveTag`)
- **Collection palette count badge** — show total swatch count (not just palette count) as a secondary stat on each collection sidebar row

---

## 2026-05-24 — Session 49: Tag Autocomplete

### What was done
- **Tag autocomplete** in the tag editor overlay — typing in the tag input now surfaces matching tags from across the entire library as a keyboard-navigable suggestion list
  - Suggestions appear immediately as the user types (min 1 character), filtered to tags that contain the input substring and aren't already on the current palette
  - Match text is **bolded** within each suggestion so the matching portion is visually obvious
  - Full keyboard support: ↑↓ arrows move through the list (highlighted in accent color), Enter selects the highlighted suggestion, Escape dismisses the list without closing the editor
  - Click support: `onMouseDown` + `e.preventDefault()` prevents the input from blurring before the click fires — the input stays focused after selecting a suggestion so the user can immediately add another tag
  - After any selection (keyboard or click), `tagInput` clears and `suggestionIdx` resets to -1 so the next character starts fresh
  - Hint text at the bottom of the tag editor updates to include "↑↓ to select ·" when suggestions are visible
  - `allLibraryTags` computed via a separate `usePaletteStore` selector — iterates all palettes, collects unique tags, sorts alphabetically; cheap operation with no extra dependencies
  - Max 6 suggestions shown — enough to scan quickly, not overwhelming
- Production build: clean TypeScript compile, zero errors

### Key decisions
- **Substring match, not prefix** — "forest" matches "rainforest", "deep-forest", "forest-green"; prefix-only would miss common partial-word entries
- **Library-wide tags** — autocomplete is most useful when it prevents near-duplicates across palettes; pulling from all palettes (not just the current one) is the right scope
- **`onMouseDown` not `onClick`** — click fires after blur; `onMouseDown` + `e.preventDefault()` fires before blur so the input never loses focus during suggestion selection
- **Max 6 suggestions** — enough to be useful without overflowing the overlay and obscuring the card's swatch strip

### What's next (Session 50)
- **Collection archived state** — soft-archive a collection so it moves to a collapsed "Archived" section at the bottom of the sidebar, keeping active workspace clean while preserving palettes
- **Palette card harmony mini-preview** — on hover, show 2–3 derived complementary/analogous colors on the card as a tiny swatch strip
- **Tag filter in library** — click any tag pill to filter the library to only palettes with that tag

---

## 2026-05-24 — Session 48: Palette Freshness Badge

### What was done
- **Palette freshness badge** — a color-coded age pill appears in each palette card's info row for palettes created within the last 21 days
  - Badge fades in both color and opacity as the palette ages: emerald `"new"` for <1 day, emerald `"1d"` for 1–2 days, green `"Nd"` for 2–7 days (opacity decreasing from 0.85→0.65), lime `"1w"` at one week (0.55), amber `"2w"` at two weeks (0.40), invisible at 21+ days
  - Module-level `getFreshness(createdAt)` pure function — returns `{ label, bgClass, textClass, opacity }` or `null`; zero React dependencies, easy to test
  - Placed in the info row after the mood pill — consistent position, never hover-gated so freshness is scannable at a glance across the grid
  - `title` attribute on the badge shows full relative age ("Created 3 days ago") on hover, complementing the existing age text in the card footer
  - Uses `createdAt` (not `updatedAt`) — freshness means when the palette was *born*, not when it was last touched
- Production build: clean TypeScript compile, zero errors

### Key decisions
- **`createdAt` not `updatedAt`** — freshness is about when a palette entered the library; editing a 3-month-old palette should not resurrect its freshness badge
- **Opacity fade on top of color fade** — two independent axes of visual aging; color alone (emerald → amber) could read as a semantic shift rather than a fade; combining color + opacity makes the fading effect unmistakeable
- **21-day cutoff, not 14 or 30** — 14 days is slightly short for Cady's drop/collection workflow (a "Spring Drop" might be assembled over 2–3 weeks); 30 days would show stale badges too long; 21 days (3 weeks) is a natural post-drop horizon
- **Module-level pure function** — no hooks or closures; stable, testable, no component coupling

### What's next (Session 49)
- **Palette card color harmony mini-preview** — on hover, show a tiny complementary/analogous swatch strip directly on the card (2–3 derived colors from the existing palette) to quickly signal harmonic potential without opening the Harmony modal
- **Collection archived state** — ability to soft-archive a collection so it moves to a collapsed "Archived" section at the bottom of the sidebar, keeping it out of the active workspace while preserving the palettes
- **Tag autocomplete** — when typing in the tag editor, suggest existing tags from the library to prevent near-duplicate tags ("forest", "forests", "foresty")

---

## 2026-05-24 — Session 47: Sidebar Flash on Jump-to-Collection

### What was done
- **Sidebar collection flash** — when the user clicks the in-collection chip on any palette card, the matching sidebar collection row briefly flashes violet to orient their eye
  - `jumpToCollection(id)` handler wraps `setActiveCollection` with a `flashedCollectionId` state, auto-cleared after 820ms
  - An absolutely-positioned overlay `<div>` renders inside the `div.group/col.relative` container only while `flashedCollectionId === c.id`; a `@keyframes col-flash` CSS animation runs opacity 0.6→0 over 750ms with `ease-out forwards` — fully settled before the state clears at 820ms
  - `pointer-events: none` on the overlay ensures hover and click targets underneath are never blocked
  - Violet (`rgba(139,92,246,1)`) was chosen to match Palette's accent palette and contrast clearly against both active (dark) and inactive (light) row backgrounds
- Production build: clean TypeScript compile, zero errors

### Key decisions
- **CSS keyframe over Framer Motion** — the flash is a one-shot "fire and forget" animation; a CSS `forwards` fill is simpler than an exit animation and doesn't need `AnimatePresence`
- **820ms clear / 750ms animation** — the 70ms gap guarantees the animation has visually settled to opacity 0 before React unmounts the overlay div, preventing a flicker
- **Overlay inside `div.group/col.relative`** — the containing div already has `position: relative`, so no wrapper needed; `absolute inset-0` + `rounded-[var(--radius-sm)]` follows the row's border radius naturally

### What's next (Session 48)
- **Palette age badge / "freshness" indicator** — a subtle label on palette cards showing relative age (e.g. "3 days ago", "2 weeks ago") that fades gracefully as palettes age, giving the library a sense of time and recency

---

## 2026-05-24 — Session 46: Swatch Count Sparkline

### What was done
- **Swatch count sparkline** — a tiny bar chart appended as a third row in the sidebar stats panel, showing the distribution of palette sizes across three buckets: 1–4 colors (small), 5–6 colors (medium), 7+ colors (large)
  - Three side-by-side vertical bars grow from a 24px-tall container using `flex-col justify-end`, so bars naturally align to a common baseline
  - Bar heights are proportional to the tallest bucket (`bucketMax`); a floor of 3px prevents zero-height bars from disappearing entirely; zero-count buckets render at 2px with `var(--border)` color to show the slot exists
  - Violet → indigo → blue gradient across the three bars mirrors Palette's brand palette
  - Each bar has a `title` attribute showing the exact count on hover
  - Bucket labels (1–4, 5–6, 7+) sit below each bar at 8px text
  - Three new computed values added to the stats block: `bucketSmall`, `bucketMed`, `bucketLarge`, `bucketMax`
- Production build: clean TypeScript compile, zero errors

### Key decisions
- **CSS height + `flex-col justify-end` over SVG** — the chart is three bars; pure-CSS approach is simpler, avoids a viewBox coordinate system, and the bars already animate with `transition-all duration-500` when palette data changes
- **3-bucket grouping (≤4, 5–6, ≥7)** — color-thief typically returns 5 or 6 colors; showing those as the middle bucket makes the common case the "center" visually; <5 are edits/manual entries, 7+ are expanded palettes
- **Bar minimum 3px, not 0px** — a zero-height bar would make the label appear to float; 3px gives a visible stub that confirms the bucket exists

### What's next (Session 47)
- **Sidebar flash on jump-to-collection** — when clicking the in-collection chip on a palette card, briefly highlight the matching collection row in the sidebar to orient the user
- **Palette card archived badge** — if a palette belongs to an archived collection, show a subtle "archived" pill on the card
- **Keyword search in notes** — extend the main search box to also match against `palette.notes` content, so annotated palettes surface via their description

---

## 2026-05-24 — Session 45: Stats Panel Count-Up Animation

### What was done
- **Stats panel count-up animation** — the four numeric stats (palettes, swatches, collections, annotated %) now count up from 0 to their actual values on first mount with a 600ms ease-out cubic animation
  - Implemented as a reusable `AnimatedStat` component above `Home` — takes `value: number` and optional `suffix?: string`
  - Uses `useEffect` + `requestAnimationFrame` with an ease-out cubic curve (`1 - (1 - t)³`) for a natural deceleration feel
  - A `done` ref prevents re-triggering on subsequent renders; once animation completes, `value` prop is rendered directly so any palette additions update the count without re-animating
  - Applied to: palettes count, total swatches, collections count, annotated percentage (with `%` suffix)
  - Non-numeric stats (top mood, oldest date) are unaffected — they appear instantly as before
- Production build: clean TypeScript compile, zero errors

### Key decisions
- **`requestAnimationFrame` over Framer Motion `animate()`** — both would work; `rAF` avoids importing the `animate` function (which has a different signature in Framer Motion 12) and keeps the component dependency-free, explicit, and debuggable
- **`done` ref, not `done` state** — marking animation complete doesn't need to trigger a re-render; only `setDisplay` (inside the loop) triggers renders; switching to `value` prop at the end happens on the next parent-driven re-render
- **Empty deps array for `useEffect`** — we want mount-only behavior; ESLint would warn but the eslint-disable comment documents the intentional choice
- **`suffix` prop instead of wrapping `<AnimatedStat />%`** — cleaner call site; the animated number and its unit are always rendered together with no DOM gap for screen readers

### What's next (Session 46)
- **Sidebar flash on jump-to-collection** — when clicking the in-collection chip on a palette card, briefly highlight the matching collection row in the sidebar to orient the user
- **Palette card archived badge** — if a palette belongs to an archived collection, show a subtle "archived" pill on the card
- **Swatch count sparkline** — tiny bar chart in the stats panel showing palette size distribution (1–4, 5–6, 7–8 color buckets)

---

## 2026-05-24 — Session 44: Empty Collection Indicator

### What was done
- **Empty collection indicator** — when a named collection has zero palettes, the library grid now shows a dedicated placeholder state instead of the generic "No matching palettes" UI
  - Detected via `activeCollection !== "all" && activeCollectionCount === 0`; this branch sits between the "library empty" and "no filters match" cases so each state is mutually exclusive and clear
  - Visual treatment: soft violet→sky gradient folder icon in a rounded square, collection name in quotes, a two-sentence hint that explains exactly how to add palettes (folder icon on card, or bulk bar)
  - Inline `<FolderOpen>` icon in the hint text reinforces the affordance without requiring the user to hunt for it
  - "Browse all palettes" button sets `activeCollection` to `"all"` so the user can immediately start selecting palettes to add
  - Framer Motion fade+slide-up entrance (same as the filter-empty state) for visual consistency
- Production build: clean TypeScript compile, zero errors

### Key decisions
- **Separate branch, not a flag on the existing empty state** — the filter-mismatch state shows dismissible filter chips and a "Clear all filters" CTA; an empty collection has none of those, so conflating them would add dead UI elements and confuse the user
- **Inline icon in hint text** — small affordance to connect the word "icon" directly to the visual glyph; cheaper than a tooltip and immediately scannable
- **No delete-collection button here** — the collection sidebar already has the cohesion view and export actions; adding collection management to the grid empty state would duplicate controls; keeping this state purely informational and navigational

### What's next (Session 45)
- **Stats panel count-up animation** — animate the six stats numbers on first mount using Framer Motion (count from 0 to N over 600ms)
- **Sidebar flash on jump-to-collection** — when clicking the in-collection chip on a palette card, briefly highlight the matching collection row in the sidebar to orient the user
- **Palette card archived badge** — if a palette belongs to an archived collection, show a subtle "archived" pill on the card

---

## 2026-05-24 — Session 43: Clear-Collection Badge × + Collection Description Tooltip

### What was done
- **"Clear collection" × on badge** — the "in collection" chip on each palette card now shows a small `×` button on hover that removes the palette from its collection in one click, no modal required
  - Badge refactored from a single button/span into a `group/col-badge` wrapper containing the collection-name button plus the × button
  - The × fades in on `group-hover/col-badge` (opacity-0 → opacity-100) so it's not cluttering the card at rest
  - On hover the × turns red (`hover:bg-red-100 hover:text-red-500`) to signal a destructive action
  - Calls `updatePalette(id, { collectionId: undefined })` — reuses the existing store action, no new logic needed
  - `onClearCollection?: () => void` prop added to PaletteCard; wired in page.tsx per-card via an inline callback
  - `updatePalette` added to the store destructure in page.tsx (was missing; previously only used inside PaletteCard itself)
  - Collection name button shrinks from max-w-[120px] → max-w-[100px] to give the × a comfortable slot without layout shift
- **Collection description tooltip** — hovering a collection name in the sidebar now shows the collection's description in the native browser tooltip
  - Extends the existing `title="Double-click to rename"` on the collection name `<span>` to `title={c.description ? \`${c.description}\n\nDouble-click to rename\` : "Double-click to rename"}`
  - Zero new code or components — native title attribute, consistent with age-badge and other tooltip patterns in the app
  - Visible when the CollectionModal has been used to add a description; silently absent otherwise
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **Fade-in × not always-visible** — the badge is used for display and navigation; the × would be visual noise on every card in the library; group-hover reveal follows the same pattern as action buttons in the card row
- **Red on hover, not always red** — the × is only destructive when clicked; visual red confirmation on hover (not at rest) keeps the badge calm in the normal non-hover state
- **Native title for description tooltip** — consistent with how the app already surfaces secondary text (age badge full-date, cohesion score, etc.); the `\n\n` separator between description and the rename hint is legible in all browsers

### What's next (Session 44)
- **Stats panel count-up animation** — animate the six stats numbers on first mount using Framer Motion (count from 0 to N over 600ms), adding polish to the library sidebar
- **Collection palette count badge on jump-to-collection button** — when clicking the in-collection chip navigates to a collection, briefly flash a highlight on the collection sidebar row to orient the user
- **"Empty collection" indicator** — when a named collection has 0 palettes, show a soft placeholder state in the library grid ("This collection is empty — add palettes via the folder icon on any card")

---

## 2026-05-23 — Session 42: Palette Stats Panel

### What was done
- **Library stats panel** — compact 2×3 grid widget added to the left sidebar (between Extractor and Discover), visible whenever the library has at least one palette
  - Row 1: **palettes** count · **swatches** count (total across all palettes) · **collections** count
  - Row 2: **annotated %** (palettes with notes / total) · **top mood** (mode of all palette moods, with coloured dot from the existing MOOD_PILL_STYLES palette) · **oldest** (month+year of the earliest palette, tooltip shows full date)
  - Grid styled with `divide-x` / `border-t` on the inner cells so it feels like a single cohesive tile rather than separate cards
  - `topMood` computed via `moodTally` map + `reduce` — same `getPaletteMood` function used everywhere else
  - `oldestSince` formatted with `Intl.DateTimeFormat` (short month + year) so it fits the narrow column without truncation
  - `formatDate` added to the `@/lib/utils` import in `page.tsx` for the full-date tooltip on the "oldest" cell
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **2×3 grid, not a list** — six stats in a horizontal grid reads faster than a stacked list; each cell is self-contained with its value and label
- **Stats live in page.tsx derivations, not a separate component** — all inputs are already in scope (palettes, collections, getPaletteMood); a new component would add indirection with no benefit
- **Top mood shows coloured dot, not a badge** — the mood dot from MOOD_PILL_STYLES gives instant visual identification without importing the full pill component; the small "top mood" label provides context

### What's next (Session 43)
- **"Clear collection" quick action on badge** — an × on the collection badge in PaletteCard to remove the palette from its collection without opening the CollectionModal
- **Collection description tooltip** — hover the collection name in the sidebar to see its description in a small tooltip (if set)
- **Stats panel sparkle** — animate the numbers on first mount with a count-up effect using Framer Motion

---

## 2026-05-23 — Session 41: Inline Collection Rename + Jump-to-Collection Badge

### What was done
- **Inline collection rename** — double-click any collection name in the sidebar to rename it in-place, no modal needed
  - Button swaps for an edit-mode `<div>` (avoids the invalid input-inside-button DOM nesting)
  - Input auto-focuses, prefilled with current name and ready to overtype
  - **Enter or blur commits**; **Escape cancels** — same conventions as palette inline rename
  - Archive and cohesion hover buttons hide during rename to reduce visual noise
  - Hover tooltip (`title="Double-click to rename"`) provides discoverability
  - `commitCollectionRename` and `cancelCollectionRename` helpers manage state cleanly
- **Jump-to-collection from palette card badge** — the "in collection" chip on each palette card is now interactive
  - Shows the **actual collection name** instead of the generic "in collection" text (falls back gracefully if the collection isn't found)
  - Clicking it sets `activeCollection` to that collection's ID, navigating the sidebar and filtering the library instantly
  - Uses `e.stopPropagation()` so it doesn't accidentally trigger other card click handlers
  - Hover accent treatment (`bg-[var(--accent)] text-[var(--accent-fg)]`) signals clickability
  - `collectionName` and `onJumpToCollection` props added to PaletteCard; page.tsx resolves the name with a `collections.find()` lookup per card
- **Keyboard help modal updated** — "DblClick — Start rename (palette name or collection)" added to the Inline Rename group
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **Edit-mode div, not input-inside-button** — browsers disallow interactive elements nested inside buttons; swapping the entire row to a `<div>` when editing is the correct structural solution and avoids focus/click event ambiguity
- **`commitCollectionRename` with `useCallback`** — stable reference needed because it's used as an `onBlur` handler on the input; without `useCallback`, a closure update mid-edit could fire with stale state
- **Badge shows collection name, not generic text** — "Spring Drop" is more useful than "in collection" at a glance; having the name on the badge is also a navigational affordance, reinforcing what clicking does
- **`collections.find()` in display loop, not in store** — PaletteCard doesn't need to know the full collections list; passing just the resolved name keeps component coupling minimal

### What's next (Session 42)
- **Palette stats panel** — a compact stats widget in the left sidebar: total swatches, most-used mood, collection count, annotation coverage %, oldest/newest palette dates
- **"Clear collection" quick action on badge** — an × on the collection badge to remove the palette from its collection without opening the CollectionModal
- **Collection description tooltip** — hover the collection name to see its description (if set) in a small tooltip

---

## 2026-05-23 — Session 40: Sort by Most Annotated, Interactive Collection Tooltip, Age Badge Tooltip

### What was done
- **Sort by most-annotated** — added "Most annotated" option to the sort dropdown; palettes with longer notes bubble to the top, surfacing well-described palettes instantly
- **Interactive collection hover panel** — converted the collection sidebar tooltip from CSS-only group-hover (pointer-events-none) to state-driven (onMouseEnter/Leave on both row and tooltip), so the user can hover over the tooltip without it disappearing; each palette row in the panel now shows a **quick Duplicate button** (CopyPlus icon) that appears on row hover and immediately duplicates that palette
- **Age badge full-date tooltip** — hovering the relative-age text in the palette card footer ("Edited 3 days ago") now reveals the precise date via native `title` attribute: "Edited May 20, 2026 · Created May 15, 2026"
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **State over CSS for interactive tooltip** — CSS `group-hover` works fine for read-only overlays, but once the tooltip needs interactive children (buttons), React state is the right mechanism; the mouseleave/enter bridge keeps the tooltip stable as the cursor moves from row to panel
- **Native `title` for age tooltip** — a native tooltip is zero-code overhead and accessible; no custom Tooltip component needed for this use case

### What's next (Session 41)
- **Palette stats panel** — a slide-out or expandable section showing overall library stats: total swatches, most-used mood, collection count, oldest/newest palette, annotation coverage %
- **Collection rename inline** — double-click a collection name in the sidebar to rename it in-place (currently requires a separate modal)
- **"Jump to collection" from palette card** — clicking "in collection" badge on a palette card navigates to that collection in the sidebar

---

## 2026-05-23 — Session 39: Keyboard Help Overlay

### What was done
- Built **KeyboardHelpModal** — press `?` anywhere to open a full shortcut reference sheet
  - 5 groups: Global, Palette Card, Swatch Editor, Inline Rename, Tags
  - Each row: label on left, styled `<kbd>` chips on right with `+` for chords and `/` for alternatives
  - `sep` prop on `ShortcutRow` cleanly distinguishes chord (`+`) vs alternative (`/`) key separators
  - Clicking the backdrop or pressing `?` / `Esc` closes the modal
  - Spring-animated modal enter/exit (scale + fade, 500ms stiffness)
  - Scrollable body for future shortcut additions
- **`?` key handler** wired into the global keydown listener in `page.tsx` — toggles help overlay, suppressed when any input/textarea/select is focused; modifier-key-safe
- **`?` button in the header** — small monospaced kbd-style button next to the palette count; provides discoverability for non-keyboard users; `title="Keyboard shortcuts (?)"` tooltip
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **Toggle on `?`** — pressing `?` again closes it (same key opens and closes), matching the convention in Figma, Linear, GitHub
- **`sep` prop not a separate `combo/alternatives` boolean** — a string separator is more flexible and keeps the data model minimal
- **`KeyboardHelpModal` as standalone component** — not inlined in `page.tsx`; keeps modal self-contained with its own Escape handler so it doesn't interfere with the global `?` handler

### What's next (Session 40)
- **Sort by most-notes** — add "Most annotated" as a sort option to surface well-described palettes
- **Quick duplicate from collection hover panel** — Duplicate button in the palette preview tooltip on collection sidebar rows
- **Palette age badge** — show "Created X days ago" as a tooltip on the palette card creation timestamp

---

## 2026-05-23 — Session 38: Search Shortcut

### What was done
- **`/` key focuses the search bar** — press `/` from anywhere in the app (when not in an input/textarea/select) to jump directly to the search field
  - `requestAnimationFrame` defers focus so if color-search mode is active it deactivates first before the text input renders
  - Modifier-key guard: `Cmd/Ctrl/Alt + /` passes through untouched (browser dev tools, etc.)
  - Input-field guard: suppressed when the focused element is already an `INPUT`, `TEXTAREA`, or `SELECT`
  - If color search mode is active when `/` is pressed, it deactivates color search and activates text search seamlessly
- **`Escape` clears and blurs search** — pressing Escape while the search input is focused clears the query and blurs; consistent with standard UX conventions (Figma, Linear, GitHub)
- **`/` kbd hint in the search box** — a monospace `/ ` key badge sits in the right side of the search input when no query is active; standard convention (GitHub, Figma); pointer-events-none so it never interferes with clicks
- **Inline clear button** — when a query is active, an `×` button replaces the `/` hint in the right slot of the input; clicking it clears and refocuses; avoids requiring keyboard-only clear
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **`requestAnimationFrame` not `setTimeout(0)`** — RAF is semantically "before the next paint," which is exactly when we need the text input to be in the DOM after color-search deactivation; more precise than a 0ms timer
- **Inline clear button replaces kbd hint** — dual-use of the right slot keeps the input width consistent; no layout shift between empty and filled states
- **`Escape` clears (not just blurs)** — search is a transient filter; clearing on Escape matches the mental model of "dismiss"; the no-results chips still dismiss individual query tokens for fine-grained control
- **`ref` on the search input directly** — no additional state; `searchInputRef.current?.focus()` is the simplest path from the global handler to the DOM node

### What's next (Session 39)
- **Sort by most-notes** — add "Most annotated" as a sort option to surface well-described palettes
- **Quick duplicate from collection hover panel** — add a Duplicate button inside the palette preview tooltip on collection sidebar rows
- **`?` help overlay** — press `?` to open a keyboard shortcut reference sheet covering all card and global shortcuts

---

## 2026-05-23 — Session 37: Keyboard Shortcuts

### What was done
- **Keyboard shortcuts for hovered palette cards** — hover any card and fire actions without clicking into the action row
  - `D` — duplicate the palette (with the same 1.5s "✓" flash feedback as the click action)
  - `F2` — start inline rename (focuses and selects the name input, same as double-clicking the name)
  - `H` — open Harmony View for the palette
  - `E` — open Export modal
  - `L` — toggle lock (freeze/unfreeze); when frozen, `L` unlocks
  - `Delete` — delete with the existing two-press confirm flow (press once for warning, press again within 2s to confirm)
  - Modifier-key guard: shortcuts are suppressed when Cmd/Ctrl/Alt is held, so browser shortcuts (⌘D bookmark, etc.) pass through unaffected
  - Input-field guard: shortcuts are suppressed when any `INPUT`, `TEXTAREA`, or `SELECT` is focused — inline rename, tags, and notes overlays all disable shortcuts naturally
- **Shortcut hint strip in card footer** — the age indicator row now shows keyboard hints on hover
  - Right side of the footer shows `D dup · F2 name · H view · L lock · Del` in mono font
  - When the palette is frozen, shows `L unlock` instead (all others are disabled for frozen palettes)
  - Left side shows "Edited X ago" when edited, otherwise "Created X ago" (condensed from the previous two-element layout)
- Implementation: one `useEffect` mounted once per card, using refs for all mutable values (palette, callbacks, store actions); `isHoveredRef` toggled by `onMouseEnter`/`onMouseLeave` on the card wrapper — zero re-registrations, zero stale closures
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **Ref-based handler, mounted once** — a re-registering effect (many deps) would add/remove the document listener on every palette state change; with refs, the listener is stable for the card's lifetime
- **`isHoveredRef` on `motion.div` wrapper** — Framer Motion's `onMouseEnter`/`onMouseLeave` work correctly with animated cards; no z-index edge cases from nested listeners
- **Footer hints change state on freeze** — `L unlock` on frozen cards makes the shortcut map honest; other shortcuts are silently suppressed for frozen palettes (same as their click counterparts)
- **`Delete` only, not `Backspace`** — `Backspace` can trigger browser back-navigation; `Delete` is unambiguous in this context

### What's next (Session 38)
- **Sort by most-notes** — add "Most annotated" as a sort option to surface well-described palettes
- **Quick duplicate from collection hover panel** — add a Duplicate button inside the palette preview tooltip on collection sidebar rows
- **Palette search by shortcut** — `/` key focuses the search bar from anywhere in the app (standard convention)

---

## 2026-05-23 — Session 36: Notes Search Integration

### What was done
- **Notes search integration** — the search bar now matches against palette notes text in addition to palette names
  - `matchesSearch` in `page.tsx` extended: checks both `p.name` and `p.notes` against the search query — palettes surface when their creative annotations contain the search term
  - **Search placeholder updated** to "Search palettes & notes…" to signal the extended capability without documentation
  - **Inline highlight** — matched search terms are highlighted in both the palette name and the note preview with a yellow `<mark>` tag (dark-mode aware: `bg-yellow-200 dark:bg-yellow-800/60`)
  - `searchQuery?: string` prop added to `PaletteCard`; `highlightMatch()` pure helper handles substring wrapping in a single-pass split, correctly handles non-matches (returns plain string)
  - Passing `searchQuery={search || undefined}` (falsy guard avoids highlight noise when search is empty)
  - No-results "forest" flow: if Cady types "autumn forest" she surfaces all palettes with that phrase in either name or note, and sees the match highlighted in yellow in the note preview beneath each card
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **First-occurrence highlight only** — notes are max 280 chars, single match is sufficient; a multi-occurrence highlighter would add complexity with no meaningful UX gain at this scale
- **`|| undefined` guard on searchQuery** — prevents PaletteCard from running highlight logic on every keystroke when search is empty; mark elements only render when there's an active query
- **Plain `text` shortcircuit in `highlightMatch`** — when idx === -1 (no match), returns raw string (not a fragment) so React never renders an empty mark element

### What's next (Session 37)
- **Keyboard shortcut hints in card footer** — on hover, surface micro-hints ("⌘D duplicate · F2 rename · L lock") in the age/created footer strip to improve discoverability
- **Quick duplicate from collection hover** — add a Duplicate button inside the sidebar collection palette-preview panel
- **Sort by most-notes** — surface well-annotated palettes at the top as a sort option for annotation-heavy workflows

---

## 2026-05-23 — Session 35: Palette Notes

### What was done
- **Palette notes/caption field** — each palette card can now hold a short freeform note for creative context
  - **StickyNote button** in the action row (after Tag, before Download); uses outline style + yellow fill when a note exists, ghost style when empty — immediately communicates whether a note is present without requiring hover
  - **Notes overlay** — clicking opens a bottom-anchored overlay (same design pattern as tag editor): 3-row textarea, 280-char limit, live character counter
  - **Auto-save on blur** — leaving the textarea (blur) commits the note; Escape cancels and reverts to the previous value; matches the mental model of inline rename
  - **Note preview** — when a note exists, it appears as a small italic muted line below the tags/mood row (2-line clamp); full text on `title` tooltip on hover; a lightweight always-visible signal without cluttering the card
  - **Duplicate carries notes** — `duplicatePalette` now copies the `notes` field so copied palettes inherit their creative context
  - **Mutually exclusive overlays** — opening notes closes any open tag or AI-naming panel; opening tags or AI naming closes notes; prevents stacked overlays
  - `notes?: string` added to `Palette` type — optional, backward compatible; existing palettes have no note by default
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **Auto-save on blur, not explicit Save button** — lower friction for annotations; consistent with inline rename (blur commits, Esc cancels); notes are low-stakes creative context, not structured data requiring confirmation
- **280-char limit** — long enough for a meaningful annotation ("autumn forest walk, possible for Spring Drop collection, warm earthy variant"); short enough that notes stay as context clues rather than documentation essays
- **Italic preview, not a labeled field** — "Note:" label adds visual noise when the italic style already signals "this is an annotation"; keeps the card compact
- **Yellow fill on StickyNote icon when note exists** — immediately scannable at a glance across the library grid without needing to hover each card; uses yellow for "sticky note" semantics rather than adopting any existing color (amber=cover crown, indigo=frozen)
- **Notes editable when frozen** — notes are annotations, not structural palette data; blocking notes on frozen palettes would be confusing (you can't add "approved for Spring Drop" after finalizing without unlocking)

### What's next (Session 36)
- **Keyboard shortcut hints in card footer** — on hover, show micro-hints ("⌘D duplicate · F2 rename · L lock") in the age/created footer strip to surface discoverability
- **Quick duplicate from collection hover tooltip** — add a Duplicate button inside the palette preview panel that appears when hovering a collection in the sidebar
- **Notes search integration** — extend the existing search bar to also match palette notes text, so Cady can type "forest" and surface all palettes annotated with forest-related context

---

## 2026-05-23 — Session 34: Freeze Filter Pill

### What was done
- **Locked filter pill** — added an indigo "Locked N" pill to the mood filter row so Cady can instantly see and filter to all finalized palettes
  - **Pill appears** in the mood row whenever any palette in the library is frozen; positioned after mood pills with a `·` separator, or alone if there are fewer than 2 moods
  - **Toggle behavior** — clicking "Locked N" filters the grid to only show frozen palettes; clicking again shows all; indigo active state matches the existing frozen visual language (indigo border, ring, badge on cards)
  - **Count is context-aware** — the N shown in the pill reflects how many palettes matching the current search + tag + collection + mood filters are frozen, so it updates dynamically as other filters change
  - **Row condition expanded** — mood filter row now appears whenever `moodCounts.size >= 2 || anyFrozen` (was `>= 2` only), so the Locked pill is accessible even if there's only one mood in the library
  - **"No results" chip** — if the Locked filter + other filters produce no results, a dismissible "Locked only ×" chip appears in the no-match state with individual-dismiss support
  - **"Clear all filters"** now also resets `activeFreezeFilter` to `"all"`
  - **Pipeline refactor**: `moodFiltered` extracted as an intermediate variable so the freeze filter applies cleanly on top of mood filter (search → tag → collection → mood → freeze)
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **Toggle (on/off) not tri-state (all/locked/unlocked)** — "show only locked" covers 95% of Cady's use case (reviewing what's finalized); adding "unlocked" would clutter the pill row without commensurate value
- **Indigo for locked pill** — consistent with the frozen visual system (indigo border on card, indigo lock badge, indigo icon in name row); makes the filter feel like a native extension of that feature
- **Pill in mood row, not a new row** — avoids vertical clutter; the mood row already carries "property of a palette" semantics (mood is intrinsic, not user-assigned); frozen is similarly intrinsic
- **`·` separator** — lightweight but clear visual break between "mood" and "status" filters in the same row; avoids needing a second label

### What's next (Session 35)
- **Keyboard shortcut hints in card footer** — on hover, show micro-hints ("⌘D duplicate · F2 rename · L lock") in the age/created footer strip to surface discoverability
- **Quick duplicate from collection hover tooltip** — add a Duplicate button inside the palette preview panel that appears when hovering a collection in the sidebar
- **Palette notes / caption field** — a short freeform text field on each palette card for creative context ("autumn forest walk", "brand refresh option 2")

---

## 2026-05-23 — Session 33: Palette Freeze

### What was done
- **Palette Freeze** — mark any palette as "finalized/locked" to protect it from accidental edits and deletion
  - **Lock/Unlock toggle** in the card action row (LockOpen → Lock icon, indigo outline style when active)
  - **Frozen visual treatment** — card gets an indigo border + subtle ring so frozen palettes are instantly recognizable in the grid
  - **Lock badge on swatch strip** — a small "locked" pill with lock icon in the bottom-left corner of the swatch area, always visible when frozen
  - **Lock icon in name row** — tiny indigo lock prefix next to the palette name when frozen, provides a second at-a-glance signal
  - **Swatch editing disabled** — when frozen, the swatch strip renders as a plain static div (no Reorder.Group), so drag-to-reorder and the per-swatch pencil edit button are both blocked at the render level, not just disabled
  - **Inline rename disabled** — double-click on name does nothing when frozen; tooltip reads "Unlock to rename"
  - **Delete blocked** — delete button is `disabled` with `opacity-30 cursor-not-allowed` style and tooltip "Unlock to delete"
  - **Bulk delete respects freeze** — in the bulk action bar, frozen palettes are filtered from the deletion set; if all selected are frozen, the delete button is disabled; confirmation label reads "Delete N (M locked)" when mixed
  - `frozen?: boolean` added to `Palette` type in `types/index.ts` — optional, so all existing palettes are unfrozen by default (backward compatible)
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **Static div not disabled Reorder.Group** — conditionally switching to a plain flex div when frozen avoids Framer Motion's drag detection entirely; disabling inside Reorder.Item would still show cursor-grab on hover, which would be confusing
- **Inline rename blocked (not just warned)** — for finalized palettes, the name is part of the record; blocking it with a tooltip nudges the user to explicitly unlock, reducing accidental overwrites
- **`frozen` is optional in the type** — backward compatible; existing localStorage entries without the field are treated as unfrozen (`undefined` is falsy)
- **Indigo not amber** — amber is taken by the cover/crown palette badge; indigo clearly differentiates "protective lock" from "featured cover"

### What's next (Session 34)
- **Keyboard shortcut hints in card footer** — on hover, show micro-hints ("⌘D duplicate · F2 rename · L lock") in the age/created footer strip
- **Quick duplicate from collection tooltip** — add a Duplicate button inside the collection hover preview panel
- **Freeze filter pill** — add a "Locked" filter pill to the tag/mood filter row so Cady can view all finalized palettes at once

---

## 2026-05-23 — Session 32: Post-Export Toast

### What was done
- **Post-export toast with palette count and source name** — a spring-animated success notification appears in the bottom-right corner after any ZIP export completes
  - **Collection ZIP export**: toast reads "N palettes exported" + subtitle "Collection Name · ZIP downloaded" — so the user knows exactly what was packaged
  - **Bulk-select ZIP export**: toast reads "N palettes exported" + subtitle "ZIP downloaded" — works for arbitrary selections with no collection context
  - **3.5-second auto-dismiss** via `useEffect` + `clearTimeout` — the timer resets if a second export fires before the first toast clears (each `setExportToast` call restarts the effect)
  - **Manual dismiss** via an X button — for users who want to clear the confirmation immediately
  - **Emerald success icon** — `CheckCircle2` in a rounded emerald-tinted circle clearly signals success without being garish
  - **Bottom-right positioning** — distinct from the center-positioned fork-from-share toast; both can exist simultaneously without visual collision (the fork toast is reserved for an interactive decision, the export toast is a passive confirmation)
  - `CheckCircle2` added to the lucide-react import; no new dependencies
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **3.5s not 3s** — 3 seconds tests feel slightly rushed when the user is reading "5 palettes exported · Spring Drop · ZIP downloaded"; 3.5s gives comfortable reading time without lingering
- **`clearTimeout` in useEffect cleanup** — prevents stale dismissal if the component unmounts between export and timer fire (rare but correct)
- **Bottom-right, not bottom-center** — the fork-from-share toast occupies bottom-center because it requires a user decision (Fork / dismiss); the export toast is passive confirmation and belongs to the corner, the conventional position for non-blocking notifications
- **No sound or vibration** — this is a desktop design tool; passive visual confirmation is sufficient and less disruptive

### What's next (Session 33)
- **Keyboard shortcut hints in the card footer** — on palette card hover, show micro-hints ("⌘D duplicate · F2 rename") in the age/tag footer row to surface discoverability
- **Quick duplicate from collection hover tooltip** — add a Duplicate button inside the palette preview tooltip panel that appears when hovering a collection in the sidebar
- **Palette freeze/archive** — mark a palette as "finalized" so it's protected from accidental edits or deletion; shows a lock badge on the card

---

## 2026-05-23 — Session 31: Inline Palette Rename

### What was done
- **Inline palette rename on double-click** — the palette card name is now directly editable without opening a modal
  - **Double-click the name** in the card info row to activate an inline `<input>` pre-filled with the current name and auto-selected for immediate overtyping
  - **Enter or blur commits** the new name via `updatePalette`; **Escape cancels** and restores the previous name without saving
  - **No regression on the modal path** — the `Edit2` hover-action button still opens the `RenameModal` for explicit rename flows or keyboard-only access
  - **External sync via `useEffect`** — if the name changes externally while the input is not open (e.g. AI name applied, modal rename), `inlineNameValue` stays in sync; if the inline editor is active, the external update is held until it closes
  - **Cursor affordance**: `cursor-text` on the name text, `title="Double-click to rename"` tooltip, preventing selection with `select-none` so double-click doesn't awkwardly highlight the text before the input opens
  - **Focus + select on mount**: 30ms setTimeout lets React paint the input before calling `focus()` + `select()` so the full name is selected and ready to type over
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **Double-click, not single-click** — single-click on the name is a non-interactive display; double-click is the universal convention for "edit this label" (Finder, Figma, Notion all use it); avoids accidental edits during normal browsing
- **`useEffect` sync with `!inlineEditing` guard** — without the guard, an AI name being applied mid-edit would silently reset the input value; guard lets the user finish their edit first
- **30ms focus delay** — synchronous focus before the input is in the DOM is a no-op; 30ms is imperceptibly short but reliably after paint; avoids using refs + `useLayoutEffect` complexity

### What's next (Session 32)
- **Quick duplicate from collection hover tooltip** — add a Duplicate button inside the palette preview tooltip panel that appears when hovering a collection in the sidebar
- **Post-export toast with palette count** — show a brief toast after ZIP export confirming how many palettes were exported and the collection/batch name
- **Keyboard shortcut hint in age bar** — on card hover, show "⌘D to duplicate · F2 to rename" or similar micro-hints in the footer age bar

---

## 2026-05-23 — Session 30: Export Collection as ZIP

### What was done
- **Export collection as ZIP** — one-click batch export directly from the collection sidebar, no manual selection required
  - **Archive icon button** appears on collection row hover, positioned left of the existing cohesion (BarChart2) button; only shown when the collection has ≥ 1 palette
  - **Animated loading state**: while the ZIP is generating, the Archive icon is replaced by a spinning Loader2; the button is non-interactive during generation (early return if `collectionExporting === c.id`)
  - **Named ZIP file**: exports as `{collection-slug}-{date}.zip` (e.g. `spring-drop-2026-05-23.zip`) so the download is immediately identifiable; previously all batch ZIPs used the generic `palette-export-{date}.zip` name
  - **Updated `batchExportZip`** in `exportPalette.ts`: added optional `zipName?: string` second parameter; when provided, the ZIP is named `{slug}-{date}.zip`; without it, the existing `palette-export-{date}.zip` fallback is used — backward-compatible, bulk-select export unchanged
  - **`collectionExporting: string | null` state** — tracks which collection (by ID) is currently generating; prevents double-clicks; per-collection so multiple collections could theoretically export concurrently (one at a time in practice since the buttons are hover-gated)
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **Archive icon (not Download)** — `Download` is already used in the bulk-select bar; `Archive` reads as "package this collection" which is semantically closer to ZIP creation; avoids visual ambiguity in the sidebar
- **`e.stopPropagation()` on click** — the archive button sits inside the same flex row as the collection-select button; without stopPropagation, clicking export would also switch the active collection view
- **Only shown when count > 0** — an empty collection has nothing to export; hiding the button avoids a no-op interaction
- **Backward-compatible `zipName` param** — existing callers (`batchExportZip(targets)` in the bulk-select bar) work unchanged; collection export just passes the name as a second arg

### What's next (Session 31)
- **Palette rename inline from card header** — double-click the palette name on the card to rename inline (currently requires the Edit2 action button in the hover row)
- **Quick duplicate from collection hover tooltip** — add a Duplicate shortcut inside the palette preview tooltip that appears on collection hover
- **Palette count on export card** — show total palette count and collection name in the ZIP export confirmation or a post-export toast

---

## 2026-05-23 — Session 29: Collection Cover Palette

### What was done
- **Collection cover palette** — any palette in a collection can now be designated as the "hero"
  - **Crown icon in action row** — a `Crown` icon button appears in the PaletteCard hover actions, but *only* when viewing a specific collection (`onSetCover` prop is only passed when `activeCollection !== "all"`); clicking toggles cover on/off
  - **Visual treatment on cover card**: amber `border-amber-300 ring-1 ring-amber-200/60` border replaces the normal border; a gold crown pill badge (`cover`) appears at top-right; swatch strip grows from `h-28` → `h-40` for a visually dominant hero card
  - **Full-width hero layout**: the cover card receives `sm:col-span-2` via the new `className` prop, spanning both grid columns so it reads as a hero at the top of the collection
  - **Pinned to front**: `displayList` (an IIFE-derived value from `sorted`) lifts the cover palette to index 0 whenever a collection is active — sort order is still respected for everything else
  - **Toggle semantics**: clicking Crown on a non-cover palette sets it as cover; clicking Crown on the current cover removes it (sets `coverPaletteId: undefined`); handled by `handleSetCover` in page.tsx
  - **Data model**: added `coverPaletteId?: string` to the `Collection` type; stored via `updateCollection` with no new store action needed — existing `Partial<Collection>` update covers it; persists to localStorage automatically
  - **`className` prop on PaletteCard**: the outer `motion.div` now accepts a passthrough `className`, enabling the parent to apply grid-span overrides while keeping AnimatePresence exit animations intact
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **Context-aware Crown button** — the crown action is invisible when browsing "All palettes"; it only materializes when filtering to a collection; prevents confusion about what "cover" means outside a collection context
- **`className` passthrough vs wrapper div** — wrapping PaletteCard in a `<div sm:col-span-2>` would break AnimatePresence (it tracks direct motion children); the className prop approach keeps the motion.div as the AnimatePresence child while letting the parent inject grid classes
- **Amber border + ring, not a separate overlay** — the cover treatment uses border color and a faint ring rather than an overlay badge strip, so the swatch colors remain the visual focus; the crown pill is small and positioned at top-right, out of the color story
- **`sm:col-span-2` only (not `col-span-2`)** — on mobile the grid is single-column; `sm:col-span-2` only activates at the two-column breakpoint where it has meaning; on mobile, cover looks like any other card (still taller swatch, still amber border)

### What's next (Session 30)
- **Palette rename from card header** — double-click the palette name on the card to rename inline (currently requires the Edit2 action button)
- **Export collection as ZIP** — "Export collection" shortcut on the collection sidebar row (selects all palettes in collection and triggers batch ZIP export without manual multi-select)
- **Quick duplicate from hover tooltip** — add a Duplicate shortcut inside the collection preview tooltip panel

---

## 2026-05-22 — Session 28: Collection Palette Preview on Hover

### What was done
- **Palette preview tooltip on collection sidebar hover** — hovering any collection row in the sidebar reveals a floating panel to the right showing all that collection's palette strips at a glance
  - **Zero state, pure CSS**: uses the existing `group/col` Tailwind group pattern (`opacity-0 group-hover/col:opacity-100 transition-opacity delay-100`) — no JS state, no re-renders, no Framer Motion needed; tooltip is always in the DOM, just invisible
  - **Panel contents**: collection name as header, one row per palette showing a proportionally-sliced color strip (h-14px) + truncated palette name beside it; up to 7 palettes shown, with "+N more" count if the collection is larger
  - **Cohesion score footer**: when the collection has ≥ 2 palettes, the bottom of the panel shows the cohesion score in its color-coded format (green/blue/amber/red) with a divider — same data already visible on the sidebar row, but reinforced in context
  - **Positioning**: `left-full ml-3 top-1/2 -translate-y-1/2` anchors the panel to the right of the row, vertically centered, floating into the grid gap between sidebar and library — only visible at `lg` breakpoints where the two-column layout exists (`hidden lg:block`)
  - **100ms delay before appearing** — prevents flash on pass-through mouse movements; feels intentional rather than reactive
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **Pure CSS over state/Framer Motion** — the tooltip doesn't need to exist in the React render cycle; it's always positioned, always sized, just opacity-hidden until hover; no re-render on every mouse-enter/leave
- **`hidden lg:block`** — the preview only shows in the wide two-column layout; on mobile/tablet the collections stack above the library and there's no room to the right
- **100ms delay** — `delay-100` on the transition class prevents the panel appearing on every rapid sidebar scan; feels calm rather than reactive
- **7 palettes as the cap** — empirical: most collections have 3–8 palettes; 7 rows at 14px each fits a typical viewport sidebar height; "+N more" covers the rest honestly

### What's next (Session 29)
- **Collection cover palette** — designate one palette in a collection as the "hero"; shown first and visually larger in the library grid when filtering to that collection; a crown/star icon in the palette card action row (context-aware: only shows when viewing a collection)
- **Palette rename from card header** — double-click the palette name on the card to rename inline (currently requires the action menu Rename option)
- **Quick palette duplication from preview** — add a "Duplicate" shortcut in the hover tooltip panel so you can fork a palette from the collection preview without navigating to the card

---

## 2026-05-22 — Session 27: Illustrated Library Empty State

### What was done
- **Illustrated library empty state** — the bare "No palettes match your filters." text (Session 1 era) is replaced with a fully designed, context-aware empty state that renders whenever filtered results are zero
  - **Illustration**: a faded, blurred 6-color palette strip (opacity 18%, 2px blur) with a centered white card bearing a `Search` icon — communicates "palettes exist but are hidden" without requiring any real art assets
  - **Context-aware headline + body copy**: "No matching palettes" + tailored sub-text: color search mode says "No palettes contain a color within ΔE ≤ 25 of #xxxxxx" while filter mode says "Try adjusting or clearing the active filters below"
  - **Individually dismissible filter chips** — each active filter gets its own chip with an × button so you can remove just the mood or just the search term without blowing away everything:
    - Text search chip: shows the quoted search term + Search icon
    - Tag chip: shows tag dot (with correct color) + tag name
    - Mood chip: shows mood-colored dot + "Warm mood" / "Vivid mood" etc.
    - Collection chip: shows FolderOpen icon + collection name (dismisses to "all palettes", distinct from bulk clear)
    - Color search chip: shows a live 12px color swatch + hex code
  - **"Clear all filters" button**: styled `Button` (outline/sm) with an X icon; resets search, tag, mood, and color search — does NOT clear collection because collection is also navigation context
  - **Entrance animation**: `motion.div` with `opacity: 0 → 1, y: 8 → 0` on mount; 0.25s, no spring bounce — appropriate weight for an informational state
- Production build: clean compile, zero TypeScript errors, all routes passing

### Key decisions
- **Faded palette strip as the illustration** — uses the same 6 brand colors already in the first-load empty state; zero new assets; conveys "your palettes are there, just filtered" rather than "nothing exists"
- **Individual chip dismiss over filter-row toggle** — when in deep filter state (mood + collection + search all active), being able to peel back one filter at a time is faster than clearing all and re-applying; the existing clear-all button covers the "just reset everything" case
- **Collection not cleared by clear-all** — collections are navigation (left sidebar); clearing them from inside the library would be disorienting; the collection chip's individual × gives the escape hatch
- **No AnimatePresence for chips** — chips appear together as a static group; individual chip removal doesn't need exit animation since the whole empty state exits when results populate

### What's next (Session 28)
- **Collection cover palette** — designate one palette in a collection as the "hero"; shown first and larger in the collection view; one-click button in the palette card action row when filtered to a collection
- **Export collection as ZIP** — "Export as ZIP" shortcut directly from the collection sidebar row or the CohesionModal (selecting all palettes in a collection without manual bulk-select)
- **Palette preview on hover** — hovering a collection sidebar row shows a mini strip of its palette colors as a tooltip/popover

---

---

## 2026-05-22 — Session 26: Palette Aging Indicator

### What was done
- **Palette aging indicator** — each palette card now shows a slim hover-visible footer bar with relative timestamps
  - **"Created X ago"** — always shown in the footer (left-aligned) when the card is hovered
  - **"Edited X ago"** — appears right-aligned when `updatedAt` differs from `createdAt`; completely absent for unmodified palettes, so there's no noise for fresh palettes
  - **`formatRelativeAge(dateStr)` utility** added to `utils.ts` — pure function, covers the full range: "just now", "N min ago", "N hours ago", "yesterday", "N days ago", "N weeks ago", "N months ago", "N years ago"
  - **Footer styling**: `opacity-0 group-hover:opacity-100` — zero layout shift on hover, cards maintain consistent height; subtle `bg-[var(--surface-2)]/60` tint distinguishes it from the info row; `text-[10px]` keeps it secondary/informational
  - **Consistent with existing hover pattern** — uses the same `group`/`group-hover` Tailwind pattern already used by the action buttons and hex label overlays; no new interaction model introduced
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **Both created + edited in one row** — showing both gives a quick "how old is this work, and did I revisit it?" scan; the edited timestamp only appears when there's actually a difference (no noise for untouched palettes)
- **Relative time, not absolute** — "3 days ago" is more useful at a glance than "May 19, 2026"; the existing `formatDate` utility in the codebase handles absolute dates when needed; this is a new layer
- **`opacity-0 group-hover:opacity-100` over AnimatePresence** — no height animation needed; the footer strip always reserves its space, so cards stay uniform; the simpler approach is the right call here
- **Pure function at module level** — `formatRelativeAge` is deterministic math over a date string with no React dependencies; lives in `utils.ts` alongside `formatDate` and `formatRelativeAge`

### What's next (Session 27)
- **Collection cover palette** — designate one palette in a collection as the "hero"; shown first and larger in the collection view; one-click button in the palette card action row when filtered to a collection
- **Export collection as ZIP** — "Export as ZIP" shortcut directly from the collection sidebar row or the CohesionModal, equivalent to selecting all palettes in the collection and batch-exporting
- **Library empty state** — when no palettes match the current filters (search + tag + mood + collection), show a helpful illustrated empty state with a clear-filters button

---

## 2026-05-22 — Session 25: Batch Export ZIP

### What was done
- **Batch export to ZIP** — select any number of palettes in the library, then click "Export ZIP" in the bulk action bar to download a single ZIP file containing one PNG reference card per palette
  - **New `batchExportZip(palettes)` function** in `exportPalette.ts` — async, streams each palette through the existing `buildPaletteCanvas` logic (the same full 800×368px reference card with hex/RGB/CMYK labels and CMYK risk badges), converts each canvas to a PNG Blob, and bundles them via JSZip
  - **Filename deduplication** — if two palettes share the same slug (e.g. two palettes named "Sunset"), files are disambiguated as `sunset-1-palette.png` / `sunset-2-palette.png`; unique names remain `sunset-palette.png`
  - **ZIP filename** includes today's date: `palette-export-2026-05-22.zip`
  - **Canvas extracted to `buildPaletteCanvas`** — the drawing logic is now a pure helper used by both `exportAsPngStrip` (single) and `batchExportZip` (multi); no code duplication
  - **Loading state in bulk bar** — the "Export ZIP" button shows a spinning `Loader2` icon and "Exporting…" label while the ZIP is being generated; `disabled` blocks double-clicks; reverts automatically when done
  - **jszip added as a dependency** — lazy-imported inside `batchExportZip` to keep the initial bundle lean
- Production build: clean compile, zero TypeScript errors, all routes passing

### Key decisions
- **Lazy `import("jszip")`** — dynamic import means JSZip is only loaded when the user actually triggers a batch export, not on initial page load; keeps the main bundle minimal
- **`canvas.toBlob()` over `toDataURL()`** — Blob is a native binary representation; avoids the base64 encoding overhead that `toDataURL` introduces for each palette, which matters when exporting 20+ palettes
- **Deduplicate filenames by slug, not by palette ID** — Zip file consumers (Finder, Windows Explorer, Dropbox) see the filename, not the ID; deduplication must work at the visible level
- **`URL.revokeObjectURL` after 10s** — the ZIP blob is freed from memory after the browser has had time to start the download; avoids a memory leak without racing the download dialog

### What's next (Session 26)
- **Palette aging indicator** — relative "created N days ago" timestamp shown on card hover; helps Cady scan for recent vs. old work
- **Collection cover palette** — designate one palette as the collection's "hero", shown first and larger in the collection view
- **Export all palettes in collection** — "Export collection as ZIP" shortcut from the cohesion modal or collection sidebar row

---

## 2026-05-22 — Session 24: CMYK Print Risk Badges on PNG Export + Clipboard Hex Import

### What was done
- **CMYK print risk badges on the PNG reference card** — the most actionable print-workflow upgrade yet
  - `simulateCmykPrint` is now called for every swatch at export time; for any color where the RGB→CMYK→RGB round-trip produces a perceptual shift (ΔE > 3), a badge is overlaid directly on the swatch in the color strip
  - **Badge content**: shows the exact ΔE value (e.g. `ΔE 8.2`) in a rounded pill; on very narrow swatches (<54px) collapses to `!` to fit
  - **Badge colors**: amber (`rgba(217,119,6,0.92)`) for caution (ΔE 3–10), rose/red (`rgba(225,29,72,0.92)`) for high risk (ΔE > 10); safe swatches get no badge — no noise for colors that print accurately
  - **"Print preview" sliver**: a 10px strip at the bottom of each risky swatch shows the actual predicted print color (after ink limit and CMYK round-trip), labeled "print" — Cady can see the shift right on the card without looking anything up
  - **Colored CMYK values in label area**: CMYK rows are now rendered in amber for caution and rose for high-risk swatches, neutral gray for safe — risk reads at a glance even without the badge visible
  - **Footer legend**: when any swatch has risk, the footer switches from the centered branding to a two-color legend ("amber = caution ΔE 3–10 · red = high risk ΔE > 10") with branding right-aligned
  - Safe palettes (all ΔE < 3): no badges, standard footer — no visual noise added for colors that print cleanly
- **Clipboard hex auto-import on focus** (deferred from Sessions 22 & 23)
  - In hex mode, focusing the textarea now silently reads the clipboard; if it contains valid hex codes and the textarea is empty, it pre-fills the field — instant paste-without-paste for Cady's common workflow of copying hex codes from Midjourney or her design tools
  - Clipboard permission denial is caught silently; no error UI shown
- Production build: clean compile, zero TypeScript errors, all routes passing

### Key decisions
- **Badge on swatch strip, not in label area** — the swatch is where the eye goes first; the badge is physically co-located with the color it describes; the label area already carries CMYK data and adding a 5th row would crowd it
- **"Print preview" sliver** — the most direct answer to "what will this look like?" is showing the actual predicted color, not just a number; a 10px sliver is perceptible but not dominant
- **ΔE value in badge, not just ⚠** — ΔE 3.1 and ΔE 18.9 both mean "shift" but the severity is very different; showing the number lets Cady decide whether a particular color is acceptable for her product
- **Amber/rose color coding in CMYK label rows** — reinforces the badge color system in the data area; if badges aren't immediately noticed, the colored text is a second channel carrying the same signal
- **Silent clipboard read, no UX** — clipboard auto-import is a power-user shortcut; surfacing it with a toast or button would add clutter for users who don't use it; silence is the right default

### What's next (Session 25)
- **Palette aging indicator** — "created N days ago" relative timestamp shown on card hover; helps Cady understand which palettes are from recent work vs. old drops
- **Batch export** — select multiple palettes → download a ZIP of individual PNG cards; useful when preparing a full collection for a print run
- **Collection cover palette** — designate one palette in a collection as the "cover", shown prominently at the top of the collection view

---

## 2026-05-22 — Session 23: Mood Filter in Library

### What was done
- **Mood filter pills in library** — a labeled "Mood" pill row now appears above the palette grid whenever the current filtered set contains 2+ distinct moods
  - **Six moods**: warm / cool / earthy / vivid / muted / dreamy — same algorithm as the mood badge on each card (`getPaletteMood` circular-mean hue + saturation gates)
  - **Mood-native colors**: each pill uses its own identity color (amber for warm, sky for cool, lime for earthy, rose for vivid, zinc for muted, violet for dreamy) rather than the generic accent, making the mood instantly recognizable at a glance
  - **"All" pill** resets to unfiltered; clicking an already-active mood pill also deselects (toggle); "Clear filters" now resets mood alongside tag/search/color-search
  - **Composes with everything**: mood filter is applied as a second pass over the already collection+tag+search-filtered `baseFiltered` set; mood counts reflect only palettes visible under current other filters, so counts are always accurate and selecting a mood never yields surprise zero results
  - **Appears and disappears gracefully**: AnimatePresence height animation — row fades/slides in when 2+ moods are present, disappears when the library narrows to a single-mood view or is empty
  - **Module-level constants**: `MOOD_ORDER` and `MOOD_PILL_STYLES` defined outside the component to avoid recreation on every render
- Production build: clean compile, zero TypeScript errors, all routes passing

### Key decisions
- **Two-pass filter: `baseFiltered` → mood counts → `filtered`** — precomputing mood counts from the pre-mood-filtered set ensures the pill counts always reflect what the user will actually see when they click; also prevents calling `getPaletteMood` twice per palette in the common "all moods" case
- **Mood row only when 2+ moods** — showing mood filters when every palette in view shares the same mood would be noise, not signal; threshold is `moodCounts.size >= 2`
- **Toggle on active pill instead of requiring "All"** — clicking the active mood deselects it; faster than having to click a separate "All" option, especially when mood is the only active filter
- **Module-level MOOD_PILL_STYLES** — pure data object, stable reference, no runtime cost; co-located with `MOOD_ORDER` so adding a new mood requires one place to edit

### What's next (Session 24)
- **Import from clipboard on Extractor hex focus** — in hex mode, auto-read clipboard on textarea focus and pre-fill if it contains valid hex codes (same pattern as color-search hex input, already deferred from Session 22)
- **Palette aging indicator** — subtle "created N days ago" relative timestamp on card hover, replacing or complementing the absolute date
- **Print-ready CMYK risk badge on reference card PNG** — add a ⚠ badge to the exported palette card for any swatch where ΔE > 10

---

## 2026-05-22 — Session 22: Hex Import Mode

### What was done
- **Hex import mode in Extractor** — a mode toggle at the top of the extractor panel now lets users switch between "Image" (the existing upload flow) and "Hex" (new)
  - **Mode toggle**: two-button tab strip (Image | Hex), animated with accent highlight; switching clears any current extraction state
  - **Hex textarea**: monospaced, 4-row input with instructional placeholder showing all accepted formats; no submit button needed — parsing is reactive
  - **Free-form parsing** (`parseHexList`): accepts any delimiter (comma, space, newline, semicolon, pipe); handles `#rrggbb`, `rrggbb`, `#rgb`, `rgb`; expands 3-char shorthand; deduplicates; caps at 8 colors
  - **Live preview strip**: appears instantly as valid hex codes are detected — 64px color bar with per-swatch click-to-copy; footer shows count + "(max)" label when all 8 slots are filled
  - **Shared save bar**: the name input + Save/Reset row is now factored out of the image-result panel and rendered at the outer level, driven by `activeColors` (either extracted image colors or parsed hex colors) — both modes share the exact same save flow
  - **Smooth transitions**: mode switch slides input panels with a 15px x-axis slide; hex preview strip height-animates in/out; save bar fades up from below
  - Clean reset in hex mode: X button clears both the color preview and the textarea; Saved! flash also clears textarea after 1.8s
- Production build: clean compile, zero TypeScript errors, all 4 routes passing

### Key decisions
- **Reactive parsing, no submit button** — hex codes are typically pasted in one shot; live feedback ("3 colors") is more useful than a two-step paste→submit flow
- **8-color cap** — matches image extraction default; enough for a POD palette, prevents the preview strip from becoming illegible on narrow panels
- **`activeColors` abstraction** — rather than duplicating the name+save UI for each mode, a single `const activeColors = inputMode === "hex" ? hexColors : colors` drives both; no prop drilling needed
- **3-char hex expansion** — `#abc` → `#aabbcc`; common in CSS shorthand and design tool exports; costs nothing to support
- **Shared save flow with image mode** — forked palettes from hex paste appear in the library identically to image-extracted palettes; same tags, same editing, same export — no second-class treatment

### What's next (Session 23)
- **Mood filter in library** — add mood pills (warm / cool / earthy / vivid / muted / dreamy) to the filter row above the palette grid so users can filter their entire library by vibe
- **Import from clipboard on focus** — in hex mode, auto-read clipboard on textarea focus and pre-fill if it contains valid hex codes (same pattern as the color-search hex input)
- **Print-ready CMYK risk indicator** — add a small "⚠ print risk" badge to the palette reference card PNG for colors where ΔE > 10

---

## 2026-05-22 — Session 21: Palette Mood Badge

### What was done
- **Palette mood badge** — every palette card now shows a small semantic pill (warm / cool / earthy / vivid / muted / dreamy) in the info row, computed purely from the palette's average HSL values
  - **Algorithm**: circular mean of hue (to avoid the 0/360 wraparound problem), plus mean saturation
    - S > 55 → **vivid** (dominant: highly saturated regardless of hue)
    - S < 22 → **muted** (dominant: desaturated / neutral palette)
    - Hue 330–360 or 0–40 → **warm** (reds, oranges, warm yellows)
    - Hue 40–160 → **earthy** (yellows, sage, olive, warm greens)
    - Hue 160–265 → **cool** (teals, blues, cyans)
    - Hue 265–330 → **dreamy** (purples, lavender, pinks)
  - **Styling**: each mood has a distinct, themed pill color — amber for warm, sky for cool, lime for earthy, rose for vivid, zinc for muted, violet for dreamy
  - **Placement**: appears immediately after "N colors" in the palette card info row — always visible, never hover-gated
  - `getPaletteMood(colors)` added to `utils.ts` as a pure function; `MOOD_STYLES` record in `PaletteCard.tsx` maps moods to Tailwind classes
- Production build: clean compile, zero TypeScript errors, all routes passing

### Key decisions
- **Circular mean for hue, not arithmetic mean** — hue wraps at 360; atan2-based circular mean handles red palettes (hue near 0/360) correctly without special-casing
- **Saturation gates first** — vivid and muted are "meta" moods that override hue; a vivid blue is still "vivid", not "cool"
- **Always visible, not hover** — the mood badge is information density, not clutter; it earns permanent real estate because it's the first quick-scan descriptor for a palette's feel
- **Six moods, not five** — "dreamy" (purple/pink range) is distinct enough from warm and cool to warrant its own category; it maps directly to a common POD aesthetic

### What's next (Session 22)
- **Import palette from hex list** — text area in the extractor panel: paste comma/space-separated hex codes (e.g. `#ff6b6b, #4ecdc4, #ffe66d`) to create a palette instantly, no image needed
- **Mood filter in library** — add mood pills to the filter row so users can filter by warm/cool/etc across their whole library
- **Print-ready CMYK export badge** — extend reference card PNG to include a print risk indicator for high-ΔE swatches

## 2026-05-22 — Session 20: Tag Dot Colors, Collection Count & Clipboard Hex Paste

### What was done
- **Tag dot decorations** — every tag now has a semantic color dot wherever tags appear in the UI
  - Rose (#fb7185) for "trend" palettes forked from the library
  - Sky (#38bdf8) for "shared" palettes forked from a URL
  - Neutral zinc (#a1a1aa) for any custom user tags
  - Dots appear in both the sidebar inventory count row and the library tag filter pills
  - In the filter pills, the dots replace the old generic `<Tag>` icon — more informative, same footprint
  - `getTagDotColor(tag)` helper defined as a pure module-level function so it can be called from both render sites cleanly
- **Collection context in library header** — when a collection filter is active the Library heading now reads "Library — Collection Name · N" (e.g. "Library — Spring Drop · 4"), providing instant orientation without needing to look at the left sidebar
  - Implemented with two pre-computed derived values (`activeCollectionInfo`, `activeCollectionCount`) so the JSX stays clean
  - Name is `truncate max-w-[140px]` to protect the layout on long collection names
- **Paste-from-clipboard hex** — when color search mode opens, focusing the hex input now auto-reads the clipboard and pre-fills it if the clipboard contains a valid hex code
  - Silent `try/catch` for `navigator.clipboard.readText()` — degrades gracefully when clipboard access is denied (mobile, insecure context, or permission blocked)
  - Only fires when the input is empty so it never clobbers a value the user already typed or selected via the picker
- Production build: clean compile, zero TypeScript errors, all 6 routes passing

### Key decisions
- **Pure color map, not a lookup table** — `getTagDotColor` uses if/if/return rather than an object literal so it's trivially extensible without mutating a shared constant
- **Module-level function, not a hook or constant** — pure function with no React state or closures; lives at module scope next to the component, not inside it
- **Derived state for collection info, not IIFE in JSX** — two short `const` lines in the component body are easier to read than inline `collections.find(...)` repeated across the JSX
- **`max-w-[140px] truncate`** — collection names can be long; capping at 140px keeps the library header single-line at all viewport widths in the 340px+ right column

### What's next (Session 21)
- **Palette mood badge** — small pill on each card showing the dominant mood word (warm / cool / earthy / muted / vivid) derived from the palette's average HSL values — fast, no API needed
- **Import palette from URL or text** — paste a URL from a site and attempt to extract the top colors from it via the server; or paste a comma-separated list of hex codes to create a palette instantly
- **Print-ready CMYK export** — extend the palette reference card PNG to include a "CMYK for print" warning badge if any swatch has high CMYK shift risk (ΔE > 10)

## 2026-05-22 — Session 19: Palette Reference Card Export

### What was done
- **Upgraded PNG export to a proper palette reference card** — the basic 120×108px swatch strip is replaced with a beautiful 800×368px reference card
  - **Header (64px)**: gradient logo mark (rose→violet→sky), palette name in bold, color count right-aligned, subtle bottom border
  - **Swatch area (190px)**: full-color blocks distributed evenly across the 800px width; last swatch absorbs sub-pixel rounding remainder so the card always fills perfectly
  - **Label area (84px)**: white background, per-column separators; each column shows:
    - Hex code in bold Courier (e.g. `#E8A87C`)
    - CMYK on two lines: `C14  M38` / `Y51  K0` — two-line layout keeps text readable even with 8 colors at 100px per swatch
    - RGB in light gray: `232 168 124`
  - **Footer (30px)**: cream background, "Made with Palette · color intelligence for creators"
  - Font stack: `-apple-system, Helvetica Neue` for headings; `Courier New` for color data
  - Filename: `[palette-name]-palette.png` (unchanged)
- Updated ExportModal action label to "Download Palette Card" / "PNG reference card — hex, RGB & CMYK per swatch"
- Production build: clean compile, zero TypeScript errors, all 6 pages/routes passing

### Key decisions
- **800px fixed width** — consistent output regardless of color count; with 8 colors each swatch is still 100px wide, enough for all label text
- **Two-line CMYK format** — `C__  M__` / `Y__  K__` keeps the widest possible value ("C100  M100" = 10 chars × 6px ≈ 60px) comfortable at minimum swatch width
- **Replace, not add** — one clean "Download Palette Card" action instead of two export options; the card is strictly better for Cady's workflow (self-contained print spec, not just a color strip)
- **Reused `hexToRgb` and `rgbToCmyk` from utils.ts** — same conversion functions already used by CMYK copy and Harmony modal; no new math, just new presentation

### What's next (Session 20)
- **Paste-from-clipboard hex** — detect clipboard content on focus in color search and auto-populate if valid hex
- **Tag dot decorations** — colored dot beside each tag name in the sidebar inventory row (rose for trend, sky for shared, neutral for custom)
- **Collection palette count** — show "N palettes" in the library header when a collection filter is active

## 2026-05-22 — Session 18: Palette Search by Color

### What was done
- **Palette search by color** — enter a hex code and find palettes that contain perceptually similar colors
  - **Pipette toggle button** in the Library header switches between text search mode and color search mode
  - **Color input**: a hex text field (`#rrggbb` format, auto-prefixes `#`) paired with a native `<input type="color">` picker — click the color swatch to open the browser's full color picker
  - **ΔE distance filtering**: uses the existing `deltaE()` (CIE76, LAB color space) function from utils.ts; includes palettes where any swatch has ΔE ≤ 25 from the target color
  - **Sorted by best match**: when color search is active the sort control is replaced by "sorted by match"; palettes are ranked by their minimum ΔE across all swatches (closest first)
  - **Closest swatch highlight**: the matching swatch on each card gets a white ring-inset (always visible, not just hover) so you instantly see which color in the palette is the one that matched
  - **ΔE badge**: a small `ΔE X.X` pill on the matching swatch shows the exact perceptual distance — e.g. `ΔE 2.4` (nearly identical) vs `ΔE 18.3` (loose match)
  - **Empty state**: when color search returns no results, the message is threshold-aware: "No palettes contain a similar color (ΔE ≤ 25)" vs the generic filter message
  - **"Clear filters" resets everything**: the existing clear button now also exits color search mode and clears the hex input
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **CIE76 deltaE, same function already in utils.ts** — no new dependency; reuses the same perceptual color math that drives CMYK risk badges and cohesion analysis
- **ΔE ≤ 25 threshold** — generous enough to catch "this is clearly a pink/rose family" matches across many palettes, strict enough to exclude completely unrelated colors; not configurable (fewer knobs = less friction)
- **Min-ΔE across all swatches** — a palette with one matching swatch is still relevant; we don't require all colors to be close
- **Pipette toggle, not a third input type** — keeps the header clean in the common case (text search + sort); color mode is clearly a distinct affordance, not a sub-feature of text search
- **Native `<input type="color">` over a custom picker** — the browser picker is richer than anything we could build quickly; overlay the hidden input on the swatch div to preserve the custom visual

### What's next (Session 19)
- **Tag count pill decorations** — add colored dot beside each tag name in the sidebar inventory row (rose for "trend", sky for "shared", neutral for custom)
- **Collection palette count annotation** — show "N palettes" label in the library grid header when a collection filter is active
- **Paste-from-clipboard hex** — when color search is active, detect clipboard content on focus and auto-populate if it's a valid hex

---

## 2026-05-22 — Session 17: Tag Inventory + Shift+Arrow Nudge

### What was done
- **Tag inventory in sidebar** — finally delivered after 7 sessions of deferral (planned since Session 10)
  - Compact count row appears below the Discover / Trend Library button whenever any palettes exist
  - Shows "Mine 4", "Trend 7", "Shared 2" etc. drawn live from the palette store — no stale data possible
  - Each count is a clickable filter button: clicking activates that tag filter (same as the pill row in the library) and highlights in `var(--accent)` when active
  - Renders only when `palettes.length > 0` and at least one tag or untagged palette exists; disappears cleanly when the library is empty
  - Zero new state — reads the already-computed `allUniqueTags` and `untaggedCount` variables, so no extra calculation
- **Shift+Arrow keyboard nudge in SwatchEditor** — 10-step jumps on focused H/S/L sliders
  - `onKeyDown` on each range slider intercepts Shift+Arrow{Left/Right/Up/Down}; calls `nudge(key, dir, 10)` and `preventDefault` so the native 1-step doesn't also fire
  - `nudge()` now accepts an optional `step` parameter (default 5) — existing ±5 click-buttons unchanged
  - Tooltips on ± buttons updated to document the Shift+Arrow shortcut: "−5° (Shift+← for −10°)"
  - Arrow↑ treated same as →, Arrow↓ same as ← (consistent with typical range slider keyboard conventions)
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **Clickable inventory items, not just text** — making each count a filter button means the left panel serves as both inventory and navigation; one click takes you directly to that tag's palette view
- **`activeTag` highlight on sidebar counts** — same state drives both the sidebar counts and the pill row, so both update in sync with no extra wiring
- **`preventDefault` on Shift+Arrow** — without it the browser would fire the 10-step nudge AND the native 1-step, resulting in an 11-step jump on some browsers
- **`nudge(key, dir, 10)` not a separate `bigNudge`** — a single function with an optional step param is cleaner than duplicating the wraparound/clamp logic

### What's next (Session 18)
- **Palette search by color** — enter a hex value and find palettes that contain perceptually similar colors (deltaE distance, not exact match)
- **Tag count pill decorations** — add a small colored dot beside the tag name in the inventory row to match the palette card tag badge colors (rose for "trend", sky for "shared")
- **Collection palette count annotation** — show a subtle "N in collection" count on the library grid header when a collection is active

---

## 2026-05-22 — Session 16: Bulk Palette Actions

### What was done
- **Bulk palette actions** — select multiple palettes and operate on them all at once
  - Hovering any palette card reveals a small checkbox in the top-left corner of the swatch strip (the "invite to select" pattern from Gmail/Google Photos)
  - Once any card is selected, checkboxes become persistently visible on all cards so users can keep adding to the selection
  - Selected cards get an accent-colored border for immediate visual feedback
  - **Bulk action bar** slides up from the bottom of the screen (spring animation) as soon as any card is selected
    - Shows count ("3 palettes selected") with "Select all N" shortcut when not everything in the current view is selected
    - **Move to collection**: native `<select>` with all collections + "Remove from collection" option; applying immediately clears selection
    - **Delete N**: two-step confirm (click once to arm, click again within 2.5s to execute); auto-disarms if no second click
    - **✕**: clears selection without any action
  - `deletePalettes(ids)` and `assignPalettesToCollection(ids, collectionId)` added to Zustand store — both update localStorage in a single `set` call using a `Set<string>` for O(1) membership checks
  - `useCallback` on all selection handlers to avoid unnecessary PaletteCard re-renders when selection state changes
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **Checkbox on hover, always-on when any selected** — balances discoverability (you can always start selecting) with visual cleanliness (no checkboxes cluttering an uncluttered library view)
- **`Set<string>` for selection state** — O(1) has/add/delete; spread into array only at action time
- **`useCallback` for toggleSelect/clearSelection/selectAllVisible** — since these are passed as props to every PaletteCard, stable references prevent an O(n) re-render cascade on every selection change
- **Two-step confirm for bulk delete** — deleting 10 palettes at once is a significant action; the armed state times out at 2.5s so a mis-click can't trap users
- **Applying collection assignment clears selection** — common pattern: after a bulk action is done, you want to see the result, not stay in selection mode

### What's next (Session 17)
- **Palette count by tag in sidebar** — show "Mine 4 · Trend 7" below the Discover button (this has been deferred since Session 10!)
- **Keyboard nudge in SwatchEditor (Shift+Arrow)** — step H/S/L by 10 units when Shift is held on a focused range slider
- **Palette search by color** — enter a hex value and find palettes that contain similar colors

---

## 2026-05-21 — Session 15: Duplicate Palette Action

### What was done
- **Duplicate palette** — a `CopyPlus` icon button in the PaletteCard hover actions row creates an instant copy of any palette
  - One-click creates a new palette named `"[original name] (copy)"` prepended to the library grid
  - Copies all colors (in their current reordered arrangement), tags, and collectionId — the duplicate is fully independent
  - Brief `Check` icon flash for 1.5s confirms the action without any toast or modal interruption
  - `duplicatePalette(id)` action added to Zustand store; wraps `addPalette` with shallow-copied colors/tags to prevent shared references
  - Button placed between Export and Delete in the hover row; `outline` variant during the `duplicated` state keeps visual hierarchy
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **Shallow copy of colors and tags arrays** — referencing the original array would mean edits to the copy mutate the original; spread prevents this
- **`(copy)` suffix, not `(1)`** — conveys intent ("this is a working copy") rather than implying a sequence
- **No prompt or modal** — a duplicate is instant and reversible (just delete it); confirming would add friction to a low-risk action
- **Green `Check` in-place, no toast** — the button itself is the feedback surface; a floating toast would be overkill for a single-card action

### What's next (Session 16)
- **Palette count by tag in sidebar** — show "Mine 4 · Trend 7" summary below the Discover button for live inventory at a glance
- **Keyboard nudge in SwatchEditor (Shift+Arrow)** — step H/S/L by 10 units when Shift is held on a focused range slider
- **Bulk palette actions** — checkbox-select multiple cards, then assign to collection or delete all at once

---

## 2026-05-21 — Session 14: Sort Palette Grid

### What was done
- **Sort palette grid** — a compact sort control now lives in the Library header row, to the right of the search input
  - Five sort modes: Newest (default), Oldest, Name A→Z, Name Z→A, Most colors
  - Styled as an icon + native `<select>` combo — accessible, zero dependencies, hover accent border for affordance
  - `sortBy` state derives a `sorted` array from `filtered` after all existing filters (search, collection, tag) apply — sort and filter compose cleanly
  - Sort icon (`ArrowUpDown`) from lucide-react communicates the control's purpose at a glance without a label
  - Uses `localeCompare` for name sorts (handles accented characters, case-insensitive)
  - Only renders when `palettes.length > 0` (matches search bar's visibility rule)
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **Sort after filter** — applying sort to the already-filtered list is correct; sorting the full store and then filtering would give wrong counts
- **Native `<select>` over custom dropdown** — five simple options don't need a custom component; native is accessible, keyboard-navigable, and touch-friendly out of the box
- **"Newest" as default** — new extractions should appear at the top; this matches how the store `addPalette` prepends to the array, so the default feels instant

### What's next (Session 15)
- **Palette count by tag in sidebar** — show "Mine 4 · Trend 7 · Shared 2" summary below the Discover button so the left panel shows live inventory without switching context
- **Keyboard nudge in SwatchEditor (Shift+Arrow)** — step H/S/L by 10 units with Shift+Arrow on the focused range slider
- **Duplicate palette action** — one-click copy of any palette with "(copy)" suffix, useful for experimenting with edits while preserving the original

---

## 2026-05-21 — Session 13: Swatch Drag-to-Reorder

### What was done
- **Swatch drag-to-reorder** — colors within any palette can now be dragged horizontally to rearrange their position
  - `Reorder.Group` (axis="x") replaces the static flex container for the swatch strip
  - Each `Reorder.Item` carries a stable `_key` (`paletteId-index`) that survives reordering so React doesn't churn
  - `orderedColorsRef` stays current during the drag via `handleReorder`, so `onDragEnd` always commits the final order without stale-closure issues
  - 250ms guard on `onClick` prevents copy-to-clipboard firing after a drag release (pointer-up timing overlap)
  - `whileDrag` lifts the active swatch with `scale: 1.04` + drop shadow for tactile feedback
  - Cursor is `grab` at rest, `grabbing` during drag — immediately communicates draggability
  - `onDragEnd` commits the new order to Zustand (localStorage) so the order persists across sessions
  - Pencil-to-edit button still works via `stopPropagation`; click-to-copy still works for pure clicks
  - `useEffect` syncs hex values when a swatch is edited externally while preserving the user's established order
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **Stable keys by initial position, not hex value** — duplicate hex values in a palette would break Framer Motion's identity tracking if we used hex as the key; index-at-mount avoids this entirely
- **Ref for current order** — state updates are async; keeping `orderedColorsRef` current in `handleReorder` ensures `onDragEnd` reads the true final order even if React hasn't flushed yet
- **250ms drag guard** — Framer Motion fires pointer-up → onClick after drag ends; any click within 250ms of `dragEndTimeRef.current` is suppressed
- **Commit on drag end, not on every reorder tick** — `onReorder` fires many times per second during drag; only committing on `onDragEnd` avoids hundreds of localStorage writes

### What's next (Session 14)
- **Palette count by tag in sidebar** — show "Mine 4 · Trend 7 · Shared 2" summary below the Discover button for a quick inventory at a glance
- **Keyboard nudge in SwatchEditor (Shift+Arrow)** — native range slider moves 1 unit per arrow key; adding Shift+Arrow = 10-step would be a meaningful power-user shortcut
- **Sort palette grid** — a sort dropdown (newest, oldest, name A→Z, most colors) would help when the library grows large

## 2026-05-21 — Session 12: Nudge Controls + Cohesion Score Badge

### What was done
- **HSL nudge controls in SwatchEditor** — finally delivered after 8 sessions of deferral
  - Each H/S/L slider row now has `−` and `+` micro-buttons flanking the value display
  - H steps ±5° with wraparound (355° + 5 → 0°, 0° − 5 → 355°) using circular modulo
  - S and L step ±5% clamped to 0–100
  - Uses functional `setState` to avoid stale closure; value display always reflects true state
  - Tooltip on each button shows the unit (`−5°` / `+5%`) so intent is clear at a glance
- **Cohesion score inline badge on collection sidebar rows**
  - Each collection row now shows its cohesion score (0–100) directly in the sidebar, no modal needed
  - Color-coded: green ≥ 80 (Unified), sky blue ≥ 60 (Cohesive), amber ≥ 40 (Developing), rose < 40 (Fragmented)
  - Only renders when collection has ≥ 2 palettes (single-palette collections have no meaningful score)
  - Score adapts to active state: inherits currentColor at reduced opacity so it stays legible on accent background
- **`computeCohesionScore()` extracted to utils.ts**
  - Reusable function with same three-axis formula as CohesionModal (hue 50%, saturation 30%, lightness 20%)
  - Accepts a loose `{ colors: { hex: string }[] }[]` type — no Palette import required
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **Functional setState for nudge** — avoids stale `hsl` closure: the updater receives the latest state, so rapid clicking doesn't drift
- **Wraparound H, clamped S/L** — hue is circular and wrapping feels natural; saturation and lightness have hard semantic boundaries (no color at 0% sat, white/black at 0/100% lightness), clamping is correct
- **Score as number, not just dot** — a numeric score is more actionable than a colored dot; you know immediately whether 72 is worth opening the modal for more detail or not
- **`computeCohesionScore` in utils, not imported from CohesionModal** — CohesionModal also computes outliers, labels, and per-axis breakdowns that page.tsx doesn't need; a thin utility function keeps the import cheap

### What's next (Session 13)
- **Palette count by tag in sidebar** — the sidebar shows collections but not tag distribution; a small "Mine 4 · Trend 7 · Shared 2" summary would make the left panel more informative
- **Keyboard nudge via arrow keys** — when a slider is focused, the native slider already moves by 1; adding shift+arrow = 10 step would be a power-user shortcut
- **Swatch reorder** — drag swatches within a palette to reorder them (left→right) without editing colors

---

## 2026-05-21 — Session 11: Custom User Tags

### What was done
- Built **custom user tag management** — a Tag icon in the PaletteCard hover actions row opens an inline tag editor overlay
  - Click Tag icon: overlay slides up (same pattern as AI naming overlay), auto-focuses the input
  - Type a tag name and press Enter or comma to add it instantly
  - Backspace on empty input removes the last tag (standard tag-input muscle memory)
  - Escape closes the editor
  - Blur commits any typed-but-not-yet-added tag automatically
  - Existing tags displayed as removable pills with × buttons — "trend"/"shared" tags keep their distinct colors; user tags render in neutral style
  - Tags sanitized: lowercase, spaces→hyphens, alphanumeric+hyphens only, max 24 chars; duplicates silently ignored
  - Tag button highlights (outline variant) when the editor is open; AI naming overlay auto-closes when tagging opens and vice versa
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **Inline overlay, not a modal** — keeps the editing experience in context with the actual palette colors, matches the AI naming overlay pattern already established
- **Backspace-to-remove-last** — standard UX for tag inputs (Gmail, GitHub labels); no extra click needed
- **Blur commits** — typing a tag and clicking elsewhere saves it; no "forgotten tags" from partial input
- **Sanitization in commitTag** — tags are normalized before saving so "Dark Academia" and "dark-academia" both produce the same tag; no dirty data in localStorage

### What's next (Session 12)
- Palette nudge controls: arrow buttons in SwatchEditor to step H/S/L by ±5 without dragging
- Cohesion score badge: show computed score inline on collection sidebar rows (avoid opening modal just to see the number)
- Palette count by tag: show per-tag counts in the sidebar as well as the pill row

---

## 2026-05-21 — Session 10: Tag-Based Filtering

### What was done
- Built **tag-based palette filtering** — a pill row above the palette grid that filters by tag (All / Mine / Trend / Shared / any future tag)
  - Pills appear automatically when any palettes have tags (animated in with Framer Motion height transition)
  - "All" shows every palette; "Mine" shows only untagged (user-extracted) palettes; each tag name shows palettes with that tag
  - Count badge on every pill shows how many palettes match
  - Active pill highlighted with accent color; inactive pills hover with accent border
  - "Clear filters" inline link appears below the grid when filters return zero results
  - Tag + search + collection filters all compose together (AND logic)
- Added **tag badges on PaletteCard** — small colored pills in the info row show each palette's tags
  - "trend" renders rose-colored badge; "shared" renders sky-blue badge; custom tags get neutral color
  - Sits alongside the existing "in collection" chip in the same flex row

### Key decisions
- **"Mine" as a virtual tag** (`__mine__` sentinel) — untagged palettes don't have an explicit "mine" tag, but users still need a way to filter to just their extracted work; sentinel avoids polluting the tag data model
- **Pills computed from live data** — no static tag registry; new tags added anywhere in the app appear in the pill row automatically
- **AND composition** — tag filter compounds with collection + search rather than replacing them; more precise without extra UI complexity

### What's next (Session 11)
- Palette nudge controls: arrow buttons in SwatchEditor to step hue/saturation by ±5 without dragging
- Cohesion score badge: small score badge on collection sidebar rows without opening the modal
- Custom user tags: let users add/remove free-form tags on any palette card

---

## 2026-05-21 — Session 9: AI Palette Naming

### What was done
- Built **AI Palette Naming** — the Wand2 button on any palette card calls Claude Opus 4.7 and returns 3 evocative name suggestions instantly
  - New POST `/api/name-palette` route using `@anthropic-ai/sdk` with `claude-opus-4-7`, `effort: "low"` for fast, cheap naming calls
  - Wand2 icon added to the PaletteCard hover actions row (alongside Eye, Edit2, etc.)
  - Loading state: spinner while waiting for the API response
  - Names slide in as an overlay panel at the bottom of the card — tap any name to apply it immediately
  - Error state auto-dismisses after 2s if the API call fails
  - Dismiss button (X) to close without selecting
- Production build: clean compile, zero TypeScript errors; `/api/name-palette` correctly server-rendered as dynamic route

### Key decisions
- **Server-side API route** — API key stays server-side, never exposed to the browser
- **`effort: "low"`** — palette naming is a simple creative task; low effort is fast (< 1s) and uses minimal tokens
- **Overlay panel over the card** — keeps the suggested names in context next to the actual palette colors, making the choice obvious
- **No model round-trip for rejection** — close the panel with X; no second API call needed

### What's next (Session 10)
- Tag-based filtering: filter the library by tag (trend, shared, etc.) using a pill row above the palette grid
- Palette nudge controls: hue/saturation arrow buttons in SwatchEditor for stepping by ±5 without dragging
- Cohesion score badge: small cohesion score visible on collection rows in the sidebar without opening the modal

---

## 2026-05-21 — Session 8: Shareable Palette URLs

### What was done
- Built **shareable palette URLs** — any saved palette can now be shared as a link anyone can open, no account required
- `GET /p?n=PaletteName&c=hex1,hex2,...` — URL-encoded palette with a beautiful standalone page
  - Large color strip, individual swatches with one-click hex copy, "Copy all" action
  - Dynamic `<title>` metadata per palette name
  - Invalid/empty URL handled gracefully with a back-to-app link
- **Fork to library** — the share page has a "Fork to my library" button; when clicked, takes the viewer to `/?fork=...` where the main app detects the param on load and shows a toast prompt to save the palette (tagged as "shared")
- **Copy Share Link** — sixth action added to the Export modal (Link2 icon), copies the full share URL to clipboard alongside PNG, hex, CSS, JSON, CMYK options
- Production build: clean compile, zero TypeScript errors; `/p` correctly server-rendered as dynamic route

### Key decisions
- **URL-only, zero backend** — palette data fully encoded in the URL; no database, no auth, works forever as a static link
- **Fork prompt as toast** — rather than a modal or redirect, the fork offer appears as a bottom-center toast that dismisses cleanly; non-disruptive for users who arrive at the main app via other means
- **"shared" tag on forked palettes** — distinguishes user-created from shared/trend palettes; enables future filtering
- **`window.history.replaceState`** — strips `?fork=` from the URL after reading it so refresh doesn't re-prompt

### What's next (Session 9)
- Tag-based filtering: let users filter library by tag (trend, shared, etc.)
- Palette nudge controls: from swatch editor, arrow buttons to step hue/saturation by ±5 without dragging
- AI palette naming: call Claude API to suggest evocative names for extracted palettes

## 2026-05-21 — Session 6: Dark Mode Preview

### What was done
- Added **Dark Mode Preview** as a third toggle state in Harmony View (Screen / Dark / Print)
- Extended `assignColorRoles()` with a `dark` parameter that inverts the luminance sort order: in dark mode the darkest color becomes background, lightest becomes text, while accent/secondary are still ranked by saturation
- Replaced the old Screen/Print two-button toggle with a three-button Screen/Dark/Print control (Moon icon for dark)
- All contextual text in HarmonyModal updates per mode: subtitle, "Color Roles" / "Dark Roles" / "CMYK Breakdown" label, WCAG contrast summary note, and footer footnote
- WCAG contrast badges recompute correctly against the dark-assigned background/text roles
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **Single param, no duplicate function** — `dark=false` default keeps all existing callers (CohesionModal, etc.) unchanged; only HarmonyModal passes `dark=true`
- **Saturation-based accent stays the same** — in both light and dark mode, the most saturated color is best for buttons/highlights; only the luminance poles (bg/text) swap
- **No hardcoded dark backgrounds** — the dark roles emerge entirely from the palette itself, so every palette gets a unique, authentic dark interpretation

### What's next (Session 7)
- "Copy as CMYK" in Export modal — add a fifth export action that copies CMYK channel values (c, m, y, k percentages) for each color, useful when sending specs to a POD print provider
- Palette editing from cohesion view — click any palette strip in CohesionModal to jump to that palette's swatch editor
- Trend/season palette library — a curated set of seasonal starting palettes creators can fork into their library

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

---

## 2026-05-21 — Session 7: Trend Library + CMYK Export + Cohesion Edit Jump

### What was done
- Built **Trend Library** — 22 curated seasonal palettes creators can fork into their library
  - 5 season tabs: Spring, Summer, Fall, Winter, Evergreen (4 palettes each + 6 evergreen)
  - Each palette shown as a color strip with name and mood tags; hovering any swatch reveals its hex code
  - "Fork" button saves a copy to the user's library (tagged as "trend"); shows "Saved ✓" feedback for 2s
  - Season gradient header animates when switching tabs
  - Opens as a bottom-sheet modal (mobile-first) with a "Discover" entry in the left sidebar
- **Copy as CMYK**: fifth action added to Export modal — copies all colors as `#HEX  C__ M__ Y__ K__` lines, ready to paste into a print spec document
- **Cohesion → Edit jump**: clicking any palette strip in CohesionModal closes the cohesion view and opens that palette's swatch editor at swatch 0 — so "outlier" palettes flagged by the cohesion analysis are one click from fixing
- Production build: clean compile, zero TypeScript errors

### Key decisions
- **22 palettes in data file, zero backend** — trend palettes are authored in `trendPalettes.ts`; no API call, no latency, works offline; easy to add more in future sessions
- **Fork creates a full copy** — forked palettes are fully editable, have "trend" tag for filtering later; original trend palette stays unchanged in the library
- **Cohesion edit uses onClose+setEditTarget sequence** — closes cohesion modal first, then opens swatch editor, avoiding z-index stacking issues

### What's next (Session 8)
- Tag-based filtering: surface the "trend" tag and let users filter library by tag
- Palette editing nudges: from the swatch editor, add arrow buttons to nudge hue/saturation by small amounts without dragging sliders
- Share palette: generate a URL-encoded palette link that anyone can open to see the palette (no account needed)
