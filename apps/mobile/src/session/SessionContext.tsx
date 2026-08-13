import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { login as loginRequest, setUnauthorizedHandler } from "@/api/client";
import type { AuthSession } from "@/api/types";

type SessionContextValue = {
  session: AuthSession | null;
  sessionExpired: boolean;
  signingIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  clearSessionExpired: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(
    () =>
      setUnauthorizedHandler(() => {
        setSession(null);
        setSessionExpired(true);
      }),
    [],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    setSigningIn(true);
    try {
      const nextSession = await loginRequest(email.trim(), password);
      setSession(nextSession);
      setSessionExpired(false);
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOut = useCallback(() => {
    setSession(null);
    setSessionExpired(false);
  }, []);

  const clearSessionExpired = useCallback(() => {
    setSessionExpired(false);
  }, []);

  const value = useMemo(
    () => ({
      session,
      sessionExpired,
      signingIn,
      signIn,
      signOut,
      clearSessionExpired,
    }),
    [clearSessionExpired, session, sessionExpired, signIn, signOut, signingIn],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("useSession must be used inside SessionProvider.");
  }
  return value;
}
