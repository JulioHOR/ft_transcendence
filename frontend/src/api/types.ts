/** Authenticated user returned by the auth endpoints. */
export type User = {
  /** User ID. */
  id: number;
  /** Normalized user email. */
  email: string;
  /** User's public nickname. */
  nickname: string;
  /** Avatar URL, if available. */
  avatarUrl?: string | null;
};

/** Public profile (the current user or another user). */
export type Profile = {
  /** User ID. */
  id: number;
  /** User's public nickname. */
  nickname: string;
  /** Avatar URL, or null to use the default. */
  avatarUrl: string | null;
  /** Email, when available on the user's own profile. */
  email?: string;
};
