/** Usuário autenticado retornado pelos endpoints de auth. */
export type User = {
  /** Identificador do usuário. */
  id: number;
  /** Email normalizado do usuário. */
  email: string;
  /** Apelido público do usuário. */
  nickname: string;
  /** URL do avatar, se houver. */
  avatarUrl?: string | null;
};

/** Perfil público (próprio ou de outro usuário). */
export type Profile = {
  /** Identificador do usuário. */
  id: number;
  /** Apelido público do usuário. */
  nickname: string;
  /** URL do avatar, ou null para usar o default. */
  avatarUrl: string | null;
  /** Email, quando disponível no próprio perfil. */
  email?: string;
};
