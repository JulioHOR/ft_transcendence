import Paper from "@mui/material/Paper";
import type { SectionCardProps } from "./props";

/** Card with the application's default border and spacing. */
export function SectionCard({ children, sx, ...props }: SectionCardProps) {
  return (
    <Paper
      variant="outlined"
      sx={[
        { p: { xs: 2, sm: 3 }, borderColor: "divider" },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...props}
    >
      {children}
    </Paper>
  );
}
