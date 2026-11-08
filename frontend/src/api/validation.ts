/** Mesmo formato básico de e-mail exigido pelo backend. */
export const EMAIL_PATTERN = "[^@\\s]+@[^@\\s]+\\.[^@\\s]+";

/** Limites compartilhados para apelidos de usuário. */
export const NICKNAME_MIN_LENGTH = 3;
export const NICKNAME_MAX_LENGTH = 20;
export const NICKNAME_PATTERN = "[A-Za-z0-9_]+";

/** Tamanho mínimo da senha no cadastro. */
export const PASSWORD_MIN_LENGTH = 8;

/** Tipos aceitos para o arquivo de avatar. */
export const AVATAR_ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

/** Mensagem exibida quando o avatar excede o tamanho permitido. */
export const AVATAR_TOO_LARGE = "imagem muito grande (máx. 600KB)";

/** Tamanho máximo aceito para o arquivo de avatar. */
export const MAX_AVATAR_FILE_SIZE = 599_900;

/** Maior dimensão permitida para a imagem do avatar. */
export const MAX_AVATAR_DIMENSION = 4096;

/** Quantidade máxima de caracteres permitida em uma mensagem. */
export const MAX_CHAT_MESSAGE_LENGTH = 1000;
