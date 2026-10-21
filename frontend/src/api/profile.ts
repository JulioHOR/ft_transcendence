import { me } from "./auth";
import { defaultAvatarUrl, profileAvatarUrl, profileUrl } from "./endpoints";
import { errorMessage } from "./http";
import type { Profile, User } from "./types";

/** Mensagem quando o avatar excede o tamanho permitido. */
const AVATAR_TOO_LARGE = "imagem muito grande (máx. 600KB)";

/** URL de exibição do avatar (fallback para o default). */
export function resolveAvatarUrl(avatarUrl: string | null | undefined): string {
  return avatarUrl && avatarUrl.length > 0 ? avatarUrl : defaultAvatarUrl;
}

/**
 * Avatar atual do usuário: sessão / friends primeiro, depois fallback da mensagem.
 * Assim o histórico acompanha a foto nova sem reload.
 */
export function liveAvatarUrl(
  userId: number,
  sources: {
    selfId?: number;
    selfAvatarUrl?: string | null;
    friends?: Array<{ id: number; avatarUrl: string | null }>;
    fallback?: string | null;
  },
): string | null {
  if (sources.selfId != null && userId === sources.selfId) {
    return sources.selfAvatarUrl ?? sources.fallback ?? null;
  }
  const friend = sources.friends?.find((item) => item.id === userId);
  if (friend?.avatarUrl) return friend.avatarUrl;
  return sources.fallback ?? null;
}

/** Lê o perfil de qualquer usuário por id. */
export async function getProfileById(userId: number): Promise<Profile> {
  const response = await fetch(`${profileUrl}?id=${userId}`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response, "Falha ao carregar perfil"));
  }
  const data = (await response.json()) as Profile;
  return {
    id: data.id,
    nickname: data.nickname,
    avatarUrl: data.avatarUrl ?? null,
    email: data.email,
  };
}

/** Lê o perfil do usuário autenticado. */
export async function getProfile(): Promise<User> {
  const user = await me();
  try {
    const profile = await getProfileById(user.id);
    return {
      ...user,
      nickname: profile.nickname,
      avatarUrl: profile.avatarUrl,
    };
  } catch {
    return user;
  }
}

/** Atualiza o nickname do usuário autenticado. */
export async function updateNickname(nickname: string): Promise<User> {
  const user = await me();
  const response = await fetch(profileUrl, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: user.id, email: user.email, nickname }),
  });
  if (!response.ok) {
    throw new Error(
      await errorMessage(response, "Falha ao atualizar o apelido"),
    );
  }
  const data = (await response.json()) as User;
  return {
    id: data.id,
    email: data.email ?? user.email,
    nickname: data.nickname,
    avatarUrl: data.avatarUrl ?? null,
  };
}

/** Envia o avatar (data URL) do usuário autenticado. */
export async function uploadAvatar(avatarDataUrl: string): Promise<Profile> {
  const response = await fetch(profileAvatarUrl, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ avatarDataUrl }),
  });
  if (!response.ok) {
    const fallback =
      response.status === 413 ? AVATAR_TOO_LARGE : "Falha ao enviar avatar";
    throw new Error(await errorMessage(response, fallback));
  }
  return response.json() as Promise<Profile>;
}

/** Lê um arquivo de imagem e devolve data URL. */
export function readImageAsDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("o arquivo precisa ser uma imagem"));
  }
  if (file.size > 600_000) {
    return Promise.reject(new Error(AVATAR_TOO_LARGE));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") {
        reject(new Error("falha ao ler a imagem"));
        return;
      }
      if (dataUrl.length > 800_000) {
        reject(new Error(AVATAR_TOO_LARGE));
        return;
      }
      resolve(dataUrl);
    };
    reader.onerror = () => reject(new Error("falha ao ler a imagem"));
    reader.readAsDataURL(file);
  });
}
