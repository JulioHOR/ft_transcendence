import Alert from "@mui/material/Alert";

/** Exibe uma mensagem de erro, se houver. */
export function ErrorText({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <Alert severity="error" variant="outlined" role="alert">
      {error}
    </Alert>
  );
}
