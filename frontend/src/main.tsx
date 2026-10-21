import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import { ColorModeProvider } from "./ui/ColorModeProvider";

// Renderiza o componente principal da aplicação dentro do elemento com id "root" no HTML.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ColorModeProvider>
      <App />
    </ColorModeProvider>
  </StrictMode>,
);
