import { useEffect, useState } from "react";

import { me } from "../api/auth";
import { getProfileById } from "../api/profile";
import type { User } from "../api/types";
import { AuthContext } from "./auth-session";
import { logUnexpectedError } from "../api/http";
import type { AuthProviderProps } from "./props";

/** Combines the session user with the profile avatar. */
async function loadSessionUser(): Promise<User | null> {
  const user = await me();
  if (user == null) return null;
  try {
    const profile = await getProfileById(user.id);
    return { ...user, avatarUrl: profile.avatarUrl };
  } catch {
    return user;
  }
}

/**
 * Authentication session provider.
 * On mount, fetches /api/me and the profile avatar.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void loadSessionUser()
      .then(setUser)
      .catch((failure: unknown) => {
        logUnexpectedError("Falha ao verificar a sessão", failure);
        setUser(null);
      })
      .finally(() => setReady(true));
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, ready }}>
      {children}
    </AuthContext.Provider>
  );
}
