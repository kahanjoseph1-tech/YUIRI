import React, { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { base44 } from "@/api/base44Client";
import { auth as firebaseAuth } from "@/lib/firebase";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      setIsLoadingAuth(true);
      setAuthError(null);

      if (!firebaseUser) {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        return;
      }

      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsAuthenticated(Boolean(currentUser));
      } catch (error) {
        console.error("Firebase user sync failed:", error);
        setAuthError(error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoadingAuth(false);
      }
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(firebaseAuth, provider);
  };

  const loginWithEmail = async (email, password) => {
    await signInWithEmailAndPassword(firebaseAuth, email, password);
  };

  const registerWithEmail = async (email, password) => {
    await createUserWithEmailAndPassword(firebaseAuth, email, password);
  };

  const logout = async () => {
    await base44.auth.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const navigateToLogin = () => {
    window.dispatchEvent(new CustomEvent("yuiri:login-required"));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings: false,
        authError,
        appPublicSettings: null,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        logout,
        navigateToLogin,
        checkAppState: () => Promise.resolve(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
