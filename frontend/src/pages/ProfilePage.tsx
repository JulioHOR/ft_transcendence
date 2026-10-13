import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type RefObject,
  type SubmitEvent,
} from "react";
import { Link, useParams } from "react-router-dom";
import {
  getProfile,
  getProfileById,
  readImageAsDataUrl,
  updateNickname,
  uploadAvatar,
} from "../api/profile";
import type { Profile, User } from "../api/types";
import { useAuth } from "../app/auth-session";
import { Avatar } from "../ui/Avatar";
import { ErrorText } from "../ui/ErrorText";
import { ui } from "../ui/classes";

/** Campo somente leitura de email. */
function EmailDisplay(props: { email: string }) {
  return (
    <div className={ui.fieldBlock}>
      <span className={ui.label}>Email</span>
      <p className={ui.text}>{props.email}</p>
    </div>
  );
}

/** Campo editável de nickname. */
function NicknameInput(props: {
  nickname: string;
  onNickname: (value: string) => void;
}) {
  return (
    <div className={ui.fieldBlock}>
      <label className={ui.label} htmlFor="profile-nickname">
        Nickname
      </label>
      <input
        id="profile-nickname"
        className={ui.field}
        value={props.nickname}
        placeholder="nickname"
        onChange={(event) => props.onNickname(event.target.value)}
      />
    </div>
  );
}

/** Campos do formulário de nickname. */
function NicknameFields(props: {
  email: string;
  nickname: string;
  pending: boolean;
  onNickname: (value: string) => void;
}) {
  return (
    <>
      <EmailDisplay email={props.email} />
      <NicknameInput nickname={props.nickname} onNickname={props.onNickname} />
      <button className={ui.btn} type="submit" disabled={props.pending}>
        {props.pending ? "Salvando…" : "Salvar"}
      </button>
    </>
  );
}

/** Persiste nickname e devolve usuário atualizado. */
async function submitNickname(
  nickname: string,
  onSaved: (user: User) => void,
  setError: (value: string | null) => void,
  setPending: (value: boolean) => void,
): Promise<void> {
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

/** Formulário de nickname do próprio perfil. */
function NicknameForm(props: { user: User; onSaved: (user: User) => void }) {
  const [nickname, setNickname] = useState(props.user.nickname);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  function onSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    void submitNickname(nickname, props.onSaved, setError, setPending);
  }
  return (
    <form className={ui.formCol} onSubmit={onSubmit}>
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

/** Envia o arquivo escolhido como avatar. */
async function saveAvatarFile(
  file: File | undefined,
  onSaved: (profile: Profile) => void,
  setError: (value: string | null) => void,
  setPending: (value: boolean) => void,
): Promise<void> {
  if (file == null) return;
  setError(null);
  setPending(true);
  try {
    onSaved(await uploadAvatar(await readImageAsDataUrl(file)));
  } catch (failure: unknown) {
    setError(failure instanceof Error ? failure.message : "falha ao salvar avatar");
  } finally {
    setPending(false);
  }
}

/** Botão que abre o seletor de arquivo de avatar. */
function AvatarPickButton(props: {
  inputRef: RefObject<HTMLInputElement | null>;
  pending: boolean;
  hasAvatar: boolean;
}) {
  const label = props.pending
    ? "Enviando…"
    : props.hasAvatar
      ? "Trocar avatar"
      : "Enviar avatar";
  return (
    <button
      className={ui.btn}
      type="button"
      disabled={props.pending}
      onClick={() => props.inputRef.current?.click()}
    >
      {label}
    </button>
  );
}

/** Input oculto de arquivo de avatar. */
const AvatarFileInput = forwardRef<
  HTMLInputElement,
  { onFile: (file: File | undefined) => void }
>(function AvatarFileInput(props, ref) {
  function onChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    event.target.value = "";
    props.onFile(file);
  }
  return (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      className={ui.fileInput}
      onChange={onChange}
    />
  );
});

/** Upload / troca de avatar do próprio perfil. */
function AvatarEditor(props: {
  avatarUrl: string | null | undefined;
  nickname: string;
  onSaved: (profile: Profile) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  function onFile(file: File | undefined): void {
    void saveAvatarFile(file, props.onSaved, setError, setPending);
  }
  return (
    <div className={ui.stack}>
      <span className={ui.label}>Avatar</span>
      <Avatar avatarUrl={props.avatarUrl} alt={props.nickname} size="lg" />
      <AvatarFileInput ref={inputRef} onFile={onFile} />
      <AvatarPickButton
        inputRef={inputRef}
        pending={pending}
        hasAvatar={props.avatarUrl != null && props.avatarUrl !== ""}
      />
      <ErrorText error={error} />
    </div>
  );
}

/** Corpo editável do próprio perfil. */
function OwnProfileBody(props: {
  user: User;
  onSaved: (user: User) => void;
}) {
  return (
    <div className={ui.stackLg}>
      <AvatarEditor
        avatarUrl={props.user.avatarUrl}
        nickname={props.user.nickname}
        onSaved={(profile) =>
          props.onSaved({
            ...props.user,
            nickname: profile.nickname,
            avatarUrl: profile.avatarUrl,
          })
        }
      />
      <NicknameForm user={props.user} onSaved={props.onSaved} />
    </div>
  );
}

/** Carrega o perfil do usuário autenticado. */
function useOwnProfileLoad(): {
  user: User | null;
  setUser: (user: User) => void;
  error: string | null;
} {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void getProfile()
      .then(setUser)
      .catch((failure: unknown) => {
        setError(failure instanceof Error ? failure.message : "Falha ao carregar perfil");
      });
  }, []);
  return { user, setUser, error };
}

