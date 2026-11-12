import { createTheme, type PaletteMode } from "@mui/material/styles";

/** Defines the palette colors for the selected mode. */
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
      : { default: "#edf1f0", paper: "#f8faf9" },
    text: dark
      ? { primary: "#edf4ef", secondary: "#a7b5ad" }
      : { primary: "#18251f", secondary: "#53665b" },
    divider: dark ? "#34423b" : "#d5e0d8",
  };
}

/** Visual options shared by the light and dark themes. */
const sharedThemeOptions = {
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
    button: { fontWeight: 600, textTransform: "none" },
    h1: { fontSize: "1.5rem", fontWeight: 650 },
    h2: { fontSize: "1.15rem", fontWeight: 600 },
    h3: { fontSize: "1rem", fontWeight: 600 },
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

/** Creates a Material UI theme based on the provided palette mode (light or dark). */
export function createAppTheme(mode: PaletteMode) {
  return createTheme({ ...sharedThemeOptions, palette: paletteForMode(mode) });
}
