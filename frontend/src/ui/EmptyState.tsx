import type { ReactNode } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

/** Estado vazio padronizado para listas e áreas de conteúdo. */
export function EmptyState({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Stack
      spacing={1.5}
      sx={{ alignItems: "center", justifyContent: "center", py: 3, textAlign: "center" }}
    >
      <Typography color="text.secondary">{children}</Typography>
      {action}
    </Stack>
  );
}
