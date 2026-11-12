import Box from "@mui/material/Box";
import type { PageContainerProps } from "./props";

/** Centers pages and sets the content spacing and width. */
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
