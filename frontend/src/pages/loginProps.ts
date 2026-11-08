import type { ChangeEventHandler, SubmitEvent } from "react";
import type { User } from "../api/types";

/** Modo exibido no formulário de autenticação. */
export type AuthMode = "login" | "signup";

/** Valores dos campos do formulário. */
export type FieldValues = {
  mode: AuthMode;
  email: string;
  nickname: string;
  password: string;
};

/** Modelo de estado do formulário de login/cadastro. */
export type LoginFormModel = FieldValues & {
  error: string | null;
  pending: boolean;
  setEmail: (value: string) => void;
  setNickname: (value: string) => void;
  setPassword: (value: string) => void;
  setError: (value: string | null) => void;
  setPending: (value: boolean) => void;
  setMode: (value: AuthMode) => void;
};

/** Props compartilhadas pelos campos e ações do formulário. */
export type LoginFormProps = { form: LoginFormModel };

/** Props do campo de texto da autenticação. */
export type FieldProps = {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
};

/** Props do corpo do formulário de autenticação. */
export type AuthFormBodyProps = {
  form: LoginFormModel;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
};

/** Props do cartão de autenticação. */
export type LoginCardProps = AuthFormBodyProps;

/** Props da mensagem de erro do formulário. */
export type FormErrorProps = { error: string | null };

/** Dados usados pelo envio autenticado. */
export type LoginSubmitProps = {
  event: SubmitEvent<HTMLFormElement>;
  form: LoginFormModel;
  setUser: (user: User | null) => void;
};
