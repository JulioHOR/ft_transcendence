import { me } from "./auth";
import { errorMessage } from "./http";
import type { User } from "./types";

/** Lê o perfil do usuário autenticado. */
export async function getProfile(): Promise<User> {
  return me();
}

/** Atualiza o nickname do usuário autenticado. */
export async function updateNickname(nickname: string): Promise<User> {
  const response = await fetch("/api/profile", {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ nickname }),
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response, "Falha ao atualizar o apelido"));
  }
  return response.json() as Promise<User>;
}
