# KwartoKwarta — Rebuild Guide

A complete blueprint to recreate KwartoKwarta from scratch. Written after a production
debugging session, so the **Gotchas** sections below are the most important part — they
encode the exact mistakes that caused "infinite loading" and `auth/invalid-credential` in
production. Read **§9 (Production Config)** and **§10 (Lessons Learned)** before deploying.

---

## 1. What it is

A shared-expense tracker for boarding-house roommates ("boardmates"). Users create or join a
**house** via a 6-char invite code, log **expenses** with splits, see **balances**, settle
**debts**, track a monthly **budget** and **recurring bills**, scan receipts with AI, and
export reports. Optional **premium** tier gates some features.

---

## 2. Tech Stack

| Concern                    | Choice                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Framework                  | **Next.js 16** (App Router, Turbopack) — ⚠️ APIs differ from older Next; read `node_modules/next/dist/docs/` |
| Language                   | TypeScript 5, React 19                                                                                       |
| Styling                    | Tailwind CSS v4 (`@tailwindcss/postcss`), `tw-animate-css`                                                   |
| UI components              | shadcn-style components on `@base-ui/react`, `class-variance-authority`, `tailwind-merge`, `clsx`            |
| Icons                      | `lucide-react`                                                                                               |
| Animation                  | `framer-motion`                                                                                              |
| Forms                      | `react-hook-form` + `@hookform/resolvers` + `zod`                                                            |
| Toasts                     | `sonner`                                                                                                     |
| Auth + DB (client)         | `firebase` (Auth + Firestore)                                                                                |
| Server / privileged writes | `firebase-admin` (in Next API routes)                                                                        |
| AI receipt scan            | `@google/genai` (Gemini, server-only)                                                                        |
| Dates                      | `date-fns`                                                                                                   |
| QR (invite)                | `qrcode.react`                                                                                               |
| Hosting                    | **Vercel** (Next.js server runtime + API routes). Firebase used only for Auth + Firestore.                   |

> Note: this is a server app (API routes, dynamic rendering). It **cannot** run on plain
> static Firebase Hosting. Deploy the Next app to Vercel (or another Node host); use Firebase
> purely as a backend service.

---

## 3. Architecture (the important pattern)

**Reads** happen client-side via Firestore realtime listeners (`onSnapshot`).
**All writes** happen server-side through Next API routes using the Admin SDK. The client
**never writes** to Firestore directly — security rules enforce this (`allow write: if false`).

```
Browser (client SDK)                Next API routes (Admin SDK)         Firestore
─────────────────────               ───────────────────────────         ─────────
Auth (Google / email)  ──────────►  verifyIdToken(Bearer token)
onSnapshot reads  ◄──────────────────────────────────────────────────►  read (rules: members only)
                                    create/join/leave house        ───►  write (privileged)
                                    add/edit expense, settle, etc. ───►  write (privileged)
```

Why: keeps all mutation logic + validation server-side, lets rules be read-only for clients,
and avoids trusting the client for balance math.

---

## 4. Firestore Data Model

```
/users/{uid}
  displayName: string
  email: string
  photoURL: string | null
  houseId: string | null         // current active house
  premiumUntil: { seconds }|null // optional
  createdAt: Timestamp

/houses/{houseId}
  name: string
  inviteCode: string             // 6-char A–Z0–9, unique
  createdBy: string              // uid
  createdAt: Timestamp
  memberCount: number            // denormalized
  monthlyBudget?: number
  premiumUntil?: { seconds }|null

/houses/{houseId}/members/{uid}
  uid, displayName, email, photoURL
  joinedAt: Timestamp
  totalPaid: number              // running sum, updated on each expense write
  totalOwed: number              // running sum
  balance: number                // totalPaid - totalOwed (positive = owed money back)

/houses/{houseId}/expenses/{expenseId}
  description, amount: number
  paidBy: string (uid), paidByName: string
  splitType: 'equal' | 'custom'
  splits: Record<uid, number>    // what each member owes for this expense
  category: 'electric'|'water'|'internet'|'grocery'|'rent'|'cleaning'|'other'
  date: Timestamp, createdAt: Timestamp
  settled: boolean

/houses/{houseId}/settlements/{settlementId}
  from: string(uid), fromName, to: string(uid), toName, amount: number
  createdAt: Timestamp

/houses/{houseId}/recurring_bills/{billId}
  (recurring bill fields — amount, label, cadence, splits, etc.)
```

