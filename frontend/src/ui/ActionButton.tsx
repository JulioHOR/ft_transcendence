import Button, { type ButtonProps } from "@mui/material/Button";

/** Aparência opcional do botão padronizado. */
type ActionButtonProps = ButtonProps & {
  /** Variante visual usada pelo tema da aplicação. */
  appearance?: "primary" | "secondary" | "quiet";
};

/** Botão Material UI com as variantes visuais usadas no aplicativo. */
export function ActionButton({
  appearance = "secondary",
  ...props
}: ActionButtonProps) {
  const variant =
    appearance === "primary"
      ? "contained"
      : appearance === "quiet"
        ? "text"
        : "outlined";
  return (
    <Button
      variant={variant}
      color={appearance === "primary" ? "primary" : "inherit"}
      {...props}
    />
  );
}
