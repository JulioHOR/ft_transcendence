/** Usuário autenticado retornado pelos endpoints de auth. */
export type User = {
  /** Identificador do usuário. */
  id: number;
  /** Email normalizado do usuário. */
  email: string;
  /** Apelido público do usuário. */
  nickname: string;
};
