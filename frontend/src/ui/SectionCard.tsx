import type { ReactNode } from "react";
import Paper, { type PaperProps } from "@mui/material/Paper";

/** Propriedades do cartão compartilhado entre seções. */
type SectionCardProps = PaperProps & {
  children: ReactNode;
};

/** Cartão com borda e espaçamento padrão do aplicativo. */
export function SectionCard({ children, sx, ...props }: SectionCardProps) {
  return (
    <Paper
      variant="outlined"
      sx={[{ p: { xs: 2, sm: 3 }, borderColor: "divider" }, ...(Array.isArray(sx) ? sx : [sx])]}
      {...props}
    >
      {children}
    </Paper>
  );
}
