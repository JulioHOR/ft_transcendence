import { useErrorToast } from "./toaster-context";
import type { ErrorTextProps } from "./props";

/** Displays a dismissible error message that disappears after a few seconds. */
export function ErrorText({ error, onDismiss }: ErrorTextProps) {
  useErrorToast(error, onDismiss);
  return null;
}
