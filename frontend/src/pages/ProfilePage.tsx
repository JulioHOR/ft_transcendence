import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type SubmitEvent,
} from "react";
import { Link, useParams } from "react-router-dom";
import MuiLink from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
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
import { ActionButton } from "../ui/ActionButton";
import { AppTextField } from "../ui/AppTextField";
import { PageContainer } from "../ui/PageContainer";
import { SectionCard } from "../ui/SectionCard";
import { PageHeading } from "../ui/PageHeading";

/** Campo somente leitura de email. */
function EmailDisplay(props: { email: string }) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="caption" color="text.secondary">
        Email
      </Typography>
      <Typography>{props.email}</Typography>
    </Stack>
  );
}

/** Campo editável de nickname. */
function NicknameInput(props: {
  nickname: string;
  onNickname: (value: string) => void;
}) {
  return (
    <AppTextField
      id="profile-nickname"
      label="Apelido"
      value={props.nickname}
      placeholder="apelido"
      onChange={(event) => props.onNickname(event.target.value)}
    />
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
      <ActionButton appearance="primary" type="submit" disabled={props.pending}>
        {props.pending ? "Salvando…" : "Salvar"}
      </ActionButton>
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
    <Stack component="form" spacing={1.5} onSubmit={onSubmit}>
      <NicknameFields
        email={props.user.email}
        nickname={nickname}
        pending={pending}
        onNickname={setNickname}
      />
      <ErrorText error={error} />
    </Stack>
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
    setError(
      failure instanceof Error ? failure.message : "falha ao salvar avatar",
    );
  } finally {
    setPending(false);
  }
}

/** Botão e input para selecionar uma nova imagem de avatar. */
function AvatarPickerButton(props: {
  label: string;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <ActionButton
      type="button"
      disabled={props.pending}
      onClick={props.onClick}
    >
      {props.label}
    </ActionButton>
  );
}

/** Define o rótulo do seletor conforme envio e avatar atual. */
function avatarPickerLabel(pending: boolean, hasAvatar: boolean): string {
  if (pending) return "Enviando…";
  return hasAvatar ? "Trocar avatar" : "Enviar avatar";
}

function AvatarFilePicker(props: {
  pending: boolean;
  hasAvatar: boolean;
  onFile: (file: File | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    props.onFile(file);
  };
  const label = avatarPickerLabel(props.pending, props.hasAvatar);
  // prettier-ignore
  return <><input ref={inputRef} type="file" accept="image/*" hidden onChange={onChange} /><AvatarPickerButton label={label} pending={props.pending} onClick={() => inputRef.current?.click()} /></>;
}

/** Upload / troca de avatar do próprio perfil. */
function AvatarEditorContent(props: {
  avatarUrl: string | null | undefined;
  nickname: string;
  error: string | null;
  pending: boolean;
  onFile: (file: File | undefined) => void;
}) {
  return (
    <Stack spacing={1.5} sx={{ alignItems: "flex-start" }}>
      <Typography variant="caption" color="text.secondary">
        Avatar
      </Typography>
      <Avatar avatarUrl={props.avatarUrl} alt={props.nickname} size="lg" />
      <AvatarFilePicker
        pending={props.pending}
        hasAvatar={props.avatarUrl != null && props.avatarUrl !== ""}
        onFile={props.onFile}
      />
      <ErrorText error={props.error} />
    </Stack>
  );
}

/** Controla o envio e exibe o editor de avatar do perfil. */
function AvatarEditor(props: {
  avatarUrl: string | null | undefined;
  nickname: string;
  onSaved: (profile: Profile) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const onFile = (file: File | undefined) =>
    void saveAvatarFile(file, props.onSaved, setError, setPending);
  return (
    <AvatarEditorContent
      {...props}
      error={error}
      pending={pending}
      onFile={onFile}
    />
  );
}

/** Corpo editável do próprio perfil. */
function OwnProfileBody(props: { user: User; onSaved: (user: User) => void }) {
  return (
    <Stack spacing={3}>
      <PageHeading>{props.user.nickname}</PageHeading>
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
    </Stack>
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
        setError(
          failure instanceof Error
            ? failure.message
            : "Falha ao carregar perfil",
        );
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
    return <Typography color="text.secondary">Carregando…</Typography>;
  }
  if (props.user == null) return null;
  return (
    <SectionCard>
      <OwnProfileBody user={props.user} onSaved={props.onSaved} />
    </SectionCard>
  );
}

/** Página do próprio perfil. */
function OwnProfileContent(props: {
  user: User | null;
  error: string | null;
  onSaved: (user: User) => void;
}) {
  return (
    <Stack spacing={2}>
      <ErrorText error={props.error} />
      <OwnProfileLoaded
        user={props.user}
        error={props.error}
        onSaved={props.onSaved}
      />
    </Stack>
  );
}

/** Carrega e exibe o perfil autenticado com seus formulários. */
function OwnProfilePage() {
  const { setUser: setSessionUser } = useAuth();
  const { user, setUser, error } = useOwnProfileLoad();
  function onSaved(next: User): void {
    setUser(next);
    setSessionUser(next);
  }
  return (
    <PageContainer>
      <OwnProfileContent user={user} error={error} onSaved={onSaved} />
    </PageContainer>
  );
}

/** Conteúdo carregado do perfil de outro usuário. */
function OtherProfileContent(props: { profile: Profile }) {
  return (
    <Stack spacing={2} sx={{ alignItems: "flex-start" }}>
      <Avatar
        avatarUrl={props.profile.avatarUrl}
        alt={props.profile.nickname}
        size="lg"
      />
      <Typography variant="h2">{props.profile.nickname}</Typography>
      <MuiLink component={Link} to="/friends" underline="hover">
        Voltar aos amigos
      </MuiLink>
    </Stack>
  );
}

/** Carrega perfil de outro usuário por id. */
/** Busca o perfil público pelo identificador do usuário. */
function useOtherProfile(userId: number) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void getProfileById(userId)
      .then(setProfile)
      .catch((failure: unknown) => {
        setError(
          failure instanceof Error
            ? failure.message
            : "Falha ao carregar perfil",
        );
      });
  }, [userId]);
  return { profile, error };
}

/** Página de perfil de outro usuário. */
/** Exibe erro, carregamento ou os dados do perfil público. */
function OtherProfileContentState({
  profile,
  error,
}: {
  profile: Profile | null;
  error: string | null;
}) {
  return (
    <Stack spacing={2}>
      <ErrorText error={error} />
      {!error && !profile ? (
        <Typography color="text.secondary">Carregando…</Typography>
      ) : null}
      {profile ? (
        <SectionCard>
          <OtherProfileContent profile={profile} />
        </SectionCard>
      ) : null}
    </Stack>
  );
}

/** Página de perfil público para um usuário diferente do autenticado. */
function OtherProfilePage({ userId }: { userId: number }) {
  const { profile, error } = useOtherProfile(userId);
  return (
    <PageContainer>
      <OtherProfileContentState profile={profile} error={error} />
    </PageContainer>
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
