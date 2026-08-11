import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { login as loginRequest } from "@/api/client";
import type { AuthSession } from "@/api/types";

type SessionContextValue = {
  session: AuthSession | null;
  signingIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const signIn = useCallback(async (email: string, password: string) => {
    setSigningIn(true);
    try {
      const nextSession = await loginRequest(email.trim(), password);
      setSession(nextSession);
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOut = useCallback(() => {
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, signingIn, signIn, signOut }),
    [session, signIn, signOut, signingIn],
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
