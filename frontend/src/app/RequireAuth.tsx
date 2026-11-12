import { Navigate } from "react-router-dom";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

import { useAuth } from "./auth-session";
import type { RequireAuthProps } from "./props";

/**
 * Route guard.
 * Waits for the session to be ready and redirects to /login if there is no user.
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
