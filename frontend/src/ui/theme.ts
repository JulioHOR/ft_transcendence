import { createTheme, type PaletteMode } from "@mui/material/styles";

/** Define as cores da paleta para o modo selecionado. */
function paletteForMode(mode: PaletteMode) {
  const dark = mode === "dark";
  return {
    mode,
    primary: dark
      ? { main: "#8ee6c7", contrastText: "#10231d" }
      : { main: "#176c51", contrastText: "#ffffff" },
    secondary: { main: dark ? "#f1b86b" : "#9c5f0c" },
    background: dark
      ? { default: "#101614", paper: "#19221f" }
      : { default: "#f3f7f4", paper: "#ffffff" },
    text: dark
      ? { primary: "#edf4ef", secondary: "#a7b5ad" }
      : { primary: "#18251f", secondary: "#53665b" },
    divider: dark ? "#34423b" : "#d5e0d8",
  };
}

/** Opções visuais compartilhadas pelos temas claro e escuro. */
const sharedThemeOptions = {
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
    button: { fontWeight: 600, textTransform: "none" },
    h1: { fontSize: "1.5rem", fontWeight: 650 },
    h2: { fontSize: "1.15rem", fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { minHeight: 40, borderRadius: 8 } },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 8 } } },
  },
};

/** Cria um tema do Material UI com base no modo de paleta fornecido (claro ou escuro). */
export function createAppTheme(mode: PaletteMode) {
  return createTheme({ ...sharedThemeOptions, palette: paletteForMode(mode) });
}
