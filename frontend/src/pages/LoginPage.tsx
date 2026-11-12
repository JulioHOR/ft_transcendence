import { useState, type SubmitEvent } from "react";
import { Navigate, useNavigate, type NavigateFunction } from "react-router-dom";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { login, signup } from "../api/auth";
import {
  EMAIL_PATTERN,
  NICKNAME_MAX_LENGTH,
  NICKNAME_MIN_LENGTH,
  NICKNAME_PATTERN,
  PASSWORD_MIN_LENGTH,
} from "../api/validation";
import { friendlyError } from "../api/http";
import { useAuth } from "../app/auth-session";
import type { User } from "../api/types";
import { ActionButton } from "../ui/ActionButton";
import { AppTextField } from "../ui/AppTextField";
import { ErrorText } from "../ui/ErrorText";
import type {
  AuthFormBodyProps,
  AuthMode,
  FieldProps,
  FieldValues,
  FormErrorProps,
  LoginCardProps,
  LoginFormProps,
  LoginFormModel,
} from "./loginProps";

/** Material UI form field. */
function Field({ minLength, maxLength, pattern, ...props }: FieldProps) {
  return (
    <AppTextField
      {...props}
      slotProps={{ htmlInput: { minLength, maxLength, pattern } }}
    />
  );
}

/** Nickname field displayed only during registration. */
function NicknameField({ form }: LoginFormProps) {
  if (form.mode !== "signup") return null;
  return (
    <Field
      id="login-nickname"
      label="Apelido"
      type="text"
      autoComplete="username"
      placeholder="apelido"
      required
      minLength={NICKNAME_MIN_LENGTH}
      maxLength={NICKNAME_MAX_LENGTH}
      pattern={NICKNAME_PATTERN}
      value={form.nickname}
      onChange={(e) => form.setNickname(e.target.value)}
    />
  );
}

/** Email field. */
function EmailField({ form }: LoginFormProps) {
  return (
    <Field
      id="login-email"
      label="Email"
      type="email"
      autoComplete="email"
      pattern={EMAIL_PATTERN}
      placeholder="email"
      required
      value={form.email}
      onChange={(e) => form.setEmail(e.target.value)}
    />
  );
}

/** Password field. */
function PasswordField({ form }: LoginFormProps) {
  return (
    <Field
      id="login-password"
      label="Senha"
      type="password"
      autoComplete="current-password"
      placeholder="senha"
      required
      minLength={form.mode === "signup" ? PASSWORD_MIN_LENGTH : undefined}
      value={form.password}
      onChange={(e) => form.setPassword(e.target.value)}
    />
  );
}

/** Authenticates via login or signup based on the current mode. */
async function authenticate(values: FieldValues): Promise<User> {
  if (values.mode === "login") {
    return login({ email: values.email, password: values.password });
  }
  return signup(values);
}

/** Submits the authentication form and updates the session. */
async function handleLoginSubmit(
  event: SubmitEvent<HTMLFormElement>,
  form: LoginFormModel,
  setUser: (user: User | null) => void,
  navigate: NavigateFunction,
): Promise<void> {
  event.preventDefault();
  form.setError(null);
  form.setPending(true);
  try {
    setUser(await authenticate(form));
    navigate("/profile");
  } catch (err) {
    form.setError(
      friendlyError(
        err,
        "Não foi possível entrar. Tente novamente.",
        "Falha na autenticação",
      ),
    );
  } finally {
    form.setPending(false);
  }
}

/** Toggles between login and registration and clears the error. */
function toggleAuthMode(form: LoginFormModel): void {
  form.setMode(form.mode === "login" ? "signup" : "login");
  form.setError(null);
}

/** Displays the form error, if any. */
function FormError({ error }: FormErrorProps) {
  return <ErrorText error={error} />;
}

/** Submit and mode-toggle buttons. */
function AuthActions({ form }: LoginFormProps) {
  return (
    <>
      <ActionButton appearance="primary" type="submit" disabled={form.pending}>
        {form.pending
          ? "Aguarde…"
          : form.mode === "login"
            ? "Entrar"
            : "Cadastrar"}
      </ActionButton>
      <ActionButton
        appearance="quiet"
        type="button"
        onClick={() => toggleAuthMode(form)}
      >
        {form.mode === "login" ? "Criar conta" : "Já tenho conta"}
      </ActionButton>
    </>
  );
}

/** Form body (fields + actions). */
function AuthFormBody({ form, onSubmit }: AuthFormBodyProps) {
  return (
    <Stack
      component="form"
      spacing={1.5}
      sx={{ width: "100%", maxWidth: 420 }}
      onSubmit={onSubmit}
    >
      <NicknameField form={form} />
      <EmailField form={form} />
      <PasswordField form={form} />
      <AuthActions form={form} />
    </Stack>
  );
}

/** Local state for the login / registration form. */
function useLoginForm(): LoginFormModel {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return {
    mode,
    email,
    nickname,
    password,
    error,
    pending,
    setEmail,
    setNickname,
    setPassword,
    setError,
    setPending,
    setMode,
  };
}

/** Complete form with login / registration state. */
function LoginForm() {
  const form = useLoginForm();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const onSubmit = (event: SubmitEvent<HTMLFormElement>) =>
    void handleLoginSubmit(event, form, setUser, navigate);
  return (
    <Box component="main" sx={loginPageSx}>
      <LoginCard form={form} onSubmit={onSubmit} />
    </Box>
  );
}

/** Centers the authentication card, with padding on small screens. */
const loginPageSx = {
  minHeight: "100%",
  display: "grid",
  placeItems: "center",
  p: { xs: 2, sm: 4 },
};
/** Limits the width and sets the card's internal spacing. */
const loginCardSx = {
  width: "100%",
  maxWidth: 500,
  p: { xs: 3, sm: 4 },
  borderColor: "divider",
};

/** Card containing the title, form, and error message. */
function LoginCard({ form, onSubmit }: LoginCardProps) {
  return (
    <Paper variant="outlined" sx={loginCardSx}>
      <Stack spacing={2.5}>
        <Typography variant="h2">
          {form.mode === "login" ? "Entrar" : "Criar conta"}
        </Typography>
        <AuthFormBody form={form} onSubmit={onSubmit} />
        <FormError error={form.error} />
      </Stack>
    </Paper>
  );
}

/**
 * Authentication page.
 * Supports login and registration through the real auth API, and redirects if a session already exists.
 */
export function LoginPage() {
  const { user, ready } = useAuth();
  if (!ready) {
    return <Box sx={{ p: 4, color: "text.secondary" }}>Carregando…</Box>;
  }
  if (user !== null) {
    return <Navigate to="/profile" replace />;
  }
  return <LoginForm />;
}
