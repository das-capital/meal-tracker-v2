# Meal Tracker — AI Context

> Read this file at the start of every session to get full project context.
> Update the "Progress & Next Steps" section at the end of every session.

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
| Cloud DB + Auth | Firebase (Firestore + Google Auth) |
| AI | Google Gemini 2.5 Flash (REST API, user provides their own key) |
| PWA | vite-plugin-pwa |

---

## Project Structure

```
src/
  lib/
    db.ts          — Routing layer: dispatches to IDB or Firestore based on auth state
    db.idb.ts      — Full IndexedDB implementation (all interfaces + CRUD)
    db.firestore.ts — Full Firestore implementation (same function signatures, uid as first arg)
    firebase.ts    — Firebase app, auth, and Firestore instances
    merge.ts       — One-time IDB → Firestore migration on first sign-in
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
    AuthButton.tsx        — Google sign-in/out button with avatar
  contexts/
    AuthContext.tsx — Auth state, triggers merge on first sign-in, sets DB routing backend
  hooks/
    useMeals.ts    — Hook wrapping meal DB operations
App.tsx            — Router + layout shell (shows loading screen while auth resolves)
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

## Database Routing Layer (db.ts)

`db.ts` is no longer a direct IDB implementation — it is a transparent routing layer. All existing consumers (`import from '../lib/db'`) are unchanged.

- **Guest mode** (not signed in): all calls go to IndexedDB via `db.idb.ts`
- **Signed in**: all calls go to Firestore via `db.firestore.ts`
- Routing is controlled by a module-level `_uid` variable set by `AuthContext` via `setCurrentUser(uid)`

**Firestore data structure:**
```
/users/{uid}/meals/{numericId}
/users/{uid}/favourites/{numericId}
/users/{uid}/weights/{numericId}
/users/{uid}/recipes/{numericId}
/users/{uid}/settings/data       ← single merged document for all settings
```

**IDs in Firestore:** Generated as `Date.now() + random(0-999)` — stored as a numeric field `id` in each document, and used as the Firestore document path (`String(id)`). This keeps IDs compatible with the existing `number` type used throughout the codebase.

**Merge on first sign-in:** `merge.ts` checks if Firestore already has meals for the user. If not, it copies all IDB data to Firestore. This prevents duplicate data when signing in from a second device.

**Reset behaviour:** When signed in, `resetAllData()` clears both Firestore and IDB.

---

## Key Interfaces (db.idb.ts)

```typescript
Meal            — logged meal with parsed macros array + totalCalories
Favourite       — saved meal shortcut (name + parsed macros)
WeightEntry     — date + weight (kg)
UserSettings    — apiKey, daily goals, portion unit sizes, profile (age/weight/height)
RecipeIngredient — name, weight(g), calories, protein, fat, carbs, fiber
Recipe          — name, ingredients[], totalWeight, total macros, createdAt
```

All interfaces and `DEFAULT_SETTINGS` are defined in `db.idb.ts` and re-exported from `db.ts`.

---

## Auth (AuthContext.tsx)

- Wraps the app in `main.tsx` via `<AuthProvider>`
- Listens to `onAuthStateChanged` — calls `setCurrentUser(uid)` before setting React state, so the routing layer is ready before any component re-renders
- On first sign-in: triggers `mergeLocalDataToFirestore(uid)`
- Provides: `user`, `loading`, `signIn()`, `signOut()`
- `App.tsx` shows a loading screen while `loading = true` — prevents any DB calls before auth resolves

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
- **Auth routing:** `db.ts` exports `setCurrentUser(uid | null)` — call this before updating React state when auth changes, so all subsequent DB calls use the correct backend immediately.
- **Firebase env vars:** stored in `.env.local` (gitignored), prefixed with `VITE_FIREBASE_`. Must also be added to Vercel project settings for production.

---

## Features Built (as of Mar 2026)

- [x] Chat-based meal logging with AI parsing
- [x] Voice input (Web Speech API)
- [x] Today summary with macro rings / progress
- [x] Meal history by date
- [x] Favourite meals (save, log, edit name, delete)
- [x] Weight logging (chat + stored in DB + updates profile)
- [x] Height & age logging via chat
- [x] User profile page
- [x] Settings (API key, daily goals, portion unit sizes)
- [x] Meal suggestion after logging
- [x] Smart weekly observations
- [x] Badges / achievements (BadgeBar)
- [x] Edit logged meals (EditMealModal)
- [x] PWA (installable, service worker)
- [x] **Recipes feature** — create recipes from ingredients (AI parses macros), log a specific weight of a recipe with proportional macro calculation, edit and delete recipes
- [x] **Production Deployment** — Hosted on Vercel (`meal-tracker-v2-lzvh.vercel.app`), installed as a mobile PWA on Android
- [x] **Firebase Auth + Cloud Sync** — Google Sign-In via popup, Firestore cloud storage, transparent routing layer in `db.ts`, one-time IDB→Firestore merge on first sign-in, guest mode (IDB) still works when not signed in
- [x] **Multi-provider LLM** — Gemini / OpenAI / Groq selector in Settings; unified `callLLM` dispatcher in `ai-parser.ts`; `settings.provider` field (default `'gemini'`); provider-specific invalid-key error messages
- [x] **Bundled food DB** — ~100 Indian + general foods in `src/lib/food-db.ts` (Fuse.js, threshold 0.25); DB hits use a short LLM call for quantity parsing only (~70% token saving); works without API key for explicit quantities
- [x] **Offline quantity parsing** — no API key needed for `"2 roti"`, `"150gm aloo gobhi"`, `"1 bowl dal"`, `"100g rice"` etc.; `defaultServing` per food enables piece-based counting; `gm`/`gms` unit supported
- [x] **Smart fuzzy matching** — input normalisation (`aa→a`, double consonants, `ee→i` at word end) + quantity/verb prefix stripping before Fuse search; handles `aaloo gobhi`, `channa dal`, `gobhee`, `daal` etc.
- [x] **Explicit value override** — PRIORITY RULE in system prompt: user-stated nutritional values (`"it had 70 cal, 2g protein"`) are always used as-is
- [x] **Image label scanning** — Camera button → compress to 1024px JPEG → `processLabelImage` → vision API reads label + calculates proportional macros; image preview in chat bubble; Groq vision fallback error
- [x] **API key onboarding** — Banner for new users (shown when `!settings.apiKey`) with guided Gemini/OpenAI/Groq setup inline
- [x] **Contextual error messages** — three distinct no-key errors (`add_api_key`, `qty_needs_key`, `invalid_key_{provider}`), all with "Go to Settings →" link
- [x] **Barcode scanning** — ZXing real-time scanner (`@zxing/browser`), Open Food Facts lookup (no API key needed), proportional macro calculation by weight typed after scan

---

## Food DB — Offline Quantity Patterns Supported

| Pattern | Example |
|---|---|
| Count first | `2 roti`, `3 idli` |
| Count last | `banana 2`, `roti 3` |
| Grams | `100g rice`, `150gm aloo gobhi`, `150 grams dal` |
| Millilitres | `250ml milk`, `200ml lassi` |
| Bowl | `1 bowl dal`, `2 bowls curd` |
| Tablespoon | `2 tbsp ghee` |
| Teaspoon | `1 tsp ghee` |

Anything vague (e.g. `"a handful of almonds"`) or not in DB → needs API key.

---

## Deployment Gotchas & Lessons Learned

Hard-won lessons from production debugging — read before touching `api/` or deployment config.

### 1. `firebase-admin` uses `db.runTransaction()`, NOT a standalone import
The client SDK exports `runTransaction(db, fn)` as a standalone function. The Admin SDK does NOT — it's a method on the Firestore instance.
```ts
// WRONG (causes 500 crash at function startup — bad import):
import { runTransaction } from 'firebase-admin/firestore';
await runTransaction(db, async (t) => { ... });

