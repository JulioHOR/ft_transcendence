import type { SubmitEvent } from "react";
import type { Profile, User } from "../api/types";

/** Props do formulário de edição de um campo do perfil. */
export type ProfileFieldFormProps = {
  field: "email" | "nickname";
  label: string;
  value: string;
  profile: Pick<User, "email" | "nickname">;
  onSaved: (user: User, message?: string) => void;
};

/** Callbacks locais do formulário de perfil. */
export type ProfileFieldCallbacks = {
  setValue: (value: string) => void;
  setError: (value: string | null) => void;
  setEditing: (value: boolean) => void;
  setPending: (value: boolean) => void;
};

/** Props do layout completo de um campo de perfil. */
export type ProfileFieldFormLayoutProps = ProfileFieldFormProps & {
  value: string;
  error: string | null;
  editing: boolean;
  pending: boolean;
  callbacks: ProfileFieldCallbacks;
  onCancel: () => void;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
};

/** Props do botão de seleção de avatar. */
export type AvatarFileButtonProps = {
  pending: boolean;
  onFile: (file: File | undefined) => void;
};

/** Props do botão de remoção de avatar. */
export type AvatarRemoveButtonProps = {
  pending: boolean;
  onRemove: () => void;
};

/** Props do campo de arquivo de avatar. */
export type AvatarFileInputProps = {
  onFile: (file: File | undefined) => void;
};

/** Props do avatar editável. */
export type EditableAvatarProps = {
  avatarUrl: string | null | undefined;
  nickname: string;
  pending: boolean;
  onFile: (file: File | undefined) => void;
};

/** Props do conteúdo do editor de avatar. */
export type AvatarEditorContentProps = EditableAvatarProps & {
  error: string | null;
  onRemove: () => void;
};

/** Props das ações do editor de avatar. */
export type AvatarEditorActionsProps = Omit<AvatarEditorContentProps, "error">;

/** Props do editor de avatar. */
export type AvatarEditorProps = {
  avatarUrl: string | null | undefined;
  nickname: string;
  onSaved: (profile: Profile) => void;
};

/** Props do corpo do próprio perfil. */
export type OwnProfileBodyProps = {
  user: User;
  onSaved: (user: User) => void;
};

/** Props dos campos do próprio perfil. */
export type ProfileFieldsProps = {
  user: User;
  onSaved: (user: User, message?: string) => void;
};

/** Props do conteúdo carregado do próprio perfil. */
export type OwnProfileLoadedProps = {
  user: User | null;
  error: string | null;
  onSaved: (user: User, message?: string) => void;
};

/** Props do conteúdo do próprio perfil. */
export type OwnProfileContentProps = OwnProfileLoadedProps;

/** Props do perfil público de outro usuário. */
export type OtherProfileContentProps = { profile: Profile };

/** Props da ação de amizade no perfil público. */
export type OtherProfileFriendActionProps = OtherProfileContentProps;

/** Props do botão de amizade no perfil público. */
export type OtherProfileFriendButtonProps = {
  profile: Profile;
  incoming: boolean;
};

/** Props do estado de carregamento do perfil público. */
export type OtherProfileContentStateProps = {
  profile: Profile | null;
  error: string | null;
};

/** Props da página pública de perfil. */
export type OtherProfilePageProps = { userId: number };
