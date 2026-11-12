import type { Friend } from "../api/friends";

/** Props for a friend's nickname field. */
export type FriendNicknameFieldProps = {
  nickname: string;
  onNickname: (value: string) => void;
};

/** Props for the friend request form fields. */
export type AddFriendFieldsProps = FriendNicknameFieldProps & {
  pending: boolean;
};

/** Actions available for a friend row. */
export type FriendActionHandlers = {
  onAccept: (fromId: number) => void;
  onReject: (fromId: number) => void;
  onRemove: (friendId: number) => void;
};

/** Props for a friend row. */
export type FriendRowProps = FriendActionHandlers & { friend: Friend };

/** Props for the buttons on a received request. */
export type IncomingActionsProps = Pick<
  FriendActionHandlers,
  "onAccept" | "onReject"
> & { fromId: number };

/** Props that identify a friend. */
export type FriendProps = { friend: Friend };

/** Props for the friends list. */
export type FriendsListProps = FriendActionHandlers & { friends: Friend[] };

/** Props for a filtered friends section. */
export type FriendSectionProps = FriendsListProps & { title: string };

/** Props for the main content of the friends page. */
export type FriendsContentProps = {
  friends: Friend[];
  actionError: string | null;
  handlers: FriendActionHandlers;
};

/** Props for the friends sections. */
export type FriendSectionsProps = {
  friends: Friend[];
  handlers: FriendActionHandlers;
};
