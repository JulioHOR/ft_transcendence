/** Envia chamadas HTTP com o cookie de sessão do usuário. */
export function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(input, { credentials: "include", ...init });
}
