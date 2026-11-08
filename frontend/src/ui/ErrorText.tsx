import { useErrorToast } from "./toaster-context";
import type { ErrorTextProps } from "./props";

/** Exibe uma mensagem de erro que pode ser fechada e some após alguns segundos. */
export function ErrorText({ error, onDismiss }: ErrorTextProps) {
  useErrorToast(error, onDismiss);
  return null;
}
