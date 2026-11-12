import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { EmptyStateProps } from "./props";

/** Standardized empty state for lists and content areas. */
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
