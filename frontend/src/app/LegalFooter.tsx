import Link from "@mui/material/Link";
import Box from "@mui/material/Box";
import { Link as RouterLink } from "react-router-dom";

/** Links para os documentos legais da aplicação. */
export function LegalFooter() {
  return (
    <Box
      component="footer"
      sx={{
        display: "flex",
        justifyContent: "center",
        gap: 2,
        borderTop: 1,
        borderColor: "divider",
        py: 1.5,
      }}
    >
      <Link component={RouterLink} to="/privacy" variant="body2">
        Política de privacidade
      </Link>
      <Link component={RouterLink} to="/terms" variant="body2">
        Termos de serviço
      </Link>
    </Box>
  );
}
