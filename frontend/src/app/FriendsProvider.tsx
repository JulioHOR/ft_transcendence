import { useEffect, useState } from "react";
import { createFriendsTransport, type Friend } from "../api/friends";
import { useAuth } from "./auth-session";
import { FriendsContext } from "./friends-session";
import type { FriendsProviderProps } from "./props";

/** Connects or disconnects the friends socket based on the session. */
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

/** Provider for the friends/presence list. */
export function FriendsProvider({ children }: FriendsProviderProps) {
  const { user, ready } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  useFriendsConnection(user?.id ?? null, ready, setFriends);
  const pendingCount = friends.filter(
    (friend) => friend.relation === "incoming",
  ).length;

  return (
    <FriendsContext.Provider value={{ friends, pendingCount }}>
      {children}
    </FriendsContext.Provider>
  );
}
