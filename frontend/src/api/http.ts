/**
 * Extrai uma mensagem de erro segura a partir de uma Response HTTP.
 * Se o body for inválido, nulo ou sem campo error em texto, devolve o fallback.
 */
export async function errorMessage(res: Response, fallback: string): Promise<string> {
  const data: unknown = await res.json().catch(() => null);

  if (
    data !== null &&
    typeof data === "object" &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "string"
  ) {
    return (data as { error: string }).error;
  }

  return fallback;
}
