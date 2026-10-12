import { Link } from "react-router-dom";

import { ui } from "../ui/classes";

/**
 * Página exibida quando a rota não corresponde a nenhum caminho conhecido.
 */
export function NotFoundPage() {
  return (
    <main className={`${ui.page} gap-4 p-4 sm:p-6`}>
      <h1 className={ui.title}>Página não encontrada</h1>
      <Link className={ui.link} to="/">
        Ir para o início
      </Link>
    </main>
  );
}
