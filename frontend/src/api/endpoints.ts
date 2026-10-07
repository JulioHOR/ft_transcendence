/** URL HTTP do perfil: mock-api ou backend real. */
export const profileUrl =
  import.meta.env.VITE_MOCK_PROFILE === "true" ? "/mock/profile" : "/api/profile";

/** Path do Socket.IO do chat: mock-api ou backend real. */
export const chatSocketPath =
  import.meta.env.VITE_MOCK_CHAT === "true" ? "/mock/chat/" : "/socket.io/";
