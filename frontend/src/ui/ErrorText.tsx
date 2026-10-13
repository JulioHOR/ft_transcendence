import { ui } from "./classes";

/** Exibe uma mensagem de erro, se houver. */
export function ErrorText({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className={ui.error} role="alert">
      {error}
    </p>
  );
}
