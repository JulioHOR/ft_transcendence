import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import CloseIcon from "@mui/icons-material/Close";
import { acceptFriend, addFriend } from "../api/friends";
import {
  deleteAvatar,
  getProfile,
  getProfileById,
  readImageAsDataUrl,
  updateProfile,
  uploadAvatar,
} from "../api/profile";
import { friendlyError } from "../api/http";
import {
  AVATAR_ACCEPTED_TYPES,
  EMAIL_PATTERN,
  NICKNAME_MAX_LENGTH,
  NICKNAME_MIN_LENGTH,
  NICKNAME_PATTERN,
} from "../api/validation";
import type { Profile, User } from "../api/types";
import { useAuth } from "../app/auth-session";
import { useFriends } from "../app/friends-session";
import { Avatar } from "../ui/Avatar";
import { ErrorText } from "../ui/ErrorText";
import { ActionButton } from "../ui/ActionButton";
import { AppTextField } from "../ui/AppTextField";
import { PageContainer } from "../ui/PageContainer";
import { SectionCard } from "../ui/SectionCard";
import { useToaster } from "../ui/toaster-context";
import { PongStatistics } from "../games/pong/PongStatistics";
import type {
  AvatarEditorActionsProps,
  AvatarEditorContentProps,
  AvatarEditorProps,
  AvatarFileButtonProps,
  AvatarFileInputProps,
  AvatarRemoveButtonProps,
  EditableAvatarProps,
  OtherProfileContentProps,
  OtherProfileContentStateProps,
  OtherProfileFriendActionProps,
  OtherProfileFriendButtonProps,
  OtherProfilePageProps,
  OwnProfileBodyProps,
  OwnProfileContentProps,
  OwnProfileLoadedProps,
  ProfileFieldCallbacks,
  ProfileFieldFormLayoutProps,
  ProfileFieldFormProps,
  ProfileFieldsProps,
} from "./profileProps";

/** Restrições do apelido aplicadas pelo navegador. */
function nicknameInputConstraints() {
  return {
    minLength: NICKNAME_MIN_LENGTH,
    maxLength: NICKNAME_MAX_LENGTH,
    pattern: NICKNAME_PATTERN,
  };
}

/** Restrições de entrada próprias do campo de apelido. */
function profileFieldSlots(field: "email" | "nickname") {
  return field === "nickname"
    ? { htmlInput: nicknameInputConstraints() }
    : { htmlInput: { pattern: EMAIL_PATTERN } };
}

/** Salva o valor atualizado de um campo do perfil. */
async function submitProfileField(
  props: ProfileFieldFormProps,
  value: string,
  callbacks: ProfileFieldCallbacks,
): Promise<void> {
  callbacks.setError(null);
  callbacks.setPending(true);
  try {
    const user = await updateProfile({
      ...props.profile,
      [props.field]: value,
    });
    props.onSaved(user, `${props.label} atualizado.`);
    callbacks.setValue(user[props.field]);
    callbacks.setEditing(false);
  } catch (failure: unknown) {
    callbacks.setError(
      friendlyError(failure, "Falha ao salvar.", "Falha ao salvar perfil"),
    );
  } finally {
    callbacks.setPending(false);
  }
}

/** Mantém o estado local de edição de um campo do perfil. */
function ProfileFieldForm(props: ProfileFieldFormProps) {
  const [value, setValue] = useState(props.value);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const callbacks = { setValue, setError, setEditing, setPending };
  const save = () => void submitProfileField(props, value, callbacks);
  return (
    <ProfileFieldFormLayout
      {...props}
      value={value}
      error={error}
      editing={editing}
      pending={pending}
      callbacks={callbacks}
      onCancel={() => cancelProfileFieldEdit(props.value, callbacks)}
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    />
  );
}

/** Renderiza o formulário e a mensagem de erro do campo. */
function ProfileFieldFormLayout(props: ProfileFieldFormLayoutProps) {
  return (
    <Stack component="form" spacing={1} onSubmit={props.onSubmit}>
      <ProfileFieldRow {...props} />
      <ErrorText error={props.error} />
    </Stack>
  );
}

/** Renderiza o campo e suas ações. */
function ProfileFieldRow(props: ProfileFieldFormLayoutProps) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
      <AppTextField
        id={`profile-${props.field}`}
        label={props.label}
        type={props.field === "email" ? "email" : "text"}
        required
        disabled={!props.editing || props.pending}
        slotProps={profileFieldSlots(props.field)}
        value={props.value}
        onChange={(event) => props.callbacks.setValue(event.target.value)}
        sx={{ flex: 1 }}
      />
      <ProfileFieldAction {...props} />
    </Stack>
  );
}

/** Seleciona as ações disponíveis para o campo. */
function ProfileFieldAction(props: ProfileFieldFormLayoutProps) {
  return (
    <Stack direction="row" spacing={1}>
      {props.editing ? <CancelProfileFieldButton {...props} /> : null}
      <SaveProfileFieldButton {...props} />
    </Stack>
  );
}

