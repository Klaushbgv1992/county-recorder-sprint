import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import demoUser from "../data/account/demo-user.json";

export interface DemoUser {
  id: string;
  display_name: string;
  email: string;
  phone_masked: string;
  joined_date: string;
}

interface AuthValue {
  user: DemoUser | null;
  signIn: () => void;
  signOut: () => void;
}

const STORAGE_KEY = "mcr.account.signedIn.v1";
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
  });

  useEffect(() => {
    try {
      if (signedIn) localStorage.setItem(STORAGE_KEY, "1");
      else localStorage.removeItem(STORAGE_KEY);
    } catch { /* noop */ }
  }, [signedIn]);

  return (
    <AuthContext.Provider
      value={{
        user: signedIn ? (demoUser as DemoUser) : null,
        signIn: () => setSignedIn(true),
        signOut: () => setSignedIn(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
