import { useEffect, useState, type SubmitEvent } from "react";
import { getProfile, updateNickname } from "../api/profile";
import { useAuth } from "../app/auth-session";
import type { User } from "../api/types";
import { ErrorText } from "../ui/ErrorText";
import { ui } from "../ui/classes";

/** Persiste o nickname e atualiza o estado da página. */
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
    onSaved(await updateNickname(nickname));
  } catch (failure: unknown) {
    setError(failure instanceof Error ? failure.message : "falha ao salvar");
  } finally {
    setPending(false);
  }
}

/** Props dos campos do formulário de nickname. */
type NicknameFieldsProps = {
  email: string;
  nickname: string;
  pending: boolean;
  onNickname: (value: string) => void;
};

/** Campos de email (somente leitura) e nickname. */
function NicknameFields(props: NicknameFieldsProps) {
  return (
    <>
      <p className={ui.muted}>Email: {props.email}</p>
      <input
        className={ui.field}
        value={props.nickname}
        placeholder="nickname"
        onChange={(event) => props.onNickname(event.target.value)}
      />
      <button className={ui.btn} type="submit" disabled={props.pending}>
        {props.pending ? "Salvando…" : "Salvar"}
      </button>
    </>
  );
}

/** Props do formulário de nickname. */
type NicknameFormProps = {
  user: User;
  onSaved: (user: User) => void;
};

/** Estado e envio do formulário de nickname. */
function NicknameForm(props: NicknameFormProps) {
  const [nickname, setNickname] = useState(props.user.nickname);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    void saveNickname(event, nickname, props.onSaved, setError, setPending);
  };
  return (
    <form className="flex max-w-sm flex-col gap-2" onSubmit={onSubmit}>
      <NicknameFields
        email={props.user.email}
        nickname={nickname}
        pending={pending}
        onNickname={setNickname}
      />
      <ErrorText error={error} />
    </form>
  );
}

/** Props do corpo da página de perfil. */
type ProfileBodyProps = {
  user: User | null;
  error: string | null;
  onSaved: (user: User) => void;
};

/** Conteúdo da página conforme loading, erro ou dados. */
function ProfileBody(props: ProfileBodyProps) {
  if (props.error) return <ErrorText error={props.error} />;
  if (!props.user) return <p className={ui.muted}>Loading…</p>;
  return <NicknameForm user={props.user} onSaved={props.onSaved} />;
}

/** Atualiza o perfil local e a sessão (useAuth) após salvar. */
function applySavedUser(
  nextUser: User,
  setProfileUser: (user: User) => void,
  setSessionUser: (user: User | null) => void,
): void {
  setProfileUser(nextUser);
  setSessionUser(nextUser);
}

/** Carrega o perfil na montagem da página. */
function useLoadProfile(
  setUser: (user: User) => void,
  setError: (value: string | null) => void,
): void {
  useEffect(() => {
    void getProfile()
      .then(setUser)
      .catch((failure: unknown) => {
        setError(failure instanceof Error ? failure.message : "Falha ao carregar perfil");
      });
  }, [setUser, setError]);
}

/** Página do perfil do usuário. */
export function ProfilePage() {
  const { setUser: setSessionUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  useLoadProfile(setUser, setError);
  return (
    <main className={`${ui.page} gap-4 p-4 sm:p-6`}>
      <h1 className={ui.title}>Perfil</h1>
      <ProfileBody
        user={user}
        error={error}
        onSaved={(nextUser) => applySavedUser(nextUser, setUser, setSessionUser)}
      />
    </main>
  );
}
