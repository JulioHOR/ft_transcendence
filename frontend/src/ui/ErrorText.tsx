import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import { useLatestRef } from "../app/useLatestRef";

/** Exibe uma mensagem de erro que pode ser fechada e some após alguns segundos. */
export function ErrorText({
  error,
  onDismiss,
}: {
  error: string | null;
  onDismiss?: () => void;
}) {
  if (!error) return null;
  return <TimedErrorAlert key={error} error={error} onDismiss={onDismiss} />;
}

/** Mostra o alerta e o remove após alguns segundos. */
function TimedErrorAlert({
  error,
  onDismiss,
}: {
  error: string;
  onDismiss?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const onDismissRef = useLatestRef(onDismiss);
  useEffect(() => {
    const timeout = setTimeout(
      () => dismissError(setOpen, onDismissRef.current),
      6000,
    );
    return () => clearTimeout(timeout);
  }, [onDismissRef]);
  if (!open) return null;
  return (
    <ErrorAlert
      error={error}
      onClose={() => dismissError(setOpen, onDismissRef.current)}
    />
  );
}

/** Exibe o alerta de erro com o mesmo espaçamento da página. */
function ErrorAlert({
  error,
  onClose,
}: {
  error: string;
  onClose: () => void;
}) {
  return (
    <Alert
      severity="error"
      variant="filled"
      role="alert"
      onClose={onClose}
      sx={errorAlertSx}
    >
      {error}
    </Alert>
  );
}

/** Fecha o alerta e limpa a mensagem na origem. */
function dismissError(
  setOpen: (open: boolean) => void,
  onDismiss?: () => void,
) {
  setOpen(false);
  onDismiss?.();
}

/** Ocupa a largura do formulário ou da página sem alterar o espaçamento. */
const errorAlertSx = {
  width: "100%",
  boxSizing: "border-box",
  alignItems: "center",
  px: 2,
  "& .MuiAlert-message": { flex: 1 },
  "& .MuiAlert-action": { alignItems: "center", pt: 0 },
};
