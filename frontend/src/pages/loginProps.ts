import type { ChangeEventHandler, SubmitEvent } from "react";
import type { User } from "../api/types";

/** Mode displayed in the authentication form. */
export type AuthMode = "login" | "signup";

/** Form field values. */
export type FieldValues = {
  mode: AuthMode;
  email: string;
  nickname: string;
  password: string;
};

/** State model for the login/registration form. */
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

/** Props shared by the form fields and actions. */
export type LoginFormProps = { form: LoginFormModel };

/** Props for an authentication text field. */
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

/** Props for the authentication form body. */
export type AuthFormBodyProps = {
  form: LoginFormModel;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
};

/** Props for the authentication card. */
export type LoginCardProps = AuthFormBodyProps;

/** Props for the form error message. */
export type FormErrorProps = { error: string | null };

/** Data used by the authenticated submission. */
export type LoginSubmitProps = {
  event: SubmitEvent<HTMLFormElement>;
  form: LoginFormModel;
  setUser: (user: User | null) => void;
};
