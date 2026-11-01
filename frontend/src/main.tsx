import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import { ColorModeProvider } from "./ui/ColorModeProvider";
import { ToasterProvider } from "./ui/Toaster";
import { logUnexpectedError } from "./api/http";
import { setConsoleFunction } from "three";

// R3F 9.x ainda cria Clock internamente; remover ao migrar para a versão que usa Timer.
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

// Renderiza o componente principal da aplicação dentro do elemento com id "root" no HTML.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ColorModeProvider>
      <ToasterProvider>
        <App />
      </ToasterProvider>
    </ColorModeProvider>
  </StrictMode>,
);
