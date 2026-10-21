import type { ReactNode } from "react";
import Box from "@mui/material/Box";

/** Propriedades compartilhadas pelas páginas principais. */
type PageContainerProps = {
  /** Conteúdo da página. */
  children: ReactNode;
};

/** Centraliza as páginas e define espaçamento, largura e rolagem. */
export function PageContainer({ children }: PageContainerProps) {
  return (
    <Box
      component="main"
      sx={{
        display: "flex",
        height: "100%",
        width: "100%",
        maxWidth: 1120,
        minHeight: 0,
        mx: "auto",
        flexDirection: "column",
        gap: 2.5,
        overflowY: "auto",
        px: { xs: 2, sm: 3 },
        py: { xs: 2, sm: 3 },
      }}
    >
      {children}
    </Box>
  );
}
