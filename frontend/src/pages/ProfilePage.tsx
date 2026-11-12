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

/** Nickname constraints applied by the browser. */
function nicknameInputConstraints() {
  return {
    minLength: NICKNAME_MIN_LENGTH,
    maxLength: NICKNAME_MAX_LENGTH,
    pattern: NICKNAME_PATTERN,
  };
}

/** Input constraints specific to the nickname field. */
function profileFieldSlots(field: "email" | "nickname") {
  return field === "nickname"
    ? { htmlInput: nicknameInputConstraints() }
    : { htmlInput: { pattern: EMAIL_PATTERN } };
}

/** Saves the updated value of a profile field. */
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

/** Maintains the local editing state for a profile field. */
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

/** Renders the field form and error message. */
function ProfileFieldFormLayout(props: ProfileFieldFormLayoutProps) {
  return (
    <Stack component="form" spacing={1} onSubmit={props.onSubmit}>
      <ProfileFieldRow {...props} />
      <ErrorText error={props.error} />
    </Stack>
  );
}

/** Renders the field and its actions. */
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

/** Selects the actions available for the field. */
function ProfileFieldAction(props: ProfileFieldFormLayoutProps) {
  return (
    <Stack direction="row" spacing={1}>
      {props.editing ? <CancelProfileFieldButton {...props} /> : null}
      <SaveProfileFieldButton {...props} />
    </Stack>
  );
}

/** Displays the action to cancel an edit. */
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

/** Displays the action to edit or save a field. */
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

/** Enables editing and clears the current error. */
function enableProfileFieldEdit(callbacks: ProfileFieldCallbacks): void {
  callbacks.setError(null);
  callbacks.setEditing(true);
}

/** Restores the original value and ends editing. */
function cancelProfileFieldEdit(
  originalValue: string,
  callbacks: ProfileFieldCallbacks,
): void {
  callbacks.setValue(originalValue);
  callbacks.setError(null);
  callbacks.setEditing(false);
}

/** Saves an avatar change and shows errors to the user. */
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

/** Waits for the avatar to load before updating the display. */
async function loadAvatar(avatarUrl: string | null | undefined): Promise<void> {
  if (!avatarUrl) return;
  const image = new Image();
  image.src = avatarUrl;
  await image.decode().catch(() => undefined);
}

/** Displays the button that opens file selection. */
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

/** Displays the button to remove the current photo. */
function AvatarRemoveButton(props: AvatarRemoveButtonProps) {
  return (
    <ActionButton
      appearance="quiet"
      startIcon={<DeleteOutlinedIcon />}
      disabled={props.pending}
      onClick={props.onRemove}
    >
      Remover
    </ActionButton>
  );
}

/** Keeps the editor's file input hidden. */
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

/** Displays the avatar and the change control. */
function EditableAvatar(props: EditableAvatarProps) {
  return (
    <Box sx={{ position: "relative", width: 96, height: 96 }}>
      <Avatar avatarUrl={props.avatarUrl} alt={props.nickname} size="xl" />
      {props.pending ? <AvatarUploadProgress /> : null}
      <AvatarFileButton pending={props.pending} onFile={props.onFile} />
    </Box>
  );
}

/** Visually indicates that the new photo is being uploaded. */
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

/** Upload / change avatar for the current user's profile. */
function AvatarEditorContent(props: AvatarEditorContentProps) {
  return (
    <Stack spacing={1.5} sx={{ height: "100%", justifyContent: "center" }}>
      <AvatarEditorActions {...props} />
      <ErrorText error={props.error} />
    </Stack>
  );
}

/** Groups the editable avatar and photo removal controls. */
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

/** Controls the upload and displays the profile avatar editor. */
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

/** Converts the selected file and saves the new avatar. */
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

/** Editable body of the current user's profile. */
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

/** Renders the user's editable fields. */
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

/** Loads the authenticated user's profile. */
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

/** Content displayed after loading the current user's profile. */
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

/** Current user's profile page. */
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

/** Loads and displays the authenticated profile with its forms. */
function OwnProfilePage() {
  const { setUser: setSessionUser } = useAuth();
  const { user, setUser, error } = useOwnProfileLoad();
  const showToast = useToaster();
  /** Updates the session after saving profile changes. */
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

/** Loaded content for another user's profile. */
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

/** Selects the friend action for the public profile. */
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

/** Executes the pending friend action. */
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

/** Updates the friendship relationship from the public profile. */
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

/** Loads another user's profile by ID. */
/** Fetches the public profile by user ID. */
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

/** Another user's profile page. */
/** Displays an error, loading state, or the public profile data. */
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

/** Public profile page for a user other than the authenticated user. */
function OtherProfilePage({ userId }: OtherProfilePageProps) {
  const { profile, error } = useOtherProfile(userId);
  return (
    <PageContainer>
      <OtherProfileContentState profile={profile} error={error} />
    </PageContainer>
  );
}

/** Profile page (the current user or another user). */
export function ProfilePage() {
  const { userId: raw } = useParams();
  const { user } = useAuth();
  const otherId = raw != null ? Number(raw) : NaN;
  if (Number.isFinite(otherId) && otherId !== user?.id) {
    return <OtherProfilePage userId={otherId} />;
  }
  return <OwnProfilePage />;
}
