import { useCallback, useState } from "react";
import Alert from "@mui/material/Alert";
import Portal from "@mui/material/Portal";
import Snackbar from "@mui/material/Snackbar";
import {
  ToastContext,
  type Toast,
  type ToastContextValue,
} from "./toaster-context";
import type { ToasterProviderProps, ToastViewProps } from "./props";

/** Positions the toast at the bottom, using the available screen width. */
const toastSnackbarStyle = {
  bottom: 16,
  left: 16,
  right: 16,
  width: "auto",
  maxWidth: "none",
  transform: "none",
  position: "fixed",
} as const;

/** Provides temporary notifications at the bottom of the application. */
export function ToasterProvider({ children }: ToasterProviderProps) {
  const [toast, setToast] = useState<Toast | null>(null);
  const showToast = useCallback<ToastContextValue>(
    (message, severity, onDismiss) => {
      setToast({ message, severity, onDismiss });
    },
    [],
  );

  /** Closes the current notification and runs its callback. */
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

/** Renders the current notification or keeps the Snackbar closed. */
function ToastView(props: ToastViewProps) {
  return (
    <Portal container={() => document.body}>
      <Snackbar
        open={props.toast !== null}
        autoHideDuration={6000}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        onClose={props.onDismiss}
        style={toastSnackbarStyle}
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
    </Portal>
  );
}
