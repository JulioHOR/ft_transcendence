/** URL HTTP do perfil: mock-api ou backend real. */
export const profileUrl =
  import.meta.env.VITE_MOCK_PROFILE === "true" ? "/mock/profile" : "/api/profile";

/** Path do Socket.IO do chat: mock-api ou backend real. */
export const chatSocketPath =
  import.meta.env.VITE_MOCK_CHAT === "true" ? "/mock/chat/" : "/socket.io/";


/** Path do Socket.IO de friends/presença: mock-api ou backend real. */
export const friendsSocketPath =
  import.meta.env.VITE_MOCK_FRIENDS === "true"
    ? "/mock/friends/socket/"
    : "/socket.io/";

/** URL HTTP de friends: mock-api ou backend real. */
export const friendsUrl =
  import.meta.env.VITE_MOCK_FRIENDS === "true" ? "/mock/friends" : "/api/friends";