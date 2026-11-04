import { createContext, useContext, useEffect, useRef } from "react";
import type { AlertColor } from "@mui/material/Alert";

export type Toast = {
  message: string;
  severity: AlertColor;
  onDismiss?: () => void;
};

export type ToastContextValue = (
  message: string,
  severity: AlertColor,
  onDismiss?: () => void,
) => void;

export const ToastContext = createContext<ToastContextValue | null>(null);

/** Mostra uma notificação em qualquer página da aplicação. */
export function useToaster(): ToastContextValue {
  const showToast = useContext(ToastContext);
  if (showToast === null) {
    throw new Error("useToaster deve ser usado dentro de ToasterProvider");
  }
  return showToast;
}

/** Envia erros de componentes para o toaster global. */
export function useErrorToast(
  message: string | null,
  onDismiss?: () => void,
): void {
  const showToast = useToaster();
  const shownMessage = useRef<string | null>(null);
  useEffect(() => {
    if (message === null) {
      shownMessage.current = null;
      return;
    }
    if (shownMessage.current === message) return;
    shownMessage.current = message;
    showToast(message, "error", onDismiss);
  }, [message, onDismiss, showToast]);
}
