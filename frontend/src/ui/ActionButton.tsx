import Button from "@mui/material/Button";
import type { ActionButtonProps } from "./props";

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
