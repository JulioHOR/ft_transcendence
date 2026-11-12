import { createContext, useContext } from "react";
import type { Friend } from "../api/friends";

/** Shared friends/presence list value. */
export type FriendsContextValue = {
  friends: Friend[];
  pendingCount: number;
};

/** React context for the friends list. */
export const FriendsContext = createContext<FriendsContextValue | null>(null);

/** Hook for reading the friends list inside FriendsProvider. */
export function useFriends(): FriendsContextValue {
  const value = useContext(FriendsContext);
  if (value === null) {
    throw new Error("useFriends deve ser usado dentro de FriendsProvider");
  }
  return value;
}