/** Exibe a ação de cancelar uma edição. */
function CancelProfileFieldButton(props: ProfileFieldFormLayoutProps) {
  return (
    <IconButton
      type="button"
      aria-label={`Cancelar edição de ${props.label}`}
      title="Cancelar edição"
      disabled={props.pending}
      onClick={props.onCancel}
    >
      <CloseIcon />
    </IconButton>
  );
}

/** Exibe a ação de editar ou salvar um campo. */
function SaveProfileFieldButton(props: ProfileFieldFormLayoutProps) {
  return (
    <ActionButton
      key={props.editing ? "save" : "edit"}
      appearance={props.editing ? "primary" : "secondary"}
      type={props.editing ? "submit" : "button"}
      disabled={props.pending}
      onClick={
        props.editing
          ? undefined
          : () => enableProfileFieldEdit(props.callbacks)
      }
      startIcon={
        props.pending ? (
          <CircularProgress size={16} color="inherit" />
        ) : undefined
      }
      sx={{ width: "auto", flex: { xs: 1, sm: "initial" } }}
    >
      {props.pending ? "Salvando…" : props.editing ? "Salvar" : "Editar"}
    </ActionButton>
  );
}

/** Ativa a edição e limpa o erro atual. */
function enableProfileFieldEdit(callbacks: ProfileFieldCallbacks): void {
  callbacks.setError(null);
  callbacks.setEditing(true);
}

/** Restaura o valor original e encerra a edição. */
function cancelProfileFieldEdit(
  originalValue: string,
  callbacks: ProfileFieldCallbacks,
): void {
  callbacks.setValue(originalValue);
  callbacks.setError(null);
  callbacks.setEditing(false);
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
    const profile = await update();
    await loadAvatar(profile.avatarUrl);
    onSaved(profile);
  } catch (failure: unknown) {
    setError(
      friendlyError(
        failure,
        "Falha ao salvar avatar.",
        "Falha ao salvar avatar",
      ),
    );
  } finally {
    setPending(false);
  }
}

/** Aguarda o carregamento do avatar para atualizar a visualização. */
async function loadAvatar(avatarUrl: string | null | undefined): Promise<void> {
  if (!avatarUrl) return;
  const image = new Image();
  image.src = avatarUrl;
  await image.decode().catch(() => undefined);
}

/** Exibe o botão que abre a seleção de arquivo. */
function AvatarFileButton(props: AvatarFileButtonProps) {
  return (
    <IconButton
      component="label"
      size="small"
      color="primary"
      disabled={props.pending}
      aria-label="Trocar foto do perfil"
      sx={{
        position: "absolute",
        right: 0,
        bottom: 0,
        bgcolor: "background.paper",
        border: 1,
        borderColor: "divider",
      }}
    >
      <PhotoCameraIcon fontSize="small" />
      <AvatarFileInput onFile={props.onFile} />
    </IconButton>
  );
}

/** Exibe o botão de remoção da foto atual. */
function AvatarRemoveButton(props: AvatarRemoveButtonProps) {
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

/** Mantém o input de arquivo escondido do editor. */
function AvatarFileInput(props: AvatarFileInputProps) {
  return (
    <input
      type="file"
      accept={AVATAR_ACCEPTED_TYPES.join(",")}
      hidden
      onChange={(event) => {
        props.onFile(event.target.files?.[0]);
        event.target.value = "";
      }}
    />
  );
}

/** Exibe o avatar e o controle de troca. */
function EditableAvatar(props: EditableAvatarProps) {
  return (
    <Box sx={{ position: "relative", width: 96, height: 96 }}>
      <Avatar avatarUrl={props.avatarUrl} alt={props.nickname} size="xl" />
      {props.pending ? <AvatarUploadProgress /> : null}
      <AvatarFileButton pending={props.pending} onFile={props.onFile} />
    </Box>
  );
}

/** Indica visualmente o envio da nova foto. */
function AvatarUploadProgress() {
  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        bgcolor: "action.disabledBackground",
        borderRadius: "50%",
      }}
    >
      <CircularProgress size={40} aria-label="Enviando foto do perfil" />
    </Box>
  );
}

/** Upload / troca de avatar do próprio perfil. */
function AvatarEditorContent(props: AvatarEditorContentProps) {
  return (
    <Stack spacing={1.5} sx={{ height: "100%", justifyContent: "center" }}>
      <AvatarEditorActions {...props} />
      <ErrorText error={props.error} />
    </Stack>
  );
}

/** Agrupa o avatar editável e a remoção da foto. */
function AvatarEditorActions(props: AvatarEditorActionsProps) {
  return (
    <Stack spacing={1} sx={{ alignItems: "center" }}>
      <EditableAvatar {...props} />
      {props.avatarUrl ? (
        <AvatarRemoveButton pending={props.pending} onRemove={props.onRemove} />
      ) : null}
    </Stack>
  );
}

