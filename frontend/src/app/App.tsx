import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { HomePage } from "../pages/HomePage";

const PongPage = lazy(async () => {
  const module = await import("../pages/PongPage");
  return { default: module.PongPage };
});

function RouteFallback() {
  return <p>Loading…</p>;
}

export default function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">Home</Link> | <Link to="/pong">Pong</Link>
      </nav>

      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/pong" element={<PongPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