// CORRECT:
await db.runTransaction(async (t) => { ... });
```

### 2. Google Gemini returns 400 for invalid API keys (not 401)
Unlike most APIs, Google's Gemini API returns **400 Bad Request** (not 401) when the API key is invalid or doesn't have access to a model. Handle it:
```ts
if (response.status === 400 || response.status === 401 || response.status === 403)
    throw new Error('api_auth_error');
```

### 3. Server vs client use different Gemini models
- **Server** (`api/ai.ts`): uses `gemini-2.5-flash` with the Vercel `GEMINI_API_KEY` — premium model, server key has access
- **Client** (`ai-parser.ts`): uses `gemini-2.0-flash` with the user's personal key — stable/GA model, works on all free-tier keys
- Do NOT change both to the same model without verifying the key tier

### 4. Tailwind opacity modifiers fail with hex CSS variables
`bg-background/50` generates `rgb(var(--color-bg) / 0.5)` which fails when the variable is a hex string like `#09090b`. Use a class without an opacity modifier, or define variables as RGB channels.
```ts
// WRONG: bg-background/50  (renders transparent — invisible text)
// CORRECT: bg-surface2      (direct hex variable, no opacity math)
```

### 5. Missing `color-scheme` causes invisible form text
Without `color-scheme: dark` on the dark theme, browsers use system defaults for native form controls (inputs, textareas). If the OS is in light mode, input text renders black on our dark backgrounds — invisible. Fix in `index.css`:
```css
:root { color-scheme: light; }
[data-theme="dark"] { color-scheme: dark; }
```

