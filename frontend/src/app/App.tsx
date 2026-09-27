import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { HomePage } from "../pages/HomePage";
import { ui } from "../ui/classes";

/**
 * Carregamento preguiçoso do Jogo.
 * Carrega o módulo do jogo somente quando acessado via rota.
 */
const PongPage = lazy(async () => {
  const module = await import("../pages/PongPage");
  return { default: module.PongPage };
});

/**
 * Estrutura (componentes) de navegação da aplicação.
 */
function AppNav() {
  return (
    <nav aria-label="Principal" className={`flex gap-4 text-sm ${ui.bar}`}>
      <Link className={ui.link} to="/">
        Home
      </Link>
      <Link className={ui.link} to="/pong">
        Pong
      </Link>
    </nav>
  );
}

/**
 * Define as rotas da aplicação.
 */
function AppRoutes() {
  return (
    <Suspense fallback={<p className={`p-4 ${ui.muted}`}>Loading…</p>}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/pong" element={<PongPage />} />
      </Routes>
    </Suspense>
  );
}

/**
 * Componente principal da aplicação.
 * Ponto de partida de toda a aplicação.
 */
export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-svh w-full flex-col bg-zinc-900 text-zinc-200">
        <AppNav />
        <div className="min-h-0 flex-1">
          <AppRoutes />
        </div>
      </div>
    </BrowserRouter>
  );
}
