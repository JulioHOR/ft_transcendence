/**
 * Extracts a safe error message from an HTTP Response.
 * If the body is invalid, null, or has no string `error` field, returns the fallback.
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

/** Logs an unexpected failure with the application identifier. */
export function logUnexpectedError(context: string, failure: unknown): void {
  console.info(`[ft_transcendence] ${context}`, failure);
}

/** Returns a useful message and logs unexpected technical failures. */
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
