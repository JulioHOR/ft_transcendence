import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { EmptyStateProps } from "./props";

/** Estado vazio padronizado para listas e áreas de conteúdo. */
export function EmptyState({ children, action }: EmptyStateProps) {
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
