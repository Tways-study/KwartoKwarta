"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase/client";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    name: string,
    email: string,
    password: string,
  ) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// §10.7 — map Firebase auth codes to human messages. `auth/invalid-credential`
// usually means a wrong email/password, but can ALSO surface from a blocked or
// invalid API key, so the config case is mapped explicitly too.
function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "That email is already registered — try signing in instead.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/invalid-email":
      return "That doesn't look like a valid email address.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in was cancelled.";
    case "auth/network-request-failed":
      return "Network error — check your connection and try again.";
    case "auth/api-key-not-valid":
    case "auth/invalid-api-key":
      return "Configuration error — the app's API key is invalid.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

// Creates /users/{uid} on first sign-in with houseId:null. Never overwrites
// houseId or createdAt (only the doc owner can write this — see security rules).
async function upsertUserDoc(user: User): Promise<void> {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  const fallbackName =
    user.displayName || user.email?.split("@")[0] || "Boardmate";

  if (snap.exists()) {
    await setDoc(
      ref,
      {
        displayName: user.displayName || snap.data().displayName || fallbackName,
        email: user.email ?? "",
        photoURL: user.photoURL ?? null,
      },
      { merge: true },
    );
    return;
  }

  await setDoc(ref, {
    displayName: fallbackName,
    email: user.email ?? "",
    photoURL: user.photoURL ?? null,
    houseId: null,
    createdAt: serverTimestamp(),
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const signInWithGoogle = async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await upsertUserDoc(cred.user);
    } catch (err) {
      throw new Error(friendlyAuthError(err));
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await upsertUserDoc(cred.user);
    } catch (err) {
      throw new Error(friendlyAuthError(err));
    }
  };

  const signUpWithEmail = async (
    name: string,
    email: string,
    password: string,
  ) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }
      await upsertUserDoc(cred.user);
    } catch (err) {
      throw new Error(friendlyAuthError(err));
    }
  };

  const signOutUser = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
