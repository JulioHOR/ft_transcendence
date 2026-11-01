/**
 * Extrai uma mensagem de erro segura a partir de uma Response HTTP.
 * Se o body for inválido, nulo ou sem campo error em texto, devolve o fallback.
 */
export async function errorMessage(
  res: Response,
  fallback: string,
): Promise<string> {
  if (res.status >= 500) {
    logUnexpectedError("Resposta inesperada da API", { status: res.status });
    return fallback;
  }
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

/** Registra uma falha inesperada com identificação do aplicativo. */
export function logUnexpectedError(context: string, failure: unknown): void {
  console.info(`[ft_transcendence] ${context}`, failure);
}

/** Retorna uma mensagem útil e registra falhas técnicas inesperadas. */
export function friendlyError(
  failure: unknown,
  fallback: string,
  context: string,
): string {
  if (failure instanceof Error && !(failure instanceof TypeError)) {
    return failure.message;
  }
  logUnexpectedError(context, failure);
  return fallback;
}
