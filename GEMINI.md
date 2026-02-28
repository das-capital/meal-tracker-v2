# Meal Tracker — AI Context

> This file is identical to CLAUDE.md. Keep them in sync.
> Claude Code reads CLAUDE.md automatically on session start.
> For Gemini CLI: you may need to say "read GEMINI.md for project context" at the start of a session.
> Update the "Progress & Next Steps" section at the end of every session (in both files).

---

## What This App Is

A personal mobile-first PWA for tracking daily food intake, weight, and nutrition macros. The user interacts primarily through a chat interface — they type (or speak) what they ate and an AI (Gemini 2.5 Flash) parses it and logs the macros. The app is built for Indian + general food tracking.

**Deployed as a PWA** — runs in the browser, installable on phone, works offline for UI (API calls need internet).

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS v3 |
| Animation | Framer Motion |
| Icons | Lucide React |
| Routing | React Router v7 |
| Local DB | IndexedDB via `idb` library |
| AI | Google Gemini 2.5 Flash (REST API, user provides their own key) |
| PWA | vite-plugin-pwa |

---

## Project Structure

```
src/
  lib/
    db.ts          — All IndexedDB logic (stores, interfaces, CRUD)
    ai-parser.ts   — All Gemini API calls and response parsing
  pages/
    MealInput.tsx  — Main chat input page (default route "/")
    Home.tsx       — Today's summary page ("/today")
    History.tsx    — Past meals history ("/history")
    Profile.tsx    — User profile page ("/profile")
    Settings.tsx   — Settings page ("/settings")
  components/
    BottomNav.tsx         — Tab bar navigation
    BadgeBar.tsx          — Achievement badges strip at top
    FavouritesPanel.tsx   — Slide-up panel for saved favourite meals
    RecipesPanel.tsx      — Slide-up panel for custom recipes
    EditMealModal.tsx     — Modal for editing a logged meal
  hooks/
    useMeals.ts    — Hook wrapping meal DB operations
App.tsx            — Router + layout shell
```

---

## Database (IndexedDB)

**DB name:** `meal-tracker-db`
**Current version:** `4` — bump this number whenever you add/change a store

| Store | Key | Indexes | Purpose |
|---|---|---|---|
| `meals` | id (auto) | by-date | Logged meals |
| `settings` | key | — | User settings (key/value pairs) |
| `favourites` | id (auto) | by-name (unique) | Saved favourite meals |
| `weights` | id (auto) | by-date | Weight log entries |
| `recipes` | id (auto) | by-name (unique) | Custom recipes with ingredients |

**Critical rule:** Always add `if (!db.objectStoreNames.contains(...))` guard when creating stores in the `upgrade` callback — this is required because the upgrade runs for ALL version increments, not just the latest.

---

## Key Interfaces (db.ts)

```typescript
Meal            — logged meal with parsed macros array + totalCalories
Favourite       — saved meal shortcut (name + parsed macros)
WeightEntry     — date + weight (kg)
UserSettings    — apiKey, daily goals, portion unit sizes, profile (age/weight/height)
RecipeIngredient — name, weight(g), calories, protein, fat, carbs, fiber
Recipe          — name, ingredients[], totalWeight, total macros, createdAt
```

---

## AI Parser (ai-parser.ts)

All Gemini calls go through `callGemini(apiKey, prompt)` which hits:
`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`

**Exported functions:**
- `processInput(text)` — main chat handler, returns `AIResponse` union type
- `parseIngredients(text)` — extracts ingredient list with macros for recipe builder
- `getMealSuggestion()` — suggests a meal based on remaining macros
- `getSmartObservations()` — weekly pattern analysis

**AIResponse types** that `processInput` can return:
`meal` | `chat` | `favourite_save` | `favourite_log` | `weight` | `height` | `age` | `recipe_log` | `error`

The system prompt injects: today's meals, daily totals, goals, portion sizes, and saved recipe names so Gemini has full context.

---

## Key Patterns & Conventions

- **Slide-up panels** (FavouritesPanel, RecipesPanel): use `AnimatePresence` + `motion.div` with `y: '100%'` → `y: 0`, spring transition `damping: 25, stiffness: 300`, backdrop at `z-[60]`, panel at `z-[70]`, `max-h-[85vh]`, `pb-20` to clear the bottom nav.
- **Chat messages** in MealInput are persisted to `localStorage` keyed by today's date — cleared automatically on a new day.
- **Recipe logging from panel** uses a `CustomEvent('recipe-log')` dispatched on `window` — MealInput listens for it via `useEffect`.
- **Confetti** on meal log: `canvas-confetti` shooting from both sides.
- **Dark theme** throughout: `bg-zinc-900` base, `bg-zinc-800` cards, `border-white/5` or `border-white/10` borders, `text-zinc-200` primary text.

---

## Features Built (as of Feb 2026)

- [x] Chat-based meal logging with Gemini AI parsing
- [x] Voice input (Web Speech API)
- [x] Today summary with macro rings / progress
- [x] Meal history by date
- [x] Favourite meals (save, log, edit name, delete)
- [x] Weight logging (chat + stored in DB + updates profile)
- [x] Height & age logging via chat
- [x] User profile page
- [x] Settings (API key, daily goals, portion unit sizes)
- [x] Meal suggestion after logging (Gemini)
- [x] Smart weekly observations (Gemini)
- [x] Badges / achievements (BadgeBar)
- [x] Edit logged meals (EditMealModal)
- [x] PWA (installable, service worker)
- [x] **Recipes feature** — create recipes from ingredients (AI parses macros), log a specific weight of a recipe with proportional macro calculation, edit and delete recipes
- [x] **Production Deployment** — Hosted on Vercel, successfully installed as a mobile app on Vivo/Android.

---

## Next Steps / Backlog

> Update this section at the end of each session.

### 🔴 In Progress — Firebase Auth + Cloud Sync
Full plan is ready. Implementation not started yet.

**Goal:** Google Sign-In + Firestore cloud sync. Guest mode (IndexedDB) still works. On first sign-in, local data is merged into cloud. Data persists across devices and sessions.

**New files to create:**
- `src/lib/firebase.ts` — Firebase app init
- `src/lib/db.idb.ts` — Current db.ts logic moved here
- `src/lib/db.firestore.ts` — Firestore implementation of all CRUD functions
- `src/lib/merge.ts` — One-time local→cloud merge on first sign-in
- `src/contexts/AuthContext.tsx` — Auth state, triggers merge, switches backend
- `src/components/AuthButton.tsx` — Google sign-in/out button with avatar

**Files to modify:**
- `src/lib/db.ts` → becomes routing layer (dispatches to IDB or Firestore based on auth)
- `src/main.tsx` → wrap with `<AuthProvider>`
- `src/pages/Settings.tsx` → add Account section with `<AuthButton>`

**Key constraint:** All existing consumers (pages, components, hooks, ai-parser) keep their `import from '../lib/db'` unchanged — the routing layer is transparent.

**npm:** `npm install firebase` (only new dependency)

**Firebase console setup required first:** Enable Google auth, create Firestore DB, deploy security rules, add `.env.local` with config values.

### Backlog (after Firebase)
- [ ] Add data visualization (e.g., 7-day calorie trend chart on Home or History)
- [ ] Add "Quick Add" buttons for common items (water, coffee)
- [ ] Implement automated weekly summary reports via Gemini
- [ ] Improve AI error handling for very ambiguous food descriptions

---

## How to Run

```bash
cd "/c/Users/Pc/Documents/Vibe coding/meal-tracker"
npm run dev       # dev server
npm run build     # production build
```

The user provides their own Gemini API key in the Settings page of the app.
