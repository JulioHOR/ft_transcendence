import { useState, type SubmitEvent } from "react";
import {
  addFriend,
  acceptFriend,
  rejectFriend,
  removeFriend,
  type Friend,
} from "../api/friends";
import { useFriends } from "../app/friends-session";
import { ErrorText } from "../ui/ErrorText";
import { ui } from "../ui/classes";

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
    setError(failure instanceof Error ? failure.message : "falha ao adicionar");
  } finally {
    setPending(false);
  }
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
      <input
        className={ui.field}
        value={props.nickname}
        placeholder="nickname do friend"
        onChange={(event) => props.onNickname(event.target.value)}
      />
      <button className={ui.btn} type="submit" disabled={props.pending}>
        {label}
      </button>
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
    <form className={`${ui.row} max-w-md items-end`} onSubmit={onSubmit}>
      <AddFriendFields nickname={nickname} pending={pending} onNickname={setNickname} />
      <ErrorText error={error} />
    </form>
  );
}

/** Texto da relação (convite / friend). */
function relationLabel(friend: Friend): string {
  if (friend.relation === "outgoing") return "convite enviado";
  if (friend.relation === "incoming") return "convite recebido";
  return "friend";
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
      <button className={ui.btn} type="button" onClick={() => props.onAccept(props.fromId)}>
        Aceitar
      </button>
      <button className={ui.btn} type="button" onClick={() => props.onReject(props.fromId)}>
        Recusar
      </button>
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
  return (
    <button className={ui.btn} type="button" onClick={() => props.onRemove(props.friend.id)}>
      Remover
    </button>
  );
}

/** Linha: nickname, online, relação e ações. */
function FriendRow(props: FriendRowProps) {
  const statusClass = props.friend.online ? ui.online : ui.offline;
  const statusLabel = props.friend.online ? "online" : "offline";
  return (
    <li className={`flex flex-wrap items-center gap-3 ${ui.muted}`}>
      <strong className="text-zinc-200">{props.friend.nickname}</strong>
      <span className={statusClass}>{statusLabel}</span>
      <span>{relationLabel(props.friend)}</span>
      <FriendActions {...props} />
    </li>
  );
}

/** Props da lista de friends. */
type FriendsListProps = {
  friends: Friend[];
  onAccept: (fromId: number) => void;
  onReject: (fromId: number) => void;
  onRemove: (friendId: number) => void;
};

/** Lista de friends do contexto. */
function FriendsList(props: FriendsListProps) {
  if (props.friends.length === 0) {
    return <p className={ui.muted}>Nenhum friend na lista ainda.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {props.friends.map((friend) => (
        <FriendRow
          key={`${friend.id}-${friend.relation}-${friend.status}`}
          friend={friend}
          onAccept={props.onAccept}
          onReject={props.onReject}
          onRemove={props.onRemove}
        />
      ))}
    </ul>
  );
}

/** Dispara uma ação de friend e reporta erro. */
function runFriendAction(
  action: () => Promise<unknown>,
  setError: (value: string | null) => void,
  fallback: string,
): void {
  setError(null);
  void action().catch((failure: unknown) => {
    setError(failure instanceof Error ? failure.message : fallback);
  });
}

/** Página de friends/presença e convites. */
export function FriendsPage() {
  const { friends } = useFriends();
  const [actionError, setActionError] = useState<string | null>(null);
  return (
    <main className={`${ui.page} gap-4 p-4 sm:p-6`}>
      <h1 className={ui.title}>Friends</h1>
      <AddFriendForm />
      <ErrorText error={actionError} />
      <FriendsList
        friends={friends}
        onAccept={(fromId) => runFriendAction(() => acceptFriend(fromId), setActionError, "falha ao aceitar")}
        onReject={(fromId) => runFriendAction(() => rejectFriend(fromId), setActionError, "falha ao recusar")}
        onRemove={(friendId) => runFriendAction(() => removeFriend(friendId), setActionError, "falha ao remover")}
      />
    </main>
  );
}