/** Controla o envio e exibe o editor de avatar do perfil. */
function AvatarEditor(props: AvatarEditorProps) {
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

/** Converte o arquivo selecionado e salva o novo avatar. */
function saveAvatarFile(
  file: File | undefined,
  onSaved: (profile: Profile) => void,
  setError: (value: string | null) => void,
  setPending: (value: boolean) => void,
): void {
  if (file == null) return;
  void saveAvatarChange(
    async () => uploadAvatar(await readImageAsDataUrl(file)),
    onSaved,
    setError,
    setPending,
  );
}

/** Corpo editável do próprio perfil. */
function OwnProfileBody(props: OwnProfileBodyProps) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={3}
      sx={{ alignItems: { xs: "center", sm: "stretch" } }}
    >
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

/** Renderiza os campos editáveis do usuário. */
function ProfileFields(props: ProfileFieldsProps) {
  const fields = [
    { field: "email", label: "E-mail", value: props.user.email },
    { field: "nickname", label: "Apelido", value: props.user.nickname },
  ] as const;
  return (
    <Stack
      sx={{
        flex: 1,
        minWidth: 0,
        width: "100%",
        justifyContent: { xs: "flex-start", sm: "space-around" },
      }}
    >
      {fields.map((field) => (
        <ProfileFieldForm
          key={field.value}
          {...field}
          profile={{ email: props.user.email, nickname: props.user.nickname }}
          onSaved={props.onSaved}
        />
      ))}
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
          friendlyError(
            failure,
            "Falha ao carregar perfil",
            "Falha ao carregar perfil",
          ),
        );
      });
  }, []);
  return { user, setUser, error };
}

/** Conteúdo após carregar o próprio perfil. */
function OwnProfileLoaded(props: OwnProfileLoadedProps) {
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
function OwnProfileContent(props: OwnProfileContentProps) {
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
  const showToast = useToaster();
  /** Atualiza a sessão após salvar alterações no perfil. */
  function onSaved(next: User, message?: string): void {
    setUser(next);
    setSessionUser(next);
    showToast(message ?? "Perfil atualizado.", "success");
  }
  return (
    <PageContainer>
      <OwnProfileContent user={user} error={error} onSaved={onSaved} />
    </PageContainer>
  );
}

/** Conteúdo carregado do perfil de outro usuário. */
function OtherProfileContent(props: OtherProfileContentProps) {
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
          <OtherProfileFriendAction profile={props.profile} />
        </Stack>
      </SectionCard>
      <PongStatistics userId={props.profile.id} />
    </Stack>
  );
}

/** Seleciona a ação de amizade do perfil público. */
function OtherProfileFriendAction({ profile }: OtherProfileFriendActionProps) {
  const { friends } = useFriends();
  const friend = friends.find((item) => item.id === profile.id);
  if (friend?.relation === "friend") return <Chip label="Amigo" />;
  if (friend?.relation === "outgoing") {
    return <Chip label="Solicitação enviada" variant="outlined" />;
  }
  const incoming = friend?.relation === "incoming";
  return <OtherProfileFriendButton profile={profile} incoming={incoming} />;
}

/** Executa a ação de amizade pendente. */
function OtherProfileFriendButton(props: OtherProfileFriendButtonProps) {
  const showToast = useToaster();
  const [pending, setPending] = useState(false);
  return (
    <ActionButton
      appearance="primary"
      disabled={pending}
      onClick={() => void updateProfileFriendship(props, showToast, setPending)}
    >
      {pending
        ? "Aguarde…"
        : props.incoming
          ? "Aceitar solicitação"
          : "Adicionar amigo"}
    </ActionButton>
  );
}

/** Atualiza a relação de amizade pelo perfil público. */
async function updateProfileFriendship(
  props: OtherProfileFriendButtonProps,
  showToast: ReturnType<typeof useToaster>,
  setPending: (pending: boolean) => void,
): Promise<void> {
  setPending(true);
  try {
    if (props.incoming) await acceptFriend(props.profile.id);
    else await addFriend(props.profile.nickname);
    showToast(
      props.incoming ? "Solicitação aceita." : "Solicitação enviada.",
      "success",
    );
  } catch (failure: unknown) {
    const message = friendlyError(
      failure,
      "Não foi possível atualizar a amizade.",
      "Falha ao atualizar amizade pelo perfil",
    );
    showToast(message, "error");
  } finally {
    setPending(false);
  }
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
          friendlyError(
            failure,
            "Falha ao carregar perfil",
            "Falha ao carregar perfil público",
          ),
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
}: OtherProfileContentStateProps) {
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
function OtherProfilePage({ userId }: OtherProfilePageProps) {
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
