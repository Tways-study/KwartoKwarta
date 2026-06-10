# KwartoKwarta

A shared-expense ledger for boarding-house boardmates. Create or join a **house**
with a 6-char invite code, log **expenses** with equal/custom splits, see live
**balances**, and **settle** debts with the fewest payments. Built from
[`REBUILD_GUIDE.md`](./REBUILD_GUIDE.md).

**Stack:** Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind
v4 · Base UI · Firebase (Auth + Firestore) · Firebase Admin · Vercel-ready.

**Architecture:** reads are client-side Firestore `onSnapshot` listeners; **all
writes** go through Next API routes using the Admin SDK (`verifyIdToken` → zod →
Firestore transaction). The client never writes directly — security rules enforce
`allow write: if false`.

## This build (Core MVP)

Included: Google + email/password auth, create/join house (with QR invite),
dashboard (monthly overview, members + balances, expense feed, spend calendar),
add expense (equal/custom split, category, date), settle up (simplified transfers
+ history), leave house, offline/error/retry handling.

Deferred for a later pass: Gemini receipt scan, premium gating, recurring bills,
monthly budget, and report export (PDF/CSV).

## Setup

1. **Firebase project** — in the [console](https://console.firebase.google.com):
   - Authentication → enable **Google** and **Email/Password**.
   - Firestore Database → create in **Native mode**.
   - Register a **Web app**, copy its config.
   - Project Settings → Service accounts → **Generate new private key** (Admin SDK).
2. **Env vars** — `cp .env.local.example .env.local` and fill in. Mind the
   [quoting rules](./REBUILD_GUIDE.md#7-environment-variables): no quotes on the
   `NEXT_PUBLIC_*` values; wrap `FIREBASE_ADMIN_PRIVATE_KEY` in double quotes to
   preserve `\n`.
3. **Install & run:**

   ```bash
   npm install
   npm run dev        # http://localhost:3000
   npm run build      # production build (Turbopack)
   npm run lint
   ```

4. **Deploy rules:** `firebase deploy --only firestore:rules`

> Without `.env.local`, `npm run build` and `npm run lint` still pass (Firebase
> initializes in the browser only). The app needs real credentials to run.

## Production checklist (do not skip — see REBUILD_GUIDE §9)

The original app worked on localhost but broke in production with infinite
"Loading…" and `auth/invalid-credential`. Root cause was **API-key restrictions
+ domain authorization** — pure config. Before calling a deploy done:

- [ ] **API key referrers** (Google Cloud → Credentials → Browser key) include the
      prod domain (`https://<app>.vercel.app/*`), custom domain, and
      `http://localhost:3000/*`.
- [ ] **API restrictions** allow Cloud Firestore API, Identity Toolkit API, Token
      Service API.
- [ ] **Authorized domains** (Firebase → Auth → Settings) include the prod domain.
- [ ] All six `NEXT_PUBLIC_FIREBASE_*` set in Vercel **Production**, no quotes/spaces.
- [ ] **Redeploy after any env change** (`NEXT_PUBLIC_*` is build-time inlined);
      prefer "Redeploy without build cache".
- [ ] Firestore exists in Native mode and **rules are deployed**.

## Manual smoke test (once credentials exist)

Sign in → create a house → copy the invite code → (second account) join with the
code → add an expense split equally → confirm both balances update live → open
**Settle up** and record the suggested payment → confirm balances zero out and the
settlement appears in history.

## Key files

- `lib/firebase/client.ts` — browser-only init, forced long-polling +
  single-tab persistence, throw-on-missing-config.
- `lib/firebase/admin.ts` — lazy Admin SDK init.
- `lib/hooks/firestore.ts` — listener hooks with 10s timeout + `fromCache`
  not-found guard (§10.1).
- `lib/hooks/useActiveHouse.ts` — seeds the active house from localStorage before
  navigation (§10.2).
- `app/api/houses/route.ts` — create house, returns `{ houseId, inviteCode }`.
- `firestore.rules` — member-only reads, server-only writes.
