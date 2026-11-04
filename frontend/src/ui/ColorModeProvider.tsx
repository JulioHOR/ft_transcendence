import { useMemo, useState, type ReactNode } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, type PaletteMode } from "@mui/material/styles";
import { ColorModeContext } from "./color-mode-context";
import { createAppTheme } from "./theme";

/** Chave local usada para restaurar o tema entre visitas. */
const STORAGE_KEY = "ft-transcendence-color-mode";

/** Lê o tema salvo e usa o modo escuro quando a leitura falha. */
function savedMode(): PaletteMode {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "light"
      ? "light"
      : "dark";
  } catch {
    return "dark";
  }
}

/** Fornece o tema selecionado e persiste a escolha neste navegador. */
export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>(savedMode);
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  function toggleMode() {
    setMode((current) => {
      const next = current === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // The theme still changes for this session if storage is unavailable.
      }
      return next;
    });
  }

  return (
    <ColorModeContext.Provider value={{ mode, toggleMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