/** Conteúdo após carregar o próprio perfil. */
function OwnProfileLoaded(props: {
  user: User | null;
  error: string | null;
  onSaved: (user: User) => void;
}) {
  if (!props.error && !props.user) {
    return <p className={ui.muted}>Loading…</p>;
  }
  if (props.user == null) return null;
  return (
    <div className={ui.panel}>
      <OwnProfileBody user={props.user} onSaved={props.onSaved} />
    </div>
  );
}

/** Página do próprio perfil. */
function OwnProfilePage() {
  const { setUser: setSessionUser } = useAuth();
  const { user, setUser, error } = useOwnProfileLoad();
  function onSaved(next: User): void {
    setUser(next);
    setSessionUser(next);
  }
  return (
    <main className={ui.pageShell}>
      <h1 className={ui.title}>Perfil</h1>
      <div className={ui.content}>
        <ErrorText error={error} />
        <OwnProfileLoaded user={user} error={error} onSaved={onSaved} />
      </div>
    </main>
  );
}

/** Conteúdo carregado do perfil de outro usuário. */
function OtherProfileContent(props: { profile: Profile }) {
  return (
    <div className={ui.stackMd}>
      <Avatar avatarUrl={props.profile.avatarUrl} alt={props.profile.nickname} size="lg" />
      <p className={ui.text}>{props.profile.nickname}</p>
      <Link className={ui.link} to="/friends">
        Voltar aos friends
      </Link>
    </div>
  );
}

/** Carrega perfil de outro usuário por id. */
function useOtherProfile(userId: number) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void getProfileById(userId)
      .then(setProfile)
      .catch((failure: unknown) => {
        setError(failure instanceof Error ? failure.message : "Falha ao carregar perfil");
      });
  }, [userId]);
  return { profile, error };
}

/** Página de perfil de outro usuário. */
function OtherProfilePage({ userId }: { userId: number }) {
  const { profile, error } = useOtherProfile(userId);
  return (
    <main className={ui.pageShell}>
      <h1 className={ui.title}>Perfil</h1>
      <div className={ui.content}>
        <ErrorText error={error} />
        {!error && !profile ? <p className={ui.muted}>Loading…</p> : null}
        {profile ? (
          <div className={ui.panel}>
            <OtherProfileContent profile={profile} />
          </div>
        ) : null}
      </div>
    </main>
  );
}

/** Página de perfil (próprio ou de outro usuário). */
export function ProfilePage() {
  const { userId: raw } = useParams();
  const { user } = useAuth();
  const otherId = raw != null ? Number(raw) : NaN;
  if (Number.isFinite(otherId) && otherId !== user?.id) {
    return <OtherProfilePage userId={otherId} />;
  }
  return <OwnProfilePage />;
}
