/** Sends HTTP requests with the user's session cookie. */
export function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(input, { credentials: "include", ...init });
}
