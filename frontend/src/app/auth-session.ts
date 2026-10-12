import { createContext, useContext } from "react";

import type { User } from "../api/types";

/** Valor compartilhado da sessão de autenticação no frontend. */
export type AuthContextValue = {
  /** Usuário autenticado, ou null se não houver sessão. */
  user: User | null;
  /** Atualiza o usuário na sessão do frontend. */
  setUser: (user: User | null) => void;
  /** Indica se a verificação inicial via /api/me já terminou. */
  ready: boolean;
};

/** Contexto React da sessão de autenticação. */
export const AuthContext = createContext<AuthContextValue | null>(null);

/** Hook para acessar a sessão de autenticação dentro do AuthProvider. */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (value === null) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return value;
}
