import { createContext, useContext } from "react";

import type { User } from "../api/types";

/** Shared authentication session value in the frontend. */
export type AuthContextValue = {
  /** Authenticated user, or null if there is no session. */
  user: User | null;
  /** Updates the user in the frontend session. */
  setUser: (user: User | null) => void;
  /** Indicates whether the initial /api/me check has finished. */
  ready: boolean;
};

/** React context for the authentication session. */
export const AuthContext = createContext<AuthContextValue | null>(null);

/** Hook for accessing the authentication session inside AuthProvider. */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (value === null) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return value;
}
