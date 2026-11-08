import { Navigate } from "react-router-dom";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

import { useAuth } from "./auth-session";
import type { RequireAuthProps } from "./props";

/**
 * Guard de rota.
 * Aguarda a sessão ficar pronta e redireciona para /login quando não houver usuário.
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <Box sx={{ p: 4 }}>
        <CircularProgress size={22} aria-label="Carregando" />
      </Box>
    );
  }

  if (user === null) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
