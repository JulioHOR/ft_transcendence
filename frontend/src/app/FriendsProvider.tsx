import { useEffect, useState, type ReactNode } from "react";
import { createFriendsTransport, type Friend } from "../api/friends";
import { useAuth } from "./auth-session";
import { FriendsContext } from "./friends-session";

type FriendsProviderProps = {
  children: ReactNode;
};

/** Conecta/desconecta o socket de friends conforme a sessão. */
function useFriendsConnection(
  userId: number | null,
  ready: boolean,
  setFriends: (friends: Friend[]) => void,
): void {
  useEffect(() => {
    if (!ready || userId === null) {
      setFriends([]);
      return;
    }

    const transport = createFriendsTransport();
    transport.onUpdate(setFriends);
    void transport.connect();

    return () => {
      transport.disconnect();
    };
  }, [ready, userId, setFriends]);
}

/** Provedor da lista de friends/presença. */
export function FriendsProvider({ children }: FriendsProviderProps) {
  const { user, ready } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  useFriendsConnection(user?.id ?? null, ready, setFriends);

  return (
    <FriendsContext.Provider value={{ friends }}>
      {children}
    </FriendsContext.Provider>
  );
}
