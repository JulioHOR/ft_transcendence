import { useEffect, useState, type SubmitEvent } from "react";
import { Link, useParams } from "react-router-dom";
import Badge from "@mui/material/Badge";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import MuiLink from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import {
  deleteAvatar,
  getProfile,
  getProfileById,
  readImageAsDataUrl,
  updateProfile,
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
import { PongStatistics } from "../games/pong/PongStatistics";

/** Persiste um campo do perfil e mostra falhas ao salvar. */
async function submitProfileField(
  field: "email" | "nickname",
  value: string,
  onSaved: (user: User) => void,
  setError: (value: string | null) => void,
  setPending: (value: boolean) => void,
): Promise<void> {
  setError(null);
  setPending(true);
  try {
    onSaved(await updateProfile({ [field]: value }));
  } catch (failure: unknown) {
    setError(failure instanceof Error ? failure.message : "falha ao salvar");
  } finally {
    setPending(false);
  }
}

/** Formulário para atualizar um campo do próprio perfil. */
function handleProfileFieldSubmit(
  event: SubmitEvent<HTMLFormElement>,
  props: { field: "email" | "nickname"; onSaved: (user: User) => void },
  value: string,
  setError: (value: string | null) => void,
  setPending: (value: boolean) => void,
): void {
  event.preventDefault();
  void submitProfileField(
    props.field,
    value,
    props.onSaved,
    setError,
    setPending,
  );
}

function ProfileFieldForm(props: {
  field: "email" | "nickname";
  label: string;
  value: string;
  onSaved: (user: User) => void;
}) {
  const [value, setValue] = useState(props.value);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const onSubmit = (event: SubmitEvent<HTMLFormElement>) =>
    handleProfileFieldSubmit(event, props, value, setError, setPending);
  return (
    <Stack component="form" spacing={1.5} onSubmit={onSubmit}>
      <ProfileFieldInput
        field={props.field}
        label={props.label}
        value={value}
        pending={pending}
        error={error}
        onChange={setValue}
      />
    </Stack>
  );
}

function ProfileFieldInput(props: {
  field: "email" | "nickname";
  label: string;
  value: string;
  pending: boolean;
  error: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <Stack spacing={1.5}>
      <ProfileFieldRow {...props} />
      <ErrorText error={props.error} />
    </Stack>
  );
}

function ProfileFieldRow(props: {
  field: "email" | "nickname";
  label: string;
  value: string;
  pending: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
      <AppTextField
        id={`profile-${props.field}`}
        label={props.label}
        type={props.field === "email" ? "email" : "text"}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        sx={{ flex: 1 }}
      />
      <ProfileSaveButton pending={props.pending} />
    </Stack>
  );
}

function ProfileSaveButton({ pending }: { pending: boolean }) {
  return (
    <ActionButton
      appearance="primary"
      type="submit"
      disabled={pending}
      sx={{ width: { xs: "100%", sm: "auto" } }}
    >
      {pending ? "Salvando…" : "Salvar"}
    </ActionButton>
  );
}

/** Salva uma alteração do avatar e mostra falhas ao usuário. */
async function saveAvatarChange(
  update: () => Promise<Profile>,
  onSaved: (profile: Profile) => void,
  setError: (value: string | null) => void,
  setPending: (value: boolean) => void,
): Promise<void> {
  setError(null);
  setPending(true);
  try {
    onSaved(await update());
  } catch (failure: unknown) {
    setError(
      failure instanceof Error ? failure.message : "falha ao salvar avatar",
    );
  } finally {
    setPending(false);
  }
}

function AvatarFileButton(props: {
  pending: boolean;
  onFile: (file: File | undefined) => void;
}) {
  return (
    <IconButton
      component="label"
      size="small"
      color="primary"
      disabled={props.pending}
      aria-label="Trocar foto do perfil"
      sx={{ bgcolor: "background.paper", border: 1, borderColor: "divider" }}
    >
      {props.pending ? (
        <CircularProgress size={18} color="inherit" />
      ) : (
        <PhotoCameraIcon fontSize="small" />
      )}
      <AvatarFileInput onFile={props.onFile} />
    </IconButton>
  );
}

function AvatarRemoveButton(props: { pending: boolean; onRemove: () => void }) {
  return (
    <ActionButton
      appearance="quiet"
      startIcon={<DeleteOutlinedIcon />}
      disabled={props.pending}
      onClick={props.onRemove}
    >
      Remover foto
    </ActionButton>
  );
}

function AvatarFileInput(props: { onFile: (file: File | undefined) => void }) {
  return (
    <input
      type="file"
      accept="image/*"
      hidden
      onChange={(event) => {
        props.onFile(event.target.files?.[0]);
        event.target.value = "";
      }}
    />
  );
}

function EditableAvatar(props: {
  avatarUrl: string | null | undefined;
  nickname: string;
  pending: boolean;
  onFile: (file: File | undefined) => void;
}) {
  return (
    <Badge
      overlap="circular"
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      badgeContent={
        <AvatarFileButton pending={props.pending} onFile={props.onFile} />
      }
      sx={{ "& .MuiBadge-badge": { padding: 0, bgcolor: "transparent" } }}
    >
      <Avatar avatarUrl={props.avatarUrl} alt={props.nickname} size="lg" />
    </Badge>
  );
}

/** Upload / troca de avatar do próprio perfil. */
function AvatarEditorContent(props: {
  avatarUrl: string | null | undefined;
  nickname: string;
  error: string | null;
  pending: boolean;
  onFile: (file: File | undefined) => void;
  onRemove: () => void;
}) {
  return (
    <Stack spacing={1.5}>
      <AvatarEditorActions {...props} />
      <ErrorText error={props.error} />
    </Stack>
  );
}

function AvatarEditorActions(props: {
  avatarUrl: string | null | undefined;
  nickname: string;
  pending: boolean;
  onFile: (file: File | undefined) => void;
  onRemove: () => void;
}) {
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
      <EditableAvatar {...props} />
      {props.avatarUrl ? (
        <AvatarRemoveButton pending={props.pending} onRemove={props.onRemove} />
      ) : null}
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
  const onRemove = () =>
    void saveAvatarChange(deleteAvatar, props.onSaved, setError, setPending);
  return (
    <AvatarEditorContent
      {...props}
      error={error}
      pending={pending}
      onFile={onFile}
      onRemove={onRemove}
    />
  );
}

function saveAvatarFile(
  file: File | undefined,
  onSaved: (profile: Profile) => void,
  setError: (value: string | null) => void,
  setPending: (value: boolean) => void,
): void {
  if (file) {
    void saveAvatarChange(
      async () => uploadAvatar(await readImageAsDataUrl(file)),
      onSaved,
      setError,
      setPending,
    );
  }
}

/** Corpo editável do próprio perfil. */
function OwnProfileBody(props: { user: User; onSaved: (user: User) => void }) {
  return (
    <Stack spacing={3}>
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
      <ProfileFields user={props.user} onSaved={props.onSaved} />
    </Stack>
  );
}

function ProfileFields(props: { user: User; onSaved: (user: User) => void }) {
  return (
    <>
      <ProfileFieldForm
        key={props.user.email}
        field="email"
        label="E-mail"
        value={props.user.email}
        onSaved={props.onSaved}
      />
      <ProfileFieldForm
        key={props.user.nickname}
        field="nickname"
        label="Apelido"
        value={props.user.nickname}
        onSaved={props.onSaved}
      />
    </>
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
    <Stack spacing={2}>
      <SectionCard>
        <OwnProfileBody user={props.user} onSaved={props.onSaved} />
      </SectionCard>
      <PongStatistics userId={props.user.id} />
    </Stack>
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
    <Stack spacing={2}>
      <SectionCard>
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
      </SectionCard>
      <PongStatistics userId={props.profile.id} />
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
      {profile ? <OtherProfileContent profile={profile} /> : null}
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
