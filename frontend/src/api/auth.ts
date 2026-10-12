import type { User } from "./types";
import { errorMessage } from "./http";

/** Credenciais usadas no login. */
export type LoginInput = {
  /** Email do usuário. */
  email: string;
  /** Senha do usuário. */
  password: string;
};

/** Dados necessários para criar uma conta. */
export type SignupInput = {
  /** Email do usuário. */
  email: string;
  /** Apelido público do usuário. */
  nickname: string;
  /** Senha do usuário. */
  password: string;
};

/** Autentica o usuário com email e senha (cookie de sessão). */
export async function login(input: LoginInput): Promise<User> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
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

/** Cria uma conta e inicia a sessão (cookie de sessão). */
export async function signup(input: SignupInput): Promise<User> {
  const response = await fetch("/api/auth/signup", {
    method: "POST",
    credentials: "include",
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

/** Encerra a sessão atual no servidor. */
export async function logout(): Promise<void> {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await errorMessage(response, "logout falhou"));
  }
}

/** Retorna o usuário da sessão atual, se autenticado. */
export async function me(): Promise<User> {
  const res = await fetch("/api/me", {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(await errorMessage(res, "não autenticado"));
  }
  return res.json() as Promise<User>;
}
