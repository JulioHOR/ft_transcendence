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
      sx={{
        alignItems: "flex-start",
        justifyContent: "center",
        py: 3,
        textAlign: "left",
      }}
    >
      <Typography color="text.secondary">{children}</Typography>
      {action}
    </Stack>
  );
}
