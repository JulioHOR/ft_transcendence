import { me } from "./auth";
import { profileUrl } from "./endpoints";
import { errorMessage } from "./http";
import type { User } from "./types";

/** Lê o perfil do usuário autenticado. */
export async function getProfile(): Promise<User> {
  const user = await me();
  const response = await fetch(`${profileUrl}?id=${user.id}`, {
    credentials: "include",
  });
  if (!response.ok) return user;

  const data = (await response.json()) as Partial<User>;
  return {
    id: user.id,
    email: user.email,
    nickname: data.nickname ?? user.nickname,
  };
}

/** Atualiza o nickname do usuário autenticado. */
export async function updateNickname(nickname: string): Promise<User> {
  const user = await me();
  const response = await fetch(profileUrl, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: user.id, email: user.email, nickname }),
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response, "Falha ao atualizar o apelido"));
  }
  return response.json() as Promise<User>;
}