### 6. CORS preflight must include `Access-Control-Allow-Headers`
The API handler must explicitly allow the `Authorization` header or the browser blocks the request:
```ts
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
```

### 7. PWA service worker caches aggressively
After a new Vercel deployment, the installed PWA may still run the old JS bundle. Users need a hard refresh (`Ctrl+Shift+R`) or to open in an incognito window to get the new version. This can make bugs appear to persist after they're fixed.

### 8. Adding Vercel env vars triggers a redeployment
When you add/change env vars in Vercel Settings, Vercel redeploys using the **latest committed code**. If there's a bug in the latest commit, the new deployment will have that bug. Always ensure the latest commit is clean before adding env vars.

### 9. Vercel env var naming for Vite vs Node
- `VITE_*` prefix: exposed to the browser bundle (Vite replaces at build time)
- No prefix: server-only (Vercel serverless functions via `process.env`)
- Same value, two names: `VITE_ADMIN_UID` (client) and `ADMIN_UID` (server)

### 10. `100vh` causes layout shift on Android Chrome (top bar hidden)
`100vh` on Android Chrome = max viewport height (address bar hidden). When the address bar is visible the layout overflows, Chrome auto-scrolls to show the bottom content, pushing the top bar above the viewport — unreachable.
```tsx
// WRONG: min-h-screen / h-[calc(100vh-Xrem)] — breaks when address bar is shown
// CORRECT: h-dvh on root layout; h-full on page containers (inherit from flex-1 parent)
```
`dvh` (dynamic viewport height) adapts to the actual visible area including/excluding the browser chrome.

---

## Next Steps / Backlog

> Update this section at the end of each session.

### Backlog
- [ ] **Image input** — Remove `capture="environment"` from the camera `<input>` so Android shows a picker (camera OR gallery). Rename button/option from "Scan a label" → "Image". One-line change in `MealInput.tsx`.
- [ ] Add data visualization (e.g., 7-day calorie trend chart on Home or History)
- [ ] Add "Quick Add" buttons for common items (water, coffee)
- [ ] Implement automated weekly summary reports

---

## How to Run

```bash
cd "/c/Users/Pc/Documents/Vibe coding/meal-tracker"
npm run dev       # dev server
npm run build     # production build
```

The user provides their own Gemini API key in the Settings page of the app.

## Firebase Project
- **Project:** Neil - Tracker (`meal-tracker-87910`)
- **Firestore rules:** users can only read/write their own `/users/{uid}/` subtree
- **Authorized domains:** `meal-tracker-v2-lzvh.vercel.app`, `localhost`
- **Env vars:** in `.env.local` (gitignored) — must be duplicated in Vercel project settings
