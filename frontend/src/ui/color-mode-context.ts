import { createContext, useContext } from "react";
import type { PaletteMode } from "@mui/material/styles";

export type ColorModeContextValue = {
  /** Currently applied color mode. */
  mode: PaletteMode;
  /** Toggles between light and dark modes. */
  toggleMode: () => void;
};

/** React context for sharing the application's color mode. */
export const ColorModeContext = createContext<ColorModeContextValue | null>(
  null,
);

/** Reads the color mode inside ColorModeProvider. */
export function useColorMode(): ColorModeContextValue {
  const context = useContext(ColorModeContext);
  if (context == null) {
    throw new Error("useColorMode precisa estar dentro de ColorModeProvider");
  }
  return context;
}
