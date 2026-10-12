import { useEffect, useState, type ReactNode } from "react";

import { me } from "../api/auth";
import { getProfileById } from "../api/profile";
import type { User } from "../api/types";
import { AuthContext } from "./auth-session";

/** Propriedades do provedor de autenticação. */
type AuthProviderProps = {
  /** Árvore de componentes que terá acesso à sessão. */
  children: ReactNode;
};

/** Junta o usuário da sessão com o avatar do perfil. */
async function loadSessionUser(): Promise<User> {
  const user = await me();
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
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, ready }}>
      {children}
    </AuthContext.Provider>
  );
}
