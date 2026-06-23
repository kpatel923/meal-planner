# Planner Redesign — Change Notes

A focused rebuild of the Planner experience: day-tab navigation, meal-row
cards, live per-day nutrition, prep tracking, and a contextual side panel that
becomes bottom sheets on mobile. **No features were removed** — everything from
the original Planner is preserved and re-surfaced in a cleaner shell.

## New files

| File | Purpose |
|------|---------|
| `src/lib/weekDates.js` | Week-date helpers (Monday-anchored), today index, range label. Unit-tested for normal + month-spanning weeks. |
| `src/components/planner/DayStrip.jsx` | Horizontal day selector with per-day prep-status pips. Auto-scrolls active day into view. |
| `src/components/planner/MealCard.jsx` | Single meal row: accent bar, icon, name, calories/time/diet, prep-toggle + swap + view actions. Renders an "Add {meal}" affordance when empty. |
| `src/components/planner/MobileSheet.jsx` | Reusable bottom sheet (drag-to-dismiss, backdrop tap, Esc, body-scroll lock). |
| `src/components/planner/PlannerPanels.jsx` | Shared panel sections (week overview, grocery preview, AI prompts, quick actions) used by BOTH the desktop sidebar and the mobile sheets — single source of truth. |
| `src/components/planner/PageHeader.jsx` | Shared page-header pattern (eyebrow + title + subtitle + actions, optional sticky) for visual consistency across pages. |

## Modified files

### `src/pages/GroceryPage.jsx` (redesigned layout)
- Sticky header with inline actions (Print / Share / Export / sync status).
- Compact progress card with the servings badge folded in.
- Tightened category cards and item rows matching the new meal-card aesthetic;
  brand color used for completed states instead of ad-hoc rgba.
- **Preserved:** offline caching + offline banner, online/offline detection,
  select-all / clear-all, show/hide quantities, show/hide meal info, plan
  switching, share, print, txt export, collapsible categories, per-category
  progress, and the `savePlanToSession`/`loadPlanFromSession` exports.

### `src/pages/AISuggestionsPage.jsx` (redesigned + streamlined)
- Reordered so the ingredient box is the first thing you see; source mode and
  meal type moved inline below it, so it reads as one quick action rather than a
  five-step form (the "time-to-value" fix from the original review).
- Suggestion cards and the review modal restyled to the new language.
- **Preserved:** voice input (Web Speech API), quick-prompt chips, all three
  source modes, diet/serving context chips, the full Review-before-add modal
  with video/written/notes fields, library-aware badges, and add-to-library.


### `src/pages/PlannerPage.jsx` (full rewrite of the layout)
- Day-tab + meal-row layout replaces the 7-column grid.
- Live per-day nutrition banner (calories / carbs / protein / fat).
- Desktop: persistent right panel. Mobile: slim stat strip + bottom sheets.
- Empty states for "no plan" and "empty day", each with a clear next action.
- **Preserved:** generate, regenerate-day, swap (with search modal), undo-swap,
  undo-generate, save plan, share (plan + grocery), shareable link, PDF export,
  print, AI plan summary, diet filters, servings stepper, avoid-repeats toggle,
  RecipeDetailModal, ShareModal.

### `src/hooks/usePlanStore.jsx`
- Removed the artificial **600 ms delay** in `generate()`. Now defers one
  macrotask (`setTimeout(…, 0)`) so the loading state paints, then builds
  synchronously. Avoid-repeats, undo-snapshot, and usage-recording logic
  unchanged.

### `src/components/layout/AppLayout.jsx`
- **Onboarding dismissal now persists** to `localStorage`, so dismissing it no
  longer re-triggers on every reload.
- Mobile nav reworked: 4 primary tabs (Plan / Grocery / AI / Recipes) + a
  **"More" sheet** exposing Saved, Household, Profile, theme toggle, and sign
  out — nothing is unreachable on mobile anymore.

### `src/styles/index.css`
- Added redesign animations (`dayContentIn`, `mealRowIn`, `checkPop`,
  `pipFill`, `sheetUp`, `backdropIn`) — all respect `prefers-reduced-motion`.
- Added bottom-sheet styles (`.sheet-backdrop`, `.sheet-panel`, `.sheet-grip`),
  day-strip scroll helpers, and the mobile `.stat-strip`.

## Performance & reliability
- Single `useMeals()` call (was two); diet filtering moved client-side.
- Removed the 600 ms generate stall.
- Deterministic inline hover (no CSS specificity fights with inline styles).
- All new code validated: parses via esbuild, full local module graph resolves,
  date logic unit-tested.

## Notes
- The design uses the app's existing "Ember" theme tokens, so light/dark mode
  and the theme toggle keep working — the redesign is on-brand, not a reskin.
- `reorderMeal` remains in the store (unused by the new UI) in case you want to
  reintroduce drag-and-drop later.
