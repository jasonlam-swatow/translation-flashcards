# AGENTS HANDBOOK

## Project Snapshot
- **Name:** Translation Flashcards  
- **Stack:** Vite + Vue 3 (script setup), Pinia for shared state, Tailwind-style utility classes, Vercel-style serverless API routes backed by Postgres (via `postgres` npm package).  
- **Focus:** Collect sentences with translations, then review them as flashcards that adapt to learning recency, starring, and per-card notes.

## Core User Journeys
1. **Library management (`src/views/Library.vue`):**  
   - Load entire sentence inventory from `/api/sentences`.  
   - Add entries via quick-add parser (`==sentence==（translation）`) for bulk or manual form with optional note.  
   - Edit/delete existing entries, toggle visibility filters, preview a sentence, and view inline note metadata.
2. **Flashcard practice (`src/views/Flashcards.vue`):**  
   - Start a “new sentence” session or a “revision” session (weighted sampling).  
   - Swipe/keyboard navigation with card flip interactions; mark learned, star, edit, and attach per-card notes.  
   - Revision logic prioritizes most-recent learning windows and starred content.

## Frontend Architecture
- **State source:** `src/stores/sentences.js` Pinia store encapsulates CRUD, mark-learned, toggle-star, and note update calls. All components read through store refs (`storeToRefs`) to stay reactive.  
- **Flashcards view:** Handles ordering, swipe animations via `useSwipe`, revision group construction, note editing (`noteDraft` + `handleNoteBlur`), and monitors computed candidates.  
- **Library view:** Handles filtering, infinite scrolling (`onScroll`), manual form state, quick add parsing, and preview modal with note display.  
- **Styling:** Utility classes plus scoped styles; note input uses icon-with-input convention shared with flashcards to keep UX consistent.

## Revision Algorithm (Flashcards)
- `revisionWeights = [4,3,2,1]` mapping to buckets:
1. Starred and learned within the last 4 days.  
2. Starred and learned within the last 14 days.  
3. Starred but older than 14 days.  
4. Unstarred (any learned date).  
- `buildRevisionSession(limit)`:
  - Builds shuffled groups per bucket.  
  - Computes size-limited allocation based on weights while ensuring minimum representation (drops low-count groups if allocation would be <1).  
  - Distributes remainder using fractional weights then priority order.  
  - Interleaves actual card order using a weighted round-robin to avoid streaks.  
- Watch out for `revised` Set (Pinia store) that prevents duplicate revisions per session.

## Notes Flow
- Notes can be edited in flashcards (inline input on card back) and now captured when adding/editing in the Library view.  
- Store:
  - `add(text, translation, note)` persists note alongside other fields.  
  - `updateNote(id, note)` hits `/api/notes`. Library invoke occurs only if note changed to minimize requests.  
- API: `/api/notes` is PUT-only, ensures `note` column exists.

## Backend/API Overview (`api/*.js`)
| Route | Methods | Responsibilities |
| --- | --- | --- |
| `/api/sentences` | GET/POST/PUT/DELETE | Entire CRUD, also ensures schema columns exist. Returns camelCase fields expected by store. |
| `/api/learned` | PUT | Stamps `learned_at = NOW()` for a sentence. |
| `/api/starred` | PUT | Toggles `starred` boolean. |
| `/api/notes` | PUT | Updates `note` text (empty string fallback). |

All handlers rely on `process.env.DATABASE_URL` (Neon-compatible) and run schema `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` guards on cold start for resilience.

## Data Model (`schema.sql`)
Key table: `sentences` with columns  
`id SERIAL`, `text`, `translation`, `raw_text`, `raw_translation`, timestamps (`created_at`, `learned_at`), `starred BOOLEAN`, `note TEXT`.  
Indexes are implicit from primary key; consider adding indexes on `learned_at` or `starred` if future performance issues surface.

## Development Workflow
1. `npm install` then `npm run dev` for Vite dev server.  
2. API routes live under `/api/*` (Vercel/Netlify-style). For local Postgres, set `DATABASE_URL` before running dev server.  
3. No automated tests currently; manual verification typically involves:  
   - Create sentence(s) via manual form & quick add.  
   - Start flashcard sessions (new + revision) to ensure ordering & note display.  
   - Toggle star, mark learned, add/edit note to verify API round trips.

## Gotchas & Tips
- **HTML content:** Sentences use lightweight markup conversion in the store (`formatText`/`stripLinks`). Preserve this when adding new ingestion paths.  
- **Notes trimming:** Store trims note input before persisting; front-end uses `?.trim()` to avoid `null`.  
- **Infinite scroll:** Library view listens on `window` scroll; remember to detach listeners on cleanup (already handled).  
- **Swipe logic:** `useSwipe` plus manual `handleSwipe` ensures both gestures and buttons behave. Be careful when modifying as card animations rely on CSS classes (`swipeClass`, `incomingClass`).  
- **Revision tracking:** `revised` Set resets when starting a new session; do not mutate sentences directly—always go through Pinia actions to keep reactivity.

## Extending The App
- **Import/export:** Consider building CSV/JSON importers using existing store methods.  
- **User accounts:** Current schema is single-user; multi-user support would require user scoping on every API route.  
- **Testing:** Recommend introducing component tests (Vitest + Vue Testing Library) for form behavior, and unit tests for `buildRevisionSession`.

## Contact Points
- Primary components: `src/views/Library.vue`, `src/views/Flashcards.vue`.  
- Store and API contract: `src/stores/sentences.js` ↔ `api/*.js`.  
- Global styles/tailwind config: `tailwind.config.js`, `src/assets` (if added later).  
- Deployment: Align with Vercel (due to serverless route structure and Neon DB expectation).

Use this file as the go-to reference before making structural changes—understanding the existing workflows (library, revision, notes) prevents regressions in the learning UX.
