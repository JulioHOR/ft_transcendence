import type { User } from "./types";
import { apiFetch } from "./api";
import { errorMessage } from "./http";

/** Credentials used to log in. */
export type LoginInput = {
  /** User email. */
  email: string;
  /** User password. */
  password: string;
};

/** Data required to create an account. */
export type SignupInput = {
  /** User email. */
  email: string;
  /** User's public nickname. */
  nickname: string;
  /** User password. */
  password: string;
};

/** Authenticates the user with email and password (session cookie). */
export async function login(input: LoginInput): Promise<User> {
  const response = await apiFetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await errorMessage(response, "login falhou"));
  }

  return response.json() as Promise<User>;
}

/** Creates an account and starts the session (session cookie). */
export async function signup(input: SignupInput): Promise<User> {
  const response = await apiFetch("/api/auth/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await errorMessage(response, "signup falhou"));
  }

  return response.json() as Promise<User>;
}

/** Ends the current session on the server. */
export async function logout(): Promise<void> {
  const response = await apiFetch("/api/auth/logout", {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await errorMessage(response, "logout falhou"));
  }
}

/** Returns the current session's user, if authenticated. */
export async function me(): Promise<User | null> {
  const res = await apiFetch("/api/me", {
    method: "GET",
  });
  if (res.status === 204) return null;
  if (!res.ok) {
    throw new Error(await errorMessage(res, "não autenticado"));
  }
  return res.json() as Promise<User>;
}