Balances are denormalized onto member docs and updated transactionally on every expense/
settlement write. `simplifyDebts(members)` computes suggested transfers client-side.

---

## 5. Firestore Security Rules

`firestore.rules` — clients read only what they're a member of; **all writes are server-only**.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuth() { return request.auth != null; }
    function isHouseMember(houseId) {
      return isAuth() &&
        exists(/databases/$(database)/documents/houses/$(houseId)/members/$(request.auth.uid));
    }

    match /users/{uid} {
      allow read: if isAuth();
      allow write: if isAuth() && request.auth.uid == uid;
    }

    match /houses/{houseId} {
      allow read: if isAuth();          // any signed-in user (invite-code lookup)
      allow write: if false;            // server-only (Admin SDK)

      match /members/{uid}        { allow read: if isHouseMember(houseId); allow write: if false; }
      match /expenses/{expenseId} { allow read: if isHouseMember(houseId); allow write: if false; }
      match /settlements/{sId}    { allow read: if isHouseMember(houseId); allow write: if false; }
      match /recurring_bills/{bId}{ allow read: if isHouseMember(houseId); allow write: if false; }
    }
  }
}
```

Deploy rules: `firebase deploy --only firestore:rules`.

---

## 6. Project Structure

```
app/
  layout.tsx                 # root layout, wraps <AuthProvider>, <Toaster>
  page.tsx                   # onboarding: create / join house
  auth/page.tsx              # sign in / sign up (Google + email)
  house/page.tsx             # main dashboard
  house/settings/page.tsx    # house settings (budget, members, leave)
  house/loading.tsx, error.tsx
  api/
    houses/route.ts          # POST create house
    houses/join/route.ts     # POST join by invite code
    houses/leave/route.ts    # POST leave house
    houses/budget/route.ts   # POST set monthly budget
    houses/recurring-bills/route.ts  # POST add / DELETE remove
    expenses/route.ts        # POST add expense (updates balances in a txn)
    expenses/scan-receipt/route.ts   # POST Gemini receipt OCR
    settlements/route.ts     # POST record settlement
    premium/subscribe/route.ts       # POST mock subscribe

lib/
  firebase/client.ts         # client SDK init (Auth + Firestore w/ long-polling)
  firebase/admin.ts          # Admin SDK init from service-account env vars
  firebase/schema.ts         # data-model doc + ExpenseCategory/SplitType types
  auth/AuthProvider.tsx      # React context: user, loading, sign-in/up/out, upsertUserDoc
  api.ts                     # typed fetch wrapper, attaches Bearer ID token
  hooks/ useHouse, useMembers, useExpenses, useSettlements,
         useRecurringBills, useOnlineStatus
  schemas/ house, expense, settlement, recurringBill (zod)
  utils/ balances (simplifyDebts), dates, format (formatPHP), premium
  categories.tsx             # category icons + colors

