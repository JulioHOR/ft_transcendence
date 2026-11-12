import type { SubmitEvent } from "react";
import type { Profile, User } from "../api/types";

/** Props for the profile field edit form. */
export type ProfileFieldFormProps = {
  field: "email" | "nickname";
  label: string;
  value: string;
  profile: Pick<User, "email" | "nickname">;
  onSaved: (user: User, message?: string) => void;
};

/** Local callbacks for the profile form. */
export type ProfileFieldCallbacks = {
  setValue: (value: string) => void;
  setError: (value: string | null) => void;
  setEditing: (value: boolean) => void;
  setPending: (value: boolean) => void;
};

/** Props for the complete layout of a profile field. */
export type ProfileFieldFormLayoutProps = ProfileFieldFormProps & {
  value: string;
  error: string | null;
  editing: boolean;
  pending: boolean;
  callbacks: ProfileFieldCallbacks;
  onCancel: () => void;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
};

/** Props for the avatar selection button. */
export type AvatarFileButtonProps = {
  pending: boolean;
  onFile: (file: File | undefined) => void;
};

/** Props for the avatar removal button. */
export type AvatarRemoveButtonProps = {
  pending: boolean;
  onRemove: () => void;
};

/** Props for the avatar file field. */
export type AvatarFileInputProps = {
  onFile: (file: File | undefined) => void;
};

/** Props for the editable avatar. */
export type EditableAvatarProps = {
  avatarUrl: string | null | undefined;
  nickname: string;
  pending: boolean;
  onFile: (file: File | undefined) => void;
};

/** Props for the avatar editor content. */
export type AvatarEditorContentProps = EditableAvatarProps & {
  error: string | null;
  onRemove: () => void;
};

/** Props for the avatar editor actions. */
export type AvatarEditorActionsProps = Omit<AvatarEditorContentProps, "error">;

/** Props for the avatar editor. */
export type AvatarEditorProps = {
  avatarUrl: string | null | undefined;
  nickname: string;
  onSaved: (profile: Profile) => void;
};

/** Props for the current user's profile body. */
export type OwnProfileBodyProps = {
  user: User;
  onSaved: (user: User) => void;
};

/** Props for the current user's profile fields. */
export type ProfileFieldsProps = {
  user: User;
  onSaved: (user: User, message?: string) => void;
};

/** Props for the loaded content of the current user's profile. */
export type OwnProfileLoadedProps = {
  user: User | null;
  error: string | null;
  onSaved: (user: User, message?: string) => void;
};

/** Props for the current user's profile content. */
export type OwnProfileContentProps = OwnProfileLoadedProps;

/** Props for another user's public profile. */
export type OtherProfileContentProps = { profile: Profile };

/** Props for the friend action on the public profile. */
export type OtherProfileFriendActionProps = OtherProfileContentProps;

/** Props for the friend button on the public profile. */
export type OtherProfileFriendButtonProps = {
  profile: Profile;
  incoming: boolean;
};

/** Props for the public profile loading state. */
export type OtherProfileContentStateProps = {
  profile: Profile | null;
  error: string | null;
};

/** Props for the public profile page. */
export type OtherProfilePageProps = { userId: number };
