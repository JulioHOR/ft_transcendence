import { useEffect, useState } from "react";

import { me } from "../api/auth";
import { getProfileById } from "../api/profile";
import type { User } from "../api/types";
import { AuthContext } from "./auth-session";
import { logUnexpectedError } from "../api/http";
import type { AuthProviderProps } from "./props";

/** Junta o usuário da sessão com o avatar do perfil. */
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
 * Provedor da sessão de autenticação.
 * Ao montar, consulta /api/me e o avatar do perfil.
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
