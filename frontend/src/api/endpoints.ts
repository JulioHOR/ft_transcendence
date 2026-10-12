/** URL HTTP do perfil: mock-api ou backend real. */
export const profileUrl =
  import.meta.env.VITE_MOCK_PROFILE === "true" ? "/mock/profile" : "/api/profile";

/** URL HTTP do upload de avatar: mock-api ou backend real. */
export const profileAvatarUrl =
  import.meta.env.VITE_MOCK_PROFILE === "true"
    ? "/mock/profile/avatar"
    : "/api/profile/avatar";

/** Path do avatar padrão quando o usuário não tem foto. */
export const defaultAvatarUrl = "/default-avatar.svg";

/** Path do Socket.IO do chat: mock-api ou backend real. */
export const chatSocketPath =
  import.meta.env.VITE_MOCK_CHAT === "true"
    ? "/mock/chat/socket/"
    : "/socket.io/";

/** URL HTTP do histórico de chat: mock-api ou backend real. */
export const chatHistoryUrl =
  import.meta.env.VITE_MOCK_CHAT === "true"
    ? "/mock/chat/history"
    : "/api/chat/history";

/** Path do Socket.IO de friends/presença: mock-api ou backend real. */
export const friendsSocketPath =
  import.meta.env.VITE_MOCK_FRIENDS === "true"
    ? "/mock/friends/socket/"
    : "/socket.io/";

/** URL HTTP de friends: mock-api ou backend real. */
export const friendsUrl =
  import.meta.env.VITE_MOCK_FRIENDS === "true" ? "/mock/friends" : "/api/friends";
