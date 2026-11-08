import { useCallback, useState } from "react";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import {
  ToastContext,
  type Toast,
  type ToastContextValue,
} from "./toaster-context";
import type { ToasterProviderProps, ToastViewProps } from "./props";

/** Posiciona o toast no rodapé, ocupando a largura útil da tela. */
const toastSnackbarSx = {
  bottom: { xs: 72, sm: 80 },
  left: { xs: 16, sm: 24 },
  right: { xs: 16, sm: 24 },
  width: "auto",
  maxWidth: "none",
  transform: "none",
} as const;

/** Disponibiliza notificações temporárias no rodapé da aplicação. */
export function ToasterProvider({ children }: ToasterProviderProps) {
  const [toast, setToast] = useState<Toast | null>(null);
  const showToast = useCallback<ToastContextValue>(
    (message, severity, onDismiss) => {
      setToast({ message, severity, onDismiss });
    },
    [],
  );

  /** Fecha a notificação atual e executa seu callback. */
  function dismissToast(): void {
    setToast(null);
    toast?.onDismiss?.();
  }

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <ToastView toast={toast} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

/** Renderiza a notificação atual ou mantém o Snackbar fechado. */
function ToastView(props: ToastViewProps) {
  return (
    <Snackbar
      open={props.toast !== null}
      autoHideDuration={6000}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      onClose={props.onDismiss}
      sx={toastSnackbarSx}
    >
      {props.toast ? (
        <Alert
          severity={props.toast.severity}
          variant="filled"
          role={props.toast.severity === "error" ? "alert" : "status"}
          onClose={props.onDismiss}
          sx={{ width: "100%", boxSizing: "border-box" }}
        >
          {props.toast.message}
        </Alert>
      ) : undefined}
    </Snackbar>
  );
}
