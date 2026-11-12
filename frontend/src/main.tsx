import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import { ColorModeProvider } from "./ui/ColorModeProvider";
import { ToasterProvider } from "./ui/Toaster";
import { logUnexpectedError } from "./api/http";
import { setConsoleFunction } from "three";

// R3F 9.x still creates THREE.Clock internally, which Three.js marks as deprecated.
// R3F 10 prereleases declare support for Three.js >= 0.185, but are not stable releases yet.
setConsoleFunction((method, message, ...details) => {
  if (
    method === "warn" &&
    message ===
      "THREE.Clock: This module has been deprecated. Please use THREE.Timer instead."
  ) {
    return;
  }
  console[method](message, ...details);
});

window.addEventListener("error", (event) => {
  logUnexpectedError("Erro não tratado na interface", {
    message: event.message,
    source: event.filename,
    line: event.lineno,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  logUnexpectedError("Promessa rejeitada sem tratamento", event.reason);
});

// Renders the main application component inside the HTML element with id "root".
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ColorModeProvider>
      <ToasterProvider>
        <App />
      </ToasterProvider>
    </ColorModeProvider>
  </StrictMode>,
);
