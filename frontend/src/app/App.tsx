import { Suspense, lazy, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

import { ui } from "../ui/classes";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { AuthProvider } from "./AuthProvider";
import { RequireAuth } from "./RequireAuth";
import { ProfilePage } from "../pages/ProfilePage";
import { ChatPage } from "../pages/ChatPage";

import { FriendsProvider } from "./FriendsProvider";
import { ChatProvider } from "./ChatProvider";
import { useChat } from "./chat-session";
import { FriendsPage } from "../pages/FriendsPage";

/**
 * Carregamento preguiçoso do Jogo.
 * Carrega o módulo do jogo somente quando acessado via rota.
 */
const PongPage = lazy(async () => {
  const module = await import("../pages/PongPage");
  return { default: module.PongPage };
});

/** Link da nav com badge opcional de não lidas. */
function NavLinkWithBadge(props: {
  to: string;
  label: string;
  unread: number;
}) {
  const text =
    props.unread > 0 ? `${props.label} (${props.unread})` : props.label;
  return (
    <Link className={ui.link} to={props.to}>
      {text}
    </Link>
  );
}

/**
 * Estrutura (componentes) de navegação da aplicação.
 */
function AppNav() {
  const { unreadTotal } = useChat();
  return (
    <nav aria-label="Principal" className={`flex gap-4 text-sm ${ui.bar}`}>
      <Link className={ui.link} to="/login">Login</Link>
      <Link className={ui.link} to="/home">Home</Link>
      <Link className={ui.link} to="/profile">Profile</Link>
      <NavLinkWithBadge to="/chat" label="Chat" unread={unreadTotal} />
      <Link className={ui.link} to="/friends">Friends</Link>
      <Link className={ui.link} to="/pong">Ping Pong</Link>
    </nav>
  );
}

/** Envolve a página com o guard de autenticação. */
function protectedPage(page: ReactNode) {
  return <RequireAuth>{page}</RequireAuth>;
}

/**
 * Define as rotas da aplicação.
 */
function AppRoutes() {
  return (
    <Suspense fallback={<p className={`p-4 ${ui.muted}`}>Loading…</p>}>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/home" element={protectedPage(<HomePage />)} />
        <Route path="/pong" element={protectedPage(<PongPage />)} />
        <Route path="/profile" element={protectedPage(<ProfilePage />)} />
        <Route path="/profile/:userId" element={protectedPage(<ProfilePage />)} />
        <Route path="/chat" element={protectedPage(<ChatPage />)} />
        <Route path="/friends" element={protectedPage(<FriendsPage />)} />
        <Route path="*" element={<NotFoundPage />} />
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
    <AuthProvider>
      <FriendsProvider>
        <ChatProvider>
          <BrowserRouter>
            <div className="flex h-svh w-full flex-col bg-zinc-900 text-zinc-200">
              <AppNav />
              <div className="min-h-0 flex-1">
                <AppRoutes />
              </div>
            </div>
          </BrowserRouter>
        </ChatProvider>
      </FriendsProvider>
    </AuthProvider>
  );
}
