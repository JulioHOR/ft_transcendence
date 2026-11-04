import { Link } from "react-router-dom";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { PageContainer } from "../ui/PageContainer";

/**
 * Página exibida quando a rota não corresponde a nenhum caminho conhecido.
 */
export function NotFoundPage() {
  return (
    <PageContainer>
      <Typography variant="h1">Página não encontrada</Typography>
      <Button component={Link} to="/" variant="outlined" color="inherit">
        Ir para o início
      </Button>
    </PageContainer>
  );
}
