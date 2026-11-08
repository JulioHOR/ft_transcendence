import type { Friend } from "../api/friends";

/** Props do campo de nickname de um amigo. */
export type FriendNicknameFieldProps = {
  nickname: string;
  onNickname: (value: string) => void;
};

/** Props dos campos do formulário de amizade. */
export type AddFriendFieldsProps = FriendNicknameFieldProps & {
  pending: boolean;
};

/** Ações disponíveis para uma linha de amigo. */
export type FriendActionHandlers = {
  onAccept: (fromId: number) => void;
  onReject: (fromId: number) => void;
  onRemove: (friendId: number) => void;
};

/** Props de uma linha de amigo. */
export type FriendRowProps = FriendActionHandlers & { friend: Friend };

/** Props dos botões de um convite recebido. */
export type IncomingActionsProps = Pick<
  FriendActionHandlers,
  "onAccept" | "onReject"
> & { fromId: number };

/** Props que identificam um amigo. */
export type FriendProps = { friend: Friend };

/** Props da lista de amigos. */
export type FriendsListProps = FriendActionHandlers & { friends: Friend[] };

/** Props de uma seção filtrada de amigos. */
export type FriendSectionProps = FriendsListProps & { title: string };

/** Props do conteúdo principal da página de amigos. */
export type FriendsContentProps = {
  friends: Friend[];
  actionError: string | null;
  handlers: FriendActionHandlers;
};

/** Props das seções de amigos. */
export type FriendSectionsProps = {
  friends: Friend[];
  handlers: FriendActionHandlers;
};
