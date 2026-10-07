/** Exibe uma mensagem de erro, se houver. */
export function ErrorText({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="text-sm text-red-400" role="alert">
      {error}
    </p>
  );
}
