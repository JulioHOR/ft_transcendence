import type { ReactNode } from "react";
import Box from "@mui/material/Box";

/** Propriedades compartilhadas pelas páginas principais. */
type PageContainerProps = {
  /** Conteúdo da página. */
  children: ReactNode;
  /** Mantém a página na altura disponível, usado pelo chat. */
  fillHeight?: boolean;
};

/** Centraliza as páginas e define espaçamento e largura do conteúdo. */
export function PageContainer({
  children,
  fillHeight = false,
}: PageContainerProps) {
  return (
    <Box
      component="main"
      sx={{
        display: "flex",
        height: fillHeight ? "100%" : undefined,
        minHeight: fillHeight ? 0 : undefined,
        width: "100%",
        maxWidth: 1120,
        mx: "auto",
        flexDirection: "column",
        gap: 2.5,
        px: { xs: 2, sm: 3 },
        py: { xs: 2, sm: 3 },
      }}
    >
      {children}
    </Box>
  );
}