components/
  AddExpenseSheet, BudgetCard, RecurringBillsCard, ReportExportButton,
  MonthlyOverview, ExpenseCalendar, SettlementHistory, ui/* (shadcn-style)
```

---

## 7. Environment Variables

Create `.env.local` (gitignored). **Two groups** — public client config and server-only secrets.

```bash
# --- Firebase client (NEXT_PUBLIC_* are inlined into the browser bundle at BUILD time) ---
# Safe to expose: protected by Security Rules + API-key referrer restrictions (see §9).
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...                       # NO quotes
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<project>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<project>.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abc...

# --- Server-only (NEVER prefix with NEXT_PUBLIC; never import in client components) ---
GEMINI_API_KEY=...
FIREBASE_ADMIN_PROJECT_ID=<project>
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxx@<project>.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

Get client values: Firebase Console → Project Settings → General → Your apps → Web app → Config
(or `firebase apps:sdkconfig web`).
Get Admin values: Firebase Console → Project Settings → Service accounts → Generate new private key.

**Quoting rules (these bite in production):**

- Simple values: **no quotes** in `.env.local`, and **no quotes** in the Vercel dashboard
  (Vercel stores the value literally — quotes become part of the value → invalid apiKey).
- `FIREBASE_ADMIN_PRIVATE_KEY`: in `.env.local` wrap in double quotes to preserve `\n`.
  `admin.ts` normalizes with `privateKey.replace(/\\n/g, '\n')`. In Vercel, paste the key and
  keep the `\n` literals; the normalize step handles both literal `\n` and real newlines.

---

## 8. Build From Scratch — Step by Step

1. **Firebase project**
   - Create project in Firebase Console.
   - **Authentication →** enable **Google** and **Email/Password** providers.
   - **Firestore Database →** create in **Native mode** (NOT Datastore mode). Pick a region.
   - Register a **Web app**, copy the config.
   - **Service accounts →** generate a private key for the Admin SDK.
2. **Scaffold app:** `npx create-next-app@latest` (TS, App Router, Tailwind). Confirm Next 16.
3. **Install deps** (see §2).
4. **Firebase client** (`lib/firebase/client.ts`): init Auth + Firestore. Use
   `initializeFirestore` with **`experimentalForceLongPolling: true`** and
   `persistentLocalCache({ tabManager: persistentSingleTabManager() })`. (See §10 for why.)
5. **Firebase admin** (`lib/firebase/admin.ts`): init from the three `FIREBASE_ADMIN_*` env vars;
   normalize the private key's `\n`.
6. **AuthProvider**: `onAuthStateChanged` → `{ user, loading }`; `upsertUserDoc` on sign-in
   (creates `/users/{uid}` with `houseId: null` if missing; never overwrites `houseId`/`createdAt`).
7. **API routes**: each verifies `Authorization: Bearer <idToken>` via `adminAuth.verifyIdToken`,
   validates body with zod, mutates Firestore in a **transaction**, returns the new id(s).
   - `POST /api/houses` creates house + creator member + sets `users/{uid}.houseId` atomically,
     and **returns `{ houseId, inviteCode }`**.
8. **Client API helper** (`lib/api.ts`): attaches the ID token, throws on non-2xx.
9. **Hooks**: thin `onSnapshot` wrappers returning `{ data, loading, error, notFound }`.
10. **Pages**: onboarding → dashboard → settings (see §6).
11. **Rules**: write `firestore.rules` (§5), deploy.
12. **Deploy** to Vercel; complete the **§9 checklist**.

---

## 9. Production Config Checklist (DO NOT SKIP)

The original app worked on `localhost` but broke in production with infinite "Loading
dashboard…" and `auth/invalid-credential`. Root cause was browser **API-key restrictions** +
domain authorization — pure configuration. Verify ALL of these before calling it done:

- [ ] **API key referrers** — Google Cloud Console → APIs & Services → Credentials → the
      Browser key → **Application restrictions**. If using "HTTP referrers", the allowlist
      **must include the production domain** (`https://<app>.vercel.app/*`, custom domain,
      and `http://localhost:3000/*`). A missing prod domain blocks `firestore.googleapis.com`
      and `identitytoolkit.googleapis.com` from the browser → dashboard hangs + email auth
      fails — while Google sign-in (via the `firebaseapp.com` authDomain) still works,
      masking the problem.
- [ ] **API restrictions** on that key allow **Cloud Firestore API**, **Identity Toolkit API**,
      **Token Service API**.
- [ ] **Authorized domains** — Firebase Console → Authentication → Settings → add the prod domain.
- [ ] **Vercel env vars** — all six `NEXT_PUBLIC_FIREBASE_*` set for the **Production**
      environment, values match the canonical config, **no surrounding quotes**, no trailing
      spaces. Plus the four server-only vars.
- [ ] **Redeploy after any env change** (`NEXT_PUBLIC_*` is build-time inlined). Prefer
      "Redeploy without build cache".
- [ ] **Firestore exists** in Native mode and **rules are deployed**.
- [ ] **No stale service worker** caching Firestore (see §10).

**Fast confirmation:** set the API key's Application restrictions to **None**, wait ~5 min,
hard-refresh prod. If it works, the restriction was the cause — then re-tighten to HTTP
referrers including the prod domain.

---

## 10. Lessons Learned / Gotchas (read before coding)

These are real bugs that happened. Design around them from day one.

### 10.1 Don't let one failure mode become an infinite spinner

Every loading gate must have an **error/timeout branch**. The original dashboard gated on
`!house` with no error path: any failed/slow read → spinner forever. Rules to follow:

- Each `onSnapshot` hook returns an **`error`** state and a **timeout** (e.g. 10s) that flips
  `loading=false` AND sets `error=true` when nothing arrived.
- The UI renders a real **"Couldn't load — Retry / Sign out"** screen when `error && !data`,
  never a bare spinner.
- Only treat a doc as **notFound** when `!snapshot.metadata.fromCache` (a cache-miss for a
  freshly created doc is NOT a real 404 — acting on it can wrongly bounce/`leaveHouse` the user).

### 10.2 Don't depend on a realtime listener to discover just-created data

Server-written docs (Admin SDK) are **not** in the client's local cache, so the first render
must wait for the realtime **Listen stream** — which is exactly what stalls behind CDNs/
proxies/PWA. Fix: the create/join API **returns the `houseId`**; persist it (e.g. localStorage)
**before navigating**, so the dashboard seeds its active house from the HTTPS response instead
of waiting on `onSnapshot`. Use the listener only for live updates.

### 10.3 Firestore transport for proxies / PWA / mobile

Use **`experimentalForceLongPolling: true`**. `experimentalAutoDetectLongPolling`'s detection
phase can hang on restricted networks (corporate proxies, CDNs, iOS PWA standalone), producing
the same infinite-load symptom. Forced long-polling adds minor latency but connects reliably.

### 10.4 Persistence tab manager

Use **`persistentSingleTabManager`**, not `persistentMultipleTabManager`. The multi-tab variant
needs SharedWorker/BroadcastChannel, which iOS PWA standalone restricts — that can block
Firestore init entirely and silence all listeners.

### 10.5 PWA / service worker can break Firestore

A `next-pwa`/Workbox service worker wrapped cross-origin requests (including Firestore's Listen
channel) in a NetworkFirst+timeout strategy → silently broke realtime listeners in production.
Also, `next-pwa` hooks webpack, which Next 16 **Turbopack** build does not run, so it produced
no SW and left a stale, Firestore-breaking one. **Decisions:** no PWA initially; if you add one,
use a Turbopack-compatible lib (e.g. Serwist) and **exclude `*.googleapis.com`** from caching.
Keep a kill-switch `public/sw.js` that unregisters itself + clears caches to evict old SWs.

### 10.6 Don't mask missing config with placeholders

Avoid `apiKey: process.env.X || 'placeholder'` fallbacks that let a misconfigured deploy boot
with junk config and fail silently later. Prefer throwing a clear startup error when required
`NEXT_PUBLIC_FIREBASE_*` are missing, so a bad deploy breaks **loudly and obviously**.

### 10.7 Friendly auth errors

Map Firebase codes in the auth UI. `auth/invalid-credential` = wrong email/password on sign-in
(also surfaces from a blocked/invalid API key) → show "Incorrect email or password" /
"Configuration error", not the raw `Firebase: Error (auth/invalid-credential)`.

### 10.8 Date inputs

`<input type="date">` needs `yyyy-MM-dd`; guard parsing/formatting so an empty/partial value
doesn't throw a `RangeError: Invalid time value`.

### 10.9 Next 16 specifics

APIs/conventions differ from older Next. Before writing framework code, check
`node_modules/next/dist/docs/`. Build uses Turbopack (`next.config.ts: { turbopack: {} }`).

---

## 11. Local Dev & Deploy

```bash
npm install
npm run dev        # http://localhost:3000

npm run build      # production build (Turbopack) — run before deploying
npm run lint

firebase deploy --only firestore:rules   # push security rules
```

Deploy: push to the Git branch connected to Vercel; Vercel builds & hosts. Set all env vars in
Vercel project settings first (§7, §9). After env changes, redeploy.

---

## 12. Feature Checklist (parity with the original)

- [ ] Google + email/password auth; user doc upsert on sign-in
- [ ] Onboarding: create house / join by 6-char invite code (with QR)
- [ ] Dashboard: monthly overview, members + balances, expense feed, calendar
- [ ] Add expense (equal/custom split, category, date) — balances updated in a txn
- [ ] Settle debts: simplified suggested transfers + settlement history
- [ ] Monthly budget card; recurring bills
- [ ] Receipt scan (Gemini) → prefill expense
- [ ] Report export (PDF/CSV)
- [ ] Premium tier gating (subscribe + feature checks)
- [ ] Offline handling: online-status hook, offline screens, error/retry states
- [ ] Leave house / house settings

```

```
