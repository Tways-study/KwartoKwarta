# 🏠 KwartoKwarta

An elegant, real-time shared-expense ledger tailored for roommates and boardmates. Create or join a house via a 6-character room code, log expenses with custom splits, track live balances, and settle debts in the fewest possible transactions.

---

## ✨ Features

*   **🏠 Household Collaboration:** Create a virtual house or join an existing one using a unique 6-character invite code (with built-in QR code generator for easy boarding).
*   **💸 Smart Expense Splits:** Log house expenses with either equal splits or custom manual breakdowns. Assign specific categories like Rent, Grocery, Water, Electric, Internet, and Cleaning.
*   **📊 Real-time Dashboard:** Real-time synchronization of member contributions, total spend, recent feeds, and monthly spend calendars.
*   **🤝 Greedy Debt Simplification:** Built-in debt-simplification algorithm that matches the largest debtors against the largest creditors, ensuring everyone settles up with the absolute minimum number of transfers.
*   **🔌 Secure & Resilient Architecture:** Real-time data streams client-side, combined with strict transaction-safe write protection on the server.
*   **📱 Offline & Network Recovery:** Auto-detects offline status with warning banners and includes timeout guards to prevent infinite loading screens on poor networks.

---

## ⚡ Tech Stack

| Tier | Technologies Used |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| **Styling & UI** | Tailwind CSS v4, Base UI, Framer Motion, Lucide Icons, Sonner |
| **Database & Auth** | Firebase Client SDK (Authentication, real-time Firestore listeners) |
| **Server Operations** | Firebase Admin SDK (Next.js API Routes, transactions, token verification) |
| **Integrations** | `qrcode.react` (sharing rooms), `date-fns` (time tracking) |

---

## 🏗️ Architecture

KwartoKwarta uses a secure, decoupled hybrid database model to enforce data integrity and prevent fraudulent client writes:

1.  **Reads (Real-time):** The client web application establishes read-only Firestore listeners (`onSnapshot`) to immediately reflect changes in balances or expenses.
2.  **Writes (Privileged & Transactional):** The client **never** writes to the database directly. All mutations (creating rooms, logging expenses, recording settlements) go through Next.js API endpoints. The server verifies the user's ID token, validates the payloads using Zod, and executes Firestore transactions to guarantee that running balances remain accurate.

```
                  ┌──────────────────────────────────────────────┐
                  │                 Browser                      │
                  │  (Firebase Client SDK / Real-time Listeners) │
                  └──────┬──────────────────────────────▲────────┘
                         │                              │
                1. API Requests (Bearer Token)  2. Live Updates (onSnapshot)
                         │                              │
                         ▼                              │
                  ┌────────────────────────┐            │
                  │  Next.js API Routes    │            │
                  │  (Firebase Admin SDK)  │            │
                  └──────┬─────────────────┘            │
                         │                              │
             3. Transactional Write             │
                         │                              │
                         ▼                              │
                  ┌─────────────────────────────────────┴────────┐
                  │             Cloud Firestore                  │
                  │     (Rules: allow write: if false)           │
                  └──────────────────────────────────────────────┘
```

---

## 🗄️ Firestore Data Model

The Firestore database uses a structured set of root collections and subcollections to manage room scopes and memberships:

### Root Collections
*   `/users/{uid}`: Keeps track of user profiles and active room memberships (`houseId`).
*   `/houses/{houseId}`: Main house metadata (invite code, creator, and total member count).

### Subcollections under `/houses/{houseId}`
*   `/members/{uid}`: Holds denormalized profiles and live running ledger balances (`totalPaid`, `totalOwed`, `balance`).
*   `/expenses/{expenseId}`: Stores expense records containing splits mapping (which user owes what), paid-by references, and categories.
*   `/settlements/{settlementId}`: A historical ledger tracking transactions made between boardmates to pay off balances.

---

## 🚀 Getting Started

### 1. Firebase Backend Setup

1.  Create a project in the [Firebase Console](https://console.firebase.google.com).
2.  Enable **Email/Password** and **Google** sign-in providers under **Authentication**.
3.  Create a **Cloud Firestore** instance in **Native Mode**.
4.  Navigate to **Project Settings** → **General** and register a **Web app** to obtain your client SDK configuration.
5.  Navigate to **Project Settings** → **Service Accounts** and click **Generate new private key** to obtain the service account credentials for the Admin SDK.

### 2. Environment Configuration

Create a `.env.local` file in the root of the project (using `.env.local.example` as a template):

```env
# Client Configuration (Safe to expose, compiled at build time)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-app
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-app.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abcdef

# Server Configuration (Secrets, NEVER prefix with NEXT_PUBLIC_!)
FIREBASE_ADMIN_PROJECT_ID=your-app
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxx@your-app.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7...\n-----END PRIVATE KEY-----\n"
```
> ⚠️ **Important:** In your local `.env.local`, the server-side `FIREBASE_ADMIN_PRIVATE_KEY` must be wrapped in double quotes, and internal newlines should be written as `\n` literals.

### 3. Deploy Firestore Rules

Before running the application, deploy the read-only security rules so the client SDK can fetch data:

```bash
npx -y firebase-tools@latest deploy --only firestore:rules
```

### 4. Running the Development Server

Installs dependencies and spins up the local Turbopack build server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Deployment (Vercel)

1.  Connect your repository to **Vercel**.
2.  Add all the variables from your `.env.local` to your Vercel Project Settings.
    *   *Note:* In the Vercel dashboard, **do not** wrap your environment values in quotes.
3.  Ensure you register your production domain under **Authorized Domains** in the Firebase Authentication console.
4.  Configure HTTP referrer restrictions on your API key in the Google Cloud Console to allow your production domain URL.

---

## 🛠️ ~~Rebuild Blueprint~~

~~This project was originally bootstrapped and documented in the [REBUILD_GUIDE.md](./REBUILD_GUIDE.md) before deployment. It is now treated as a fully built, ready-to-use production app.~~
