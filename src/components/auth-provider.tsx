"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

type ApprovalStatus = "loading" | "approved" | "pending" | "unauthenticated";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  approvalStatus: ApprovalStatus;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  recheckApproval: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  approvalStatus: "loading",
  isAdmin: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  recheckApproval: async () => {},
});

const ADMIN_EMAIL = "kahanjoseph1@gmail.com";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>("loading");

  const checkApproval = async (u: User) => {
    try {
      const res = await fetch("/api/auth/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: u.email,
          displayName: u.displayName,
          photoURL: u.photoURL,
        }),
      });
      if (!res.ok) throw new Error("Failed to check status");
      const data = await res.json();
      setApprovalStatus(data.status === "approved" ? "approved" : "pending");
    } catch {
      setApprovalStatus("pending");
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await checkApproval(u);
      } else {
        setApprovalStatus("unauthenticated");
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signOut = async () => {
    await fbSignOut(auth);
    setApprovalStatus("unauthenticated");
  };

  const recheckApproval = async () => {
    if (user) await checkApproval(user);
  };

  const isAdmin = user?.email === ADMIN_EMAIL;

  return (
    <AuthContext.Provider
      value={{ user, loading, approvalStatus, isAdmin, signInWithGoogle, signOut, recheckApproval }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
