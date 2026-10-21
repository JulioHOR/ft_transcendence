import { useState, type ChangeEventHandler, type SubmitEvent } from "react";
import { Navigate, useNavigate, type NavigateFunction } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { login, signup } from "../api/auth";
import { useAuth } from "../app/auth-session";
import type { User } from "../api/types";
import { ActionButton } from "../ui/ActionButton";
import { AppTextField } from "../ui/AppTextField";

/** Modo exibido no formulário de autenticação. */
type AuthMode = "login" | "signup";

/** Valores dos campos do formulário. */
type FieldValues = {
  mode: AuthMode;
  email: string;
  nickname: string;
  password: string;
};

/** Modelo de estado do formulário de login/cadastro. */
type LoginFormModel = FieldValues & {
  error: string | null;
  pending: boolean;
  setEmail: (value: string) => void;
  setNickname: (value: string) => void;
  setPassword: (value: string) => void;
  setError: (value: string | null) => void;
  setPending: (value: boolean) => void;
  setMode: (value: AuthMode) => void;
};

/** Campo de formulário Material UI. */
function Field(props: {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
}) {
  return <AppTextField {...props} />;
}

/** Campo de nickname exibido apenas no cadastro. */
function NicknameField(form: LoginFormModel) {
  if (form.mode !== "signup") return null;
  return (
    <Field
      id="login-nickname"
      label="Apelido"
      type="text"
      autoComplete="username"
      placeholder="apelido"
      value={form.nickname}
      onChange={(e) => form.setNickname(e.target.value)}
    />
  );
}

/** Campo de email. */
function EmailField(form: LoginFormModel) {
  return (
    <Field
      id="login-email"
      label="Email"
      type="email"
      autoComplete="email"
      placeholder="email"
      value={form.email}
      onChange={(e) => form.setEmail(e.target.value)}
    />
  );
}

/** Campo de senha. */
function PasswordField(form: LoginFormModel) {
  return (
    <Field
      id="login-password"
      label="Senha"
      type="password"
      autoComplete="current-password"
      placeholder="senha"
      value={form.password}
      onChange={(e) => form.setPassword(e.target.value)}
    />
  );
}

/** Autentica via login ou signup conforme o modo. */
async function authenticate(values: FieldValues): Promise<User> {
  if (values.mode === "login") {
    return login({ email: values.email, password: values.password });
  }
  return signup(values);
}

/** Envia o formulário de autenticação e atualiza a sessão. */
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
    navigate("/home");
  } catch (err) {
    form.setError(err instanceof Error ? err.message : "falhou");
  } finally {
    form.setPending(false);
  }
}

/** Alterna entre login e cadastro e limpa o erro. */
function toggleAuthMode(form: LoginFormModel): void {
  form.setMode(form.mode === "login" ? "signup" : "login");
  form.setError(null);
}

/** Exibe o erro do formulário, se houver. */
function FormError({ error }: { error: string | null }) {
  if (error === null) return null;
  return (
    <Alert severity="error" variant="outlined" role="alert">
      {error}
    </Alert>
  );
}

/** Botões de submit e alternância de modo. */
function AuthActions(form: LoginFormModel) {
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

/** Corpo do formulário (campos + ações). */
function AuthFormBody({
  form,
  onSubmit,
}: {
  form: LoginFormModel;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
}) {
  return (
    <Stack
      component="form"
      spacing={1.5}
      sx={{ width: "100%", maxWidth: 420 }}
      onSubmit={onSubmit}
    >
      <NicknameField {...form} />
      <EmailField {...form} />
      <PasswordField {...form} />
      <AuthActions {...form} />
    </Stack>
  );
}

/** Estado local do formulário de login/cadastro. */
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

/** Formulário completo com estado de login/cadastro. */
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

/** Centraliza o cartão de autenticação, com recuo em telas pequenas. */
const loginPageSx = {
  minHeight: "100%",
  display: "grid",
  placeItems: "center",
  p: { xs: 2, sm: 4 },
};
/** Limita a largura e define o espaçamento interno do cartão. */
const loginCardSx = {
  width: "100%",
  maxWidth: 500,
  p: { xs: 3, sm: 4 },
  borderColor: "divider",
};

/** Cartão que reúne título, formulário e mensagem de erro. */
function LoginCard({
  form,
  onSubmit,
}: {
  form: LoginFormModel;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
}) {
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
 * Página de autenticação.
 * Permite login e cadastro via API real de auth, e redireciona se já houver sessão.
 */
export function LoginPage() {
  const { user, ready } = useAuth();
  if (!ready) {
    return <Box sx={{ p: 4, color: "text.secondary" }}>Carregando…</Box>;
  }
  if (user !== null) {
    return <Navigate to="/home" replace />;
  }
  return <LoginForm />;
}
