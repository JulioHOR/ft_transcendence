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
import { GameEnvPage } from "../pages/GameEnvPage";

import { FriendsProvider } from "./FriendsProvider";
import { ChatProvider } from "./ChatProvider";
import { FriendsPage } from "../pages/FriendsPage";
import { AppNavigation } from "./AppNavigation";
import { LegalFooter } from "./LegalFooter";
import { LegalPage } from "../pages/LegalPage";

/**
 * Lazy loading for the game.
 * Loads the game module only when its route is accessed.
 */
const PongPage = lazy(async () => {
  const module = await import("../pages/PongPage");
  return { default: module.PongPage };
});

/** Wraps the page with the authentication guard. */
function protectedPage(page: ReactNode) {
  return <RequireAuth>{page}</RequireAuth>;
}

/**
 * Defines the application routes.
 */
function AppRoutes() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/privacy" element={<LegalPage document="privacy" />} />
        <Route path="/terms" element={<LegalPage document="terms" />} />
        <Route path="/pong" element={protectedPage(<PongPage />)} />
        <Route path="/profile" element={protectedPage(<ProfilePage />)} />
        <Route
          path="/profile/:userId"
          element={protectedPage(<ProfilePage />)}
        />
        <Route path="/chat" element={protectedPage(<ChatPage />)} />
        <Route path="/environment3d" element={protectedPage(<GameEnvPage />)} />
        <Route path="/friends" element={protectedPage(<FriendsPage />)} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

/** State displayed while a page is being lazy-loaded. */
function LoadingFallback() {
  return (
    <Box sx={{ p: 4, color: "text.secondary" }}>
      <CircularProgress size={22} />
    </Box>
  );
}

/**
 * Main application component.
 * Entry point for the entire application.
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

/** Main structure shared by the application pages. */
function AppShell() {
  return (
    <BrowserRouter>
      <AppShellContent />
    </BrowserRouter>
  );
}

/** Adjusts the application height based on the active page. */
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
      {!fixedHeight ? <LegalFooter /> : null}
    </Box>
  );
}
