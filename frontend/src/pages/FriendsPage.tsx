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

/** Envia o nickname para adicionar um friend e limpa o campo. */
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
      failure instanceof Error ? failure.message : "Falha ao adicionar amigo.",
    );
  } finally {
    setPending(false);
  }
}

/** Input com label do nickname do friend. */
function FriendNicknameField(props: {
  nickname: string;
  onNickname: (value: string) => void;
}) {
  return (
    <AppTextField
      id="friend-nickname"
      label="Apelido"
      value={props.nickname}
      placeholder="apelido do amigo"
      sx={{ flex: 1, minWidth: 0 }}
      onChange={(event) => props.onNickname(event.target.value)}
    />
  );
}

/** Campos do formulário de adicionar friend. */
function AddFriendFields(props: {
  nickname: string;
  pending: boolean;
  onNickname: (value: string) => void;
}) {
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

/** Formulário de adição de friend pelo nickname. */
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

/** Props de uma linha de friend na lista. */
type FriendRowProps = {
  friend: Friend;
  onAccept: (fromId: number) => void;
  onReject: (fromId: number) => void;
  onRemove: (friendId: number) => void;
};

/** Botões Aceitar / Recusar de um convite recebido. */
function IncomingActions(props: {
  fromId: number;
  onAccept: (fromId: number) => void;
  onReject: (fromId: number) => void;
}) {
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

/** Botões de uma linha conforme relação. */
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

/** Link para o perfil público do friend. */
function FriendProfileLink({ friend }: { friend: Friend }) {
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

/** Linha: avatar, nickname, online, relação e ações. */
function FriendSummary({ friend }: { friend: Friend }) {
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

/** Props da lista de friends. */
type FriendsListProps = {
  friends: Friend[];
  onAccept: (fromId: number) => void;
  onReject: (fromId: number) => void;
  onRemove: (friendId: number) => void;
};

/** Filtra friends por relation. */
function byRelation(friends: Friend[], relation: Friend["relation"]): Friend[] {
  return friends.filter((friend) => friend.relation === relation);
}

type FriendSectionProps = {
  title: string;
  friends: Friend[];
  onAccept: (fromId: number) => void;
  onReject: (fromId: number) => void;
  onRemove: (friendId: number) => void;
};

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

/** Lista de friends do contexto. */
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

function FriendsList(props: FriendsListProps) {
  if (props.friends.length === 0) {
    return (
      <EmptyState>Nenhum amigo na lista ainda.</EmptyState>
    );
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

/** Link para abrir conversa privada com um friend aceito. */
function FriendPrivateChatLink({ friend }: { friend: Friend }) {
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

/** Handlers dos botões de convite/remoção. */
function friendHandlers(setError: (value: string | null) => void) {
  const run = (action: () => Promise<unknown>, fallback: string) => {
    setError(null);
    void action().catch((failure: unknown) => {
      setError(failure instanceof Error ? failure.message : fallback);
    });
  };
  return {
    onAccept: (fromId: number) =>
      run(() => acceptFriend(fromId), "Falha ao aceitar convite."),
    onReject: (fromId: number) =>
      run(() => rejectFriend(fromId), "Falha ao recusar convite."),
    onRemove: (friendId: number) =>
      run(() => removeFriend(friendId), "Falha ao remover amigo."),
  };
}

/** Página de friends/presença e convites. */
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

function FriendsContent(props: {
  friends: Friend[];
  actionError: string | null;
  handlers: ReturnType<typeof friendHandlers>;
}) {
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

function FriendSections(props: {
  friends: Friend[];
  handlers: ReturnType<typeof friendHandlers>;
}) {
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
