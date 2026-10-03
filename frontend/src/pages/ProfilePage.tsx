import { useEffect, useState, type SubmitEvent } from "react";
import { profile } from "../api/client";
import type { User } from "../api/types";
import { ui } from "../ui/classes";

type NicknameFormProps = {
  user: User;
  onSaved: (user: User) => void;
};

type NicknameFormViewProps = {
  email: string;
  nickname: string;
  pending: boolean;
  error: string | null;
  onNickname: (value: string) => void;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
};

/** Exibe erro de formulário/página, se houver. */
function FormError({ error }: { error: string | null }) {
  if (error === null) return null;
  return (
    <p className="text-sm text-red-400" role="alert">
      {error}
    </p>
  );
}

/** Persiste o nickname via camada profile. */
async function saveNickname(
  event: SubmitEvent<HTMLFormElement>,
  nickname: string,
  onSaved: (user: User) => void,
  setError: (value: string | null) => void,
  setPending: (value: boolean) => void,
): Promise<void> {
  event.preventDefault();
  setError(null);
  setPending(true);
  try {
    onSaved(await profile.updateNickname(nickname));
  } catch (err) {
    setError(err instanceof Error ? err.message : "falha ao salvar");
  } finally {
    setPending(false);
  }
}

/** UI do formulário de nickname. */
function NicknameFormView(p: NicknameFormViewProps) {
  return (
    <form className="flex max-w-sm flex-col gap-2" onSubmit={p.onSubmit}>
      <p className={ui.muted}>Email: {p.email}</p>
      <input
        className={ui.field}
        value={p.nickname}
        onChange={(e) => p.onNickname(e.target.value)}
        placeholder="nickname"
      />
      <button className={ui.btn} type="submit" disabled={p.pending}>
        {p.pending ? "Salvando…" : "Salvar"}
      </button>
      <FormError error={p.error} />
    </form>
  );
}

/** Estado do formulário de nickname. */
function NicknameForm({ user, onSaved }: NicknameFormProps) {
  const [nickname, setNickname] = useState(user.nickname);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <NicknameFormView
      email={user.email}
      nickname={nickname}
      pending={pending}
      error={error}
      onNickname={setNickname}
      onSubmit={(e) => void saveNickname(e, nickname, onSaved, setError, setPending)}
    />
  );
}

/** Conteúdo da página conforme loading/erro/dados. */
function ProfileBody(props: {
  user: User | null;
  error: string | null;
  onSaved: (user: User) => void;
}) {
  if (props.error !== null) return <FormError error={props.error} />;
  if (props.user === null) return <p className={ui.muted}>Loading…</p>;
  return <NicknameForm user={props.user} onSaved={props.onSaved} />;
}

/** Página do perfil do usuário. */
export function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void profile.getProfile().then(setUser).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Falha ao carregar perfil");
    });
  }, []);
  return (
    <main className={`${ui.page} gap-4 p-4 sm:p-6`}>
      <h1 className={ui.title}>Perfil</h1>
      <ProfileBody user={user} error={error} onSaved={setUser} />
    </main>
  );
}