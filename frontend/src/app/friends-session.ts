import { createContext, useContext } from "react";
import type { Friend } from "../api/friends";

/** Valor compartilhado da lista de friends/presença. */
export type FriendsContextValue = {
  friends: Friend[];
};

/** Contexto React da lista de friends. */
export const FriendsContext = createContext<FriendsContextValue | null>(null);

/** Hook para ler a lista de friends dentro do FriendsProvider. */
export function useFriends(): FriendsContextValue {
  const value = useContext(FriendsContext);
  if (value === null) {
    throw new Error("useFriends deve ser usado dentro de FriendsProvider");
  }
  return value;
}
