import { Suspense, lazy, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

import { LoginPage } from "../pages/LoginPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { AuthProvider } from "./AuthProvider";
import { RequireAuth } from "./RequireAuth";
import { ProfilePage } from "../pages/ProfilePage";
import { ChatPage } from "../pages/ChatPage";

import { FriendsProvider } from "./FriendsProvider";
import { ChatProvider } from "./ChatProvider";
import { FriendsPage } from "../pages/FriendsPage";
import { AppNavigation } from "./AppNavigation";

/**
 * Carregamento preguiçoso do Jogo.
 * Carrega o módulo do jogo somente quando acessado via rota.
 */
const PongPage = lazy(async () => {
  const module = await import("../pages/PongPage");
  return { default: module.PongPage };
});

/** Envolve a página com o guard de autenticação. */
function protectedPage(page: ReactNode) {
  return <RequireAuth>{page}</RequireAuth>;
}

/**
 * Define as rotas da aplicação.
 */
function AppRoutes() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/pong" element={protectedPage(<PongPage />)} />
        <Route path="/profile" element={protectedPage(<ProfilePage />)} />
        <Route
          path="/profile/:userId"
          element={protectedPage(<ProfilePage />)}
        />
        <Route path="/chat" element={protectedPage(<ChatPage />)} />
        <Route path="/friends" element={protectedPage(<FriendsPage />)} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

/** Estado exibido enquanto uma página é carregada sob demanda. */
function LoadingFallback() {
  return (
    <Box sx={{ p: 4, color: "text.secondary" }}>
      <CircularProgress size={22} />
    </Box>
  );
}

/**
 * Componente principal da aplicação.
 * Ponto de partida de toda a aplicação.
 */
export default function App() {
  return (
    <AuthProvider>
      <FriendsProvider>
        <ChatProvider>
          <AppShell />
        </ChatProvider>
      </FriendsProvider>
    </AuthProvider>
  );
}

/** Estrutura principal compartilhada pelas páginas da aplicação. */
function AppShell() {
  return (
    <BrowserRouter>
      <AppShellContent />
    </BrowserRouter>
  );
}

/** Ajusta a altura do aplicativo conforme a página ativa. */
function AppShellContent() {
  const { pathname } = useLocation();
  const fixedHeight = pathname === "/chat" || pathname === "/pong";

  return (
    <Box
      sx={{
        display: "flex",
        height: fixedHeight ? "100svh" : "auto",
        minHeight: "100svh",
        width: "100%",
        flexDirection: "column",
        bgcolor: "background.default",
        color: "text.primary",
      }}
    >
      <AppNavigation />
      <Box sx={{ minHeight: 0, flex: 1 }}>
        <AppRoutes />
      </Box>
    </Box>
  );
}
