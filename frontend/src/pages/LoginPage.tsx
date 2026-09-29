import { useState, type SubmitEvent } from "react";
import { Navigate, useNavigate, type NavigateFunction } from "react-router-dom";

import { login, signup } from "../api/auth";
import { useAuth } from "../app/auth-session";
import type { User } from "../api/types";
import { ui } from "../ui/classes";

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
  setUser: (user: User | null) => void;
  navigate: NavigateFunction;
};

/** Campo com label acessível (somente leitores de tela). */
function Field(
  props: { id: string; label: string } & React.ComponentProps<"input">,
) {
  const { id, label, ...inputProps } = props;
  return (
    <>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <input id={id} className={ui.field} {...inputProps} />
    </>
  );
}

/** Campo de nickname exibido apenas no cadastro. */
function NicknameField(form: LoginFormModel) {
  if (form.mode !== "signup") return null;
  return (
    <Field
      id="login-nickname"
      label="Nickname"
      type="text"
      autoComplete="username"
      placeholder="nickname"
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
): Promise<void> {
  event.preventDefault();
  form.setError(null);
  form.setPending(true);
  try {
    form.setUser(await authenticate(form));
    form.navigate("/home");
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
    <p className="text-sm text-red-400" role="alert">
      {error}
    </p>
  );
}

/** Botões de submit e alternância de modo. */
function AuthActions(form: LoginFormModel) {
  return (
    <>
      <button className={ui.btn} type="submit" disabled={form.pending}>
        {form.pending ? "Aguarde…" : form.mode === "login" ? "Entrar" : "Cadastrar"}
      </button>
      <button
        className={`self-start ${ui.link}`}
        type="button"
        onClick={() => toggleAuthMode(form)}
      >
        {form.mode === "login" ? "Criar conta" : "Já tenho conta"}
      </button>
    </>
  );
}

/** Corpo do formulário (campos + ações). */
function AuthFormBody({ form }: { form: LoginFormModel }) {
  return (
    <form
      className="flex max-w-sm flex-col gap-2"
      onSubmit={(e) => void handleLoginSubmit(e, form)}
    >
      <NicknameField {...form} />
      <EmailField {...form} />
      <PasswordField {...form} />
      <AuthActions {...form} />
    </form>
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
  const navigate = useNavigate();
  const { setUser } = useAuth();
  return {
    mode, email, nickname, password, error, pending,
    setEmail, setNickname, setPassword, setError, setPending, setMode, setUser, navigate,
  };
}

/** Formulário completo com estado de login/cadastro. */
function LoginForm() {
  const form = useLoginForm();
  return (
    <main className={`${ui.page} gap-4 p-4 sm:p-6`}>
      <h1 className={ui.title}>{form.mode === "login" ? "Login" : "Criar conta"}</h1>
      <AuthFormBody form={form} />
      <FormError error={form.error} />
    </main>
  );
}

/**
 * Página de autenticação.
 * Permite login e cadastro via API real de auth, e redireciona se já houver sessão.
 */
export function LoginPage() {
  const { user, ready } = useAuth();
  if (!ready) {
    return <p className={`p-4 ${ui.muted}`}>Loading…</p>;
  }
  if (user !== null) {
    return <Navigate to="/home" replace />;
  }
  return <LoginForm />;
}
