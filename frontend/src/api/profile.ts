import { me } from "./auth";
import { apiFetch } from "./api";
import { defaultAvatarUrl, profileAvatarUrl, profileUrl } from "./endpoints";
import { errorMessage } from "./http";
import type { Profile, User } from "./types";

/** Mensagem quando o avatar excede o tamanho permitido. */
const AVATAR_TOO_LARGE = "imagem muito grande (máx. 600KB)";
export const AVATAR_ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_AVATAR_FILE_SIZE = 599_900;
const MAX_AVATAR_DIMENSION = 4096;

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
  const response = await apiFetch(`${profileUrl}?id=${userId}`);
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
  if (user == null) throw new Error("Sua sessão expirou. Entre novamente.");
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

/** Atualiza os dados de acesso ou o apelido do usuário autenticado. */
export async function updateProfile(
  profile: Pick<User, "email" | "nickname">,
): Promise<User> {
  const response = await apiFetch(profileUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  if (!response.ok) {
    throw new Error(
      await errorMessage(response, "Falha ao atualizar o perfil"),
    );
  }
  const data = (await response.json()) as User;
  return {
    id: data.id,
    email: data.email,
    nickname: data.nickname,
    avatarUrl: data.avatarUrl ?? null,
  };
}

/** Envia o avatar (data URL) do usuário autenticado. */
export async function uploadAvatar(avatarDataUrl: string): Promise<Profile> {
  const response = await apiFetch(profileAvatarUrl, {
    method: "POST",
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

/** Remove a foto do perfil do usuário autenticado. */
export async function deleteAvatar(): Promise<Profile> {
  const response = await apiFetch(profileAvatarUrl, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response, "Falha ao remover avatar"));
  }
  return response.json() as Promise<Profile>;
}

/** Lê um arquivo de imagem e devolve data URL. */
export async function readImageAsDataUrl(file: File): Promise<string> {
  await validateImageFile(file);
  return readFileAsDataUrl(file);
}

async function validateImageFile(file: File): Promise<void> {
  if (!AVATAR_ACCEPTED_TYPES.includes(file.type)) {
    throw new Error("Escolha uma imagem PNG, JPEG ou WebP.");
  }
  if (file.size > MAX_AVATAR_FILE_SIZE) {
    throw new Error(AVATAR_TOO_LARGE);
  }
  const image = await createImageBitmap(file).catch(() => {
    throw new Error("O arquivo não é uma imagem válida ou está corrompido.");
  });
  try {
    if (Math.max(image.width, image.height) > MAX_AVATAR_DIMENSION) {
      throw new Error("A imagem deve ter no máximo 4096 × 4096 pixels.");
    }
  } finally {
    image.close();
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") {
        reject(new Error("falha ao ler a imagem"));
        return;
      }
      resolve(dataUrl);
    };
    reader.onerror = () => reject(new Error("falha ao ler a imagem"));
    reader.readAsDataURL(file);
  });
}
