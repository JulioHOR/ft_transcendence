import { useErrorToast } from "./toaster-context";

/** Exibe uma mensagem de erro que pode ser fechada e some após alguns segundos. */
export function ErrorText({
  error,
  onDismiss,
}: {
  error: string | null;
  onDismiss?: () => void;
}) {
  useErrorToast(error, onDismiss);
  return null;
}
