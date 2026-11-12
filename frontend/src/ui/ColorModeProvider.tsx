import { useMemo, useState } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, type PaletteMode } from "@mui/material/styles";
import { ColorModeContext } from "./color-mode-context";
import { createAppTheme } from "./theme";
import type { ColorModeProviderProps } from "./props";

/** Local key used to restore the theme between visits. */
const STORAGE_KEY = "ft-transcendence-color-mode";

/** Reads the saved theme and uses dark mode if reading fails. */
function savedMode(): PaletteMode {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "light"
      ? "light"
      : "dark";
  } catch {
    return "dark";
  }
}

/** Provides the selected theme and persists the choice in this browser. */
export function ColorModeProvider({ children }: ColorModeProviderProps) {
  const [mode, setMode] = useState<PaletteMode>(savedMode);
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  /** Toggles the theme and persists the choice locally. */
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
