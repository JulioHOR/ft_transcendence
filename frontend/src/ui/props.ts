import type { ReactNode } from "react";
import type { ButtonProps } from "@mui/material/Button";
import type { PaperProps } from "@mui/material/Paper";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import type { TextFieldProps } from "@mui/material/TextField";
import type { Toast } from "./toaster-context";

/** Props do botão padronizado. */
export type ActionButtonProps = ButtonProps & {
  /** Variante visual usada pelo tema da aplicação. */
  appearance?: "primary" | "secondary" | "quiet";
};

/** Nome de um ícone compartilhado do aplicativo. */
export type AppIconName =
  | "block"
  | "sports"
  | "play"
  | "pause"
  | "achievement"
  | "competitor"
  | "professional";

/** Props do ícone Material padronizado. */
export type AppIconProps = SvgIconProps & { name: AppIconName };

/** Props do campo de texto padronizado. */
export type AppTextFieldProps = TextFieldProps;

/** Tamanhos suportados do avatar. */
export type AvatarSize = "sm" | "md" | "lg" | "xl";

/** Props do avatar, com link opcional para o perfil. */
export type AvatarProps = {
  avatarUrl: string | null | undefined;
  alt: string;
  size?: AvatarSize;
  userId?: number;
  /** Cor da borda visual do avatar. */
  borderColor?: string;
};

/** Props do link que envolve um avatar. */
export type LinkedAvatarProps = {
  userId: number;
  label: string;
  children: ReactNode;
};

/** Props do provedor de tema. */
export type ColorModeProviderProps = { children: ReactNode };

/** Props do estado vazio de uma área de conteúdo. */
export type EmptyStateProps = {
  children: ReactNode;
  action?: ReactNode;
};

/** Props da mensagem de erro exibida por toast. */
export type ErrorTextProps = {
  error: string | null;
  onDismiss?: () => void;
};

/** Props do contêiner compartilhado das páginas. */
export type PageContainerProps = {
  children: ReactNode;
  fillHeight?: boolean;
};

/** Props do título de página ou seção. */
export type PageHeadingProps = { children: string };

/** Props do cartão compartilhado entre seções. */
export type SectionCardProps = PaperProps & { children: ReactNode };

/** Props do provedor de notificações. */
export type ToasterProviderProps = { children: ReactNode };

/** Props da notificação exibida pelo provedor. */
export type ToastViewProps = {
  toast: Toast | null;
  onDismiss: () => void;
};

/** Props do contador de itens não lidos. */
export type UnreadBadgeProps = {
  count: number;
  children: ReactNode;
};
