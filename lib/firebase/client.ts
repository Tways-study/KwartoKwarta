"use client";

import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  type Firestore,
} from "firebase/firestore";

const config: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function initFirestore() {
  const app = getApp();
  // §10.3 forced long-polling (auto-detect hangs behind CDNs/proxies/iOS PWA);
  // §10.4 single-tab manager (multi-tab needs SharedWorker/BroadcastChannel,
  // restricted by iOS PWA standalone, which can silence all listeners).
  try {
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
      localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager(undefined),
      }),
    });
  } catch {
    // Already initialized (dev HMR re-import) — reuse the existing instance.
    return getFirestore(app);
  }
}

function createClient() {
  // §10.6 — break loudly on a misconfigured deploy instead of booting with junk
  // config and failing silently later.
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase client config: ${missing.join(", ")}. ` +
        `Set the NEXT_PUBLIC_FIREBASE_* env vars (see .env.local.example). ` +
        `NEXT_PUBLIC_* values are inlined at build time, so redeploy after changing them.`,
    );
  }
  if (!getApps().length) initializeApp(config);
  return {
    auth: getAuth(getApp()),
    db: initFirestore(),
    googleProvider: new GoogleAuthProvider(),
  };
}

// Initialize only in the browser. During SSR/prerender these are never
// dereferenced — every Firebase call lives in a client effect or event handler.
const client = typeof window !== "undefined" ? createClient() : null;

export const auth = (client?.auth ?? null) as Auth;
export const db = (client?.db ?? null) as Firestore;
export const googleProvider =
  client?.googleProvider ?? (null as unknown as GoogleAuthProvider);
