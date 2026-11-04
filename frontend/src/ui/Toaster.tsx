import { useCallback, useState, type ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import {
  ToastContext,
  type Toast,
  type ToastContextValue,
} from "./toaster-context";

/** Disponibiliza notificações temporárias no topo da aplicação. */
export function ToasterProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const showToast = useCallback<ToastContextValue>(
    (message, severity, onDismiss) => {
      setToast({ message, severity, onDismiss });
    },
    [],
  );

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

function ToastView(props: { toast: Toast | null; onDismiss: () => void }) {
  return (
    <Snackbar
      open={props.toast !== null}
      autoHideDuration={6000}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      onClose={props.onDismiss}
      sx={{ width: "calc(100% - 32px)", maxWidth: "none" }}
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
