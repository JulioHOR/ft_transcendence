import type { ReactNode } from "react";
import type { ButtonProps } from "@mui/material/Button";
import type { PaperProps } from "@mui/material/Paper";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import type { TextFieldProps } from "@mui/material/TextField";
import type { Toast } from "./toaster-context";

/** Props for the standardized button. */
export type ActionButtonProps = ButtonProps & {
  /** Visual variant used by the application theme. */
  appearance?: "primary" | "secondary" | "quiet";
};

/** Name of a shared application icon. */
export type AppIconName =
  | "block"
  | "sports"
  | "play"
  | "pause"
  | "achievement"
  | "competitor"
  | "professional";

/** Props for the standardized Material icon. */
export type AppIconProps = SvgIconProps & { name: AppIconName };

/** Props for the standardized text field. */
export type AppTextFieldProps = TextFieldProps;

/** Supported avatar sizes. */
export type AvatarSize = "sm" | "md" | "lg" | "xl";

/** Props for the avatar, with an optional profile link. */
export type AvatarProps = {
  avatarUrl: string | null | undefined;
  alt: string;
  size?: AvatarSize;
  userId?: number;
  /** Visual color of the avatar border. */
  borderColor?: string;
};

/** Props for the link wrapping an avatar. */
export type LinkedAvatarProps = {
  userId: number;
  label: string;
  children: ReactNode;
};

/** Props for the theme provider. */
export type ColorModeProviderProps = { children: ReactNode };

/** Props for the empty state of a content area. */
export type EmptyStateProps = {
  children: ReactNode;
  action?: ReactNode;
};

/** Props for the error message displayed in a toast. */
export type ErrorTextProps = {
  error: string | null;
  onDismiss?: () => void;
};

/** Props for the shared page container. */
export type PageContainerProps = {
  children: ReactNode;
  fillHeight?: boolean;
};

/** Props for a page or section title. */
export type PageHeadingProps = { children: string };

/** Props for the card shared between sections. */
export type SectionCardProps = PaperProps & { children: ReactNode };

/** Props for the notification provider. */
export type ToasterProviderProps = { children: ReactNode };

/** Props for the notification displayed by the provider. */
export type ToastViewProps = {
  toast: Toast | null;
  onDismiss: () => void;
};

/** Props for the unread item counter. */
export type UnreadBadgeProps = {
  count: number;
  children: ReactNode;
};
