import { useState, type SubmitEvent } from "react";
import { Link as RouterLink } from "react-router-dom";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import MuiLink from "@mui/material/Link";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Stack from "@mui/material/Stack";
import {
  addFriend,
  acceptFriend,
  rejectFriend,
  removeFriend,
  type Friend,
} from "../api/friends";
import { friendlyError } from "../api/http";
import {
  NICKNAME_MAX_LENGTH,
  NICKNAME_MIN_LENGTH,
  NICKNAME_PATTERN,
} from "../api/validation";
import { useFriends } from "../app/friends-session";
import { buildPrivateChatPath } from "../chat/privateChat";
import { Avatar } from "../ui/Avatar";
import { ErrorText } from "../ui/ErrorText";
import { ActionButton } from "../ui/ActionButton";
import { AppTextField } from "../ui/AppTextField";
import { PageContainer } from "../ui/PageContainer";
import { PageHeading } from "../ui/PageHeading";
import { SectionCard } from "../ui/SectionCard";
import { EmptyState } from "../ui/EmptyState";
import type {
  AddFriendFieldsProps,
  FriendNicknameFieldProps,
  FriendActionHandlers,
  FriendProps,
  FriendRowProps,
  FriendSectionProps,
  FriendsContentProps,
  FriendsListProps,
  FriendSectionsProps,
  IncomingActionsProps,
} from "./friendsProps";

/** Submits the nickname to add a friend and clears the field. */
async function submitAddFriend(
  event: SubmitEvent<HTMLFormElement>,
  nickname: string,
  setNickname: (value: string) => void,
  setError: (value: string | null) => void,
  setPending: (value: boolean) => void,
): Promise<void> {
  event.preventDefault();
  setError(null);
  setPending(true);
  try {
    await addFriend(nickname.trim());
    setNickname("");
  } catch (failure: unknown) {
    setError(
      friendlyError(
        failure,
        "Falha ao adicionar amigo.",
        "Falha ao adicionar amigo",
      ),
    );
  } finally {
    setPending(false);
  }
}

/** Input with a label for the friend's nickname. */
function FriendNicknameField(props: FriendNicknameFieldProps) {
  return (
    <AppTextField
      id="friend-nickname"
      label="Apelido"
      required
      slotProps={{
        htmlInput: {
          minLength: NICKNAME_MIN_LENGTH,
          maxLength: NICKNAME_MAX_LENGTH,
          pattern: NICKNAME_PATTERN,
        },
      }}
      value={props.nickname}
      placeholder="apelido do amigo"
      sx={{ flex: 1, minWidth: 0 }}
      onChange={(event) => props.onNickname(event.target.value)}
    />
  );
}

/** Fields in the add-friend form. */
function AddFriendFields(props: AddFriendFieldsProps) {
  const label = props.pending ? "Adicionando…" : "Adicionar";
  return (
    <>
      <FriendNicknameField
        nickname={props.nickname}
        onNickname={props.onNickname}
      />
      <ActionButton
        type="submit"
        disabled={props.pending}
        sx={{ width: { xs: "100%", sm: "auto" } }}
      >
        {label}
      </ActionButton>
    </>
  );
}

/** Form for adding a friend by nickname. */
function AddFriendForm() {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    void submitAddFriend(event, nickname, setNickname, setError, setPending);
  };
  return (
    <Stack spacing={1.5}>
      <Stack
        component="form"
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        onSubmit={onSubmit}
      >
        <AddFriendFields
          nickname={nickname}
          pending={pending}
          onNickname={setNickname}
        />
      </Stack>
      <ErrorText error={error} />
    </Stack>
  );
}

/** Accept / Decline buttons for a received request. */
function IncomingActions(props: IncomingActionsProps) {
  return (
    <>
      <ActionButton
        appearance="primary"
        size="small"
        type="button"
        onClick={() => props.onAccept(props.fromId)}
      >
        Aceitar
      </ActionButton>
      <ActionButton
        size="small"
        type="button"
        onClick={() => props.onReject(props.fromId)}
      >
        Recusar
      </ActionButton>
    </>
  );
}

/** Row buttons based on the relationship. */
function FriendActions(props: FriendRowProps) {
  if (props.friend.relation === "incoming") {
    return (
      <IncomingActions
        fromId={props.friend.id}
        onAccept={props.onAccept}
        onReject={props.onReject}
      />
    );
  }
  const label = props.friend.relation === "outgoing" ? "Cancelar" : "Remover";
  return (
    <>
      <FriendPrivateChatLink friend={props.friend} />
      <ActionButton
        size="small"
        type="button"
        onClick={() => props.onRemove(props.friend.id)}
      >
        {label}
      </ActionButton>
    </>
  );
}

/** Link to the friend's public profile. */
function FriendProfileLink({ friend }: FriendProps) {
  return (
    <MuiLink
      component={RouterLink}
      to={`/profile/${friend.id}`}
      underline="hover"
      color="text.primary"
    >
      {friend.nickname}
    </MuiLink>
  );
}

