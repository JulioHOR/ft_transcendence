import Button from "@mui/material/Button";
import type { ActionButtonProps } from "./props";

/** Material UI button with the visual variants used by the application. */
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
