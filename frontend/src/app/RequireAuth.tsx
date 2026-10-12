import { Navigate } from "react-router-dom";

import { useAuth } from "./auth-session";
import { ui } from "../ui/classes";

/** Propriedades do guard de autenticação. */
type RequireAuthProps = {
  /** Conteúdo protegido, renderizado apenas com sessão válida. */
  children: React.ReactNode;
};

/**
 * Guard de rota.
 * Aguarda a sessão ficar pronta e redireciona para /login quando não houver usuário.
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const { user, ready } = useAuth();

  if (!ready) {
    return <p className={`p-4 ${ui.muted}`}>Loading…</p>;
  }

  if (user === null) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
