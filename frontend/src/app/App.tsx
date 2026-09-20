import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { HomePage } from "../pages/HomePage";
import { ui } from "../ui/classes";

const PongPage = lazy(async () => {
  const module = await import("../pages/PongPage");
  return { default: module.PongPage };
});

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-svh w-full flex-col bg-zinc-900 text-zinc-200">
        <nav aria-label="Principal" className={`flex gap-4 text-sm ${ui.bar}`}>
          <Link className={ui.link} to="/">
            Home
          </Link>
          <Link className={ui.link} to="/pong">
            Pong
          </Link>
        </nav>

        <div className="min-h-0 flex-1">
          <Suspense fallback={<p className={`p-4 ${ui.muted}`}>Loading…</p>}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/pong" element={<PongPage />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </BrowserRouter>
  );
}