/** Row: avatar, nickname, online status, relationship, and actions. */
function FriendSummary({ friend }: FriendProps) {
  return (
    <>
      <Avatar
        userId={friend.id}
        avatarUrl={friend.avatarUrl}
        alt={friend.nickname}
        size="sm"
      />
      <FriendProfileLink friend={friend} />
      <Chip
        size="small"
        label={friend.online ? "Conectado" : "Desconectado"}
        color={friend.online ? "success" : "default"}
        variant="outlined"
      />
    </>
  );
}

/** Displays a complete row in the friends list. */
function FriendRow(props: FriendRowProps) {
  return (
    <ListItem
      component="li"
      disableGutters
      sx={{ flexWrap: "wrap", gap: 1.5, py: 1 }}
    >
      <FriendSummary friend={props.friend} />
      <Stack direction="row" spacing={1} sx={{ ml: { xs: 0, sm: "auto" } }}>
        <FriendActions {...props} />
      </Stack>
    </ListItem>
  );
}

/** Props for the friends list. */
/** Filters friends by relationship. */
function byRelation(friends: Friend[], relation: Friend["relation"]): Friend[] {
  return friends.filter((friend) => friend.relation === relation);
}

/** Displays a friends section when there are items to show. */
function FriendSection(props: FriendSectionProps) {
  if (props.friends.length === 0) return null;
  return (
    <Stack component="section" spacing={1.5}>
      <PageHeading>{props.title}</PageHeading>
      <FriendsList
        friends={props.friends}
        onAccept={props.onAccept}
        onReject={props.onReject}
        onRemove={props.onRemove}
      />
    </Stack>
  );
}

/** Friends list from the context. */
function FriendRows(props: FriendsListProps) {
  return (
    <>
      {props.friends.map((friend) => (
        <FriendRow
          key={`${friend.id}-${friend.relation}-${friend.status}`}
          friend={friend}
          onAccept={props.onAccept}
          onReject={props.onReject}
          onRemove={props.onRemove}
        />
      ))}
    </>
  );
}

/** Displays the list or the section's empty state. */
function FriendsList(props: FriendsListProps) {
  if (props.friends.length === 0) {
    return <EmptyState>Nenhum amigo na lista ainda.</EmptyState>;
  }
  return (
    <List
      component="ul"
      disablePadding
      sx={{ "& > li + li": { borderTop: 1, borderColor: "divider" } }}
    >
      <FriendRows {...props} />
    </List>
  );
}

/** Link to open a private conversation with an accepted friend. */
function FriendPrivateChatLink({ friend }: FriendProps) {
  if (friend.relation !== "friend") return null;
  return (
    <Button
      component={RouterLink}
      to={buildPrivateChatPath(friend.id, friend.nickname)}
      variant="outlined"
      size="small"
    >
      Conversar
    </Button>
  );
}

/** Handlers for the request / removal buttons. */
function friendHandlers(setError: (value: string | null) => void) {
  const run = (action: () => Promise<unknown>, fallback: string) => {
    setError(null);
    void action().catch((failure: unknown) => {
      setError(
        friendlyError(failure, fallback, "Falha em uma ação de amizade"),
      );
    });
  };
  return {
    onAccept: (fromId: number) =>
      run(() => acceptFriend(fromId), "Falha ao aceitar convite."),
    onReject: (fromId: number) =>
      run(() => rejectFriend(fromId), "Falha ao recusar convite."),
    onRemove: (friendId: number) =>
      run(() => removeFriend(friendId), "Falha ao remover amigo."),
  } satisfies FriendActionHandlers;
}

/** Friends / presence and requests page. */
export function FriendsPage() {
  const { friends } = useFriends();
  const [actionError, setActionError] = useState<string | null>(null);
  const handlers = friendHandlers(setActionError);
  return (
    <PageContainer>
      <FriendsContent
        friends={friends}
        actionError={actionError}
        handlers={handlers}
      />
    </PageContainer>
  );
}

/** Builds the form, errors, and page sections. */
function FriendsContent(props: FriendsContentProps) {
  return (
    <Stack spacing={2}>
      <SectionCard sx={{ p: 2 }}>
        <AddFriendForm />
      </SectionCard>
      <ErrorText error={props.actionError} />
      <FriendSections friends={props.friends} handlers={props.handlers} />
    </Stack>
  );
}

/** Distributes friends among the three displayed relationships. */
function FriendSections(props: FriendSectionsProps) {
  return (
    <>
      <FriendSection
        title="Convites recebidos"
        friends={byRelation(props.friends, "incoming")}
        {...props.handlers}
      />
      <FriendSection
        title="Convites enviados"
        friends={byRelation(props.friends, "outgoing")}
        {...props.handlers}
      />
      <FriendSection
        title="Amigos"
        friends={byRelation(props.friends, "friend")}
        {...props.handlers}
      />
    </>
  );
}
