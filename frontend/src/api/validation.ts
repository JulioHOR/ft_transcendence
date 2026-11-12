/** Same basic email format required by the backend. */
export const EMAIL_PATTERN = "[^@\\s]+@[^@\\s]+\\.[^@\\s]+";

/** Shared limits for user nicknames. */
export const NICKNAME_MIN_LENGTH = 3;
export const NICKNAME_MAX_LENGTH = 20;
export const NICKNAME_PATTERN = "[A-Za-z0-9_]+";

/** Minimum password length for registration. */
export const PASSWORD_MIN_LENGTH = 8;

/** Accepted MIME types for the avatar file. */
export const AVATAR_ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

/** Message displayed when the avatar exceeds the allowed size. */
export const AVATAR_TOO_LARGE = "imagem muito grande (máx. 600KB)";

/** Maximum accepted size for the avatar file. */
export const MAX_AVATAR_FILE_SIZE = 599_900;

/** Maximum allowed dimension for the avatar image. */
export const MAX_AVATAR_DIMENSION = 4096;

/** Maximum number of characters allowed in a message. */
export const MAX_CHAT_MESSAGE_LENGTH = 1000;
