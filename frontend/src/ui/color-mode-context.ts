import { createContext, useContext } from "react";
import type { PaletteMode } from "@mui/material/styles";

export type ColorModeContextValue = {
  /** Modo de cores atualmente aplicado. */
  mode: PaletteMode;
  /** Alterna entre os modos claro e escuro. */
  toggleMode: () => void;
};

/** Contexto React para compartilhar o modo de cores da aplicação. */
export const ColorModeContext = createContext<ColorModeContextValue | null>(
  null,
);

/** Lê o modo de cores dentro do ColorModeProvider. */
export function useColorMode(): ColorModeContextValue {
  const context = useContext(ColorModeContext);
  if (context == null) {
    throw new Error("useColorMode precisa estar dentro de ColorModeProvider");
  }
  return context;
}
