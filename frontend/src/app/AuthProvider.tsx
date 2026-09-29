import { useEffect, useState, type ReactNode } from "react";

import { me } from "../api/auth";
import type { User } from "../api/types";
import { AuthContext } from "./auth-session";

/** Propriedades do provedor de autenticação. */
type AuthProviderProps = {
  /** Árvore de componentes que terá acesso à sessão. */
  children: ReactNode;
};

/**
 * Provedor da sessão de autenticação.
 * Ao montar, consulta /api/me para restaurar o usuário a partir do cookie.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void me()
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
