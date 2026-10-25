import {
  useState,
  type ChangeEventHandler,
  type Dispatch,
  type ReactNode,
  type SubmitEvent,
  type SetStateAction,
} from "react";
import { useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { logout } from "../api/auth";
import { useAuth } from "../app/auth-session";
import type { User } from "../api/types";
import { ActionButton } from "../ui/ActionButton";
import { AppTextField } from "../ui/AppTextField";
import { PageContainer } from "../ui/PageContainer";
import { SectionCard } from "../ui/SectionCard";
import { PageHeading } from "../ui/PageHeading";

/** Mensagem da demo REST /api/messages. */
type Message = {
  /** Identificador da mensagem. */
  id: number;
  /** Conteúdo textual da mensagem. */
  content: string;
};

/** Setter de estado para valores em texto. */
type SetString = Dispatch<SetStateAction<string>>;

/** Setter de estado para mensagem de erro opcional. */
type SetError = Dispatch<SetStateAction<string | null>>;

/** Envia uma nova mensagem para /api/messages. */
async function postMessage(content: string): Promise<void> {
  await fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

/** Busca as mensagens e devolve uma listagem textual para exibição. */
async function fetchListing(): Promise<string> {
  const rows: Message[] = await (await fetch("/api/messages")).json();
  return rows.map((m) => `${m.id}: ${m.content}`).join(" | ");
}

/** Campo de formulário com label visível. */
function LabeledInput(props: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  readOnly?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement>;
}) {
  return (
    <Box sx={{ minWidth: 0, flex: 1 }}>
      <AppTextField
        id={props.id}
        label={props.label}
        value={props.value}
        placeholder={props.placeholder}
        onChange={props.onChange}
        slotProps={{ htmlInput: { readOnly: props.readOnly } }}
      />
    </Box>
  );
}

/** Trata o envio do formulário de nova mensagem. */
async function sendMessage(
  event: SubmitEvent<HTMLFormElement>,
  draft: string,
  setDraft: SetString,
  setError: SetError,
): Promise<void> {
  event.preventDefault();
  setError(null);
  try {
    await postMessage(draft);
    setDraft("");
  } catch {
    setError("Falha ao enviar mensagem.");
  }
}

/** Carrega a listagem de mensagens a partir da API. */
async function loadMessages(
  setListing: SetString,
  setError: SetError,
): Promise<void> {
  setError(null);
  try {
    setListing(await fetchListing());
  } catch {
    setError("Falha ao carregar mensagens.");
  }
}

/** Propriedades do formulário de envio de mensagem. */
type MessageFormProps = {
  /** Texto digitado da mensagem. */
  draft: string;
  /** Atualiza o texto digitado. */
  setDraft: SetString;
  /** Atualiza a mensagem de erro da board. */
  setError: SetError;
};

/** Formulário para enviar uma mensagem à demo /api/messages. */
function MessageForm({ draft, setDraft, setError }: MessageFormProps) {
  return (
    <Stack
      component="form"
      direction={{ xs: "column", sm: "row" }}
      spacing={1.5}
      onSubmit={(e) => void sendMessage(e, draft, setDraft, setError)}
    >
      <LabeledInput
        id="msg-draft"
        label="Mensagem"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="mensagem"
      />
      <ActionButton type="submit" sx={{ width: { xs: "100%", sm: "auto" } }}>
        Enviar
      </ActionButton>
    </Stack>
  );
}

/** Propriedades da listagem de mensagens. */
type MessageListingProps = {
  /** Listagem textual já formatada. */
  listing: string;
  /** Atualiza a listagem exibida. */
  setListing: SetString;
  /** Atualiza a mensagem de erro da board. */
  setError: SetError;
};

/** Exibe a listagem de mensagens e permite recarregá-la. */
function MessageListing({
  listing,
  setListing,
  setError,
}: MessageListingProps) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
      <LabeledInput
        id="msg-list"
        label="Lista de mensagens"
        value={listing}
        readOnly
      />
      <ActionButton
        type="button"
        onClick={() => void loadMessages(setListing, setError)}
        sx={{ width: { xs: "100%", sm: "auto" } }}
      >
        Obter
      </ActionButton>
    </Stack>
  );
}

/** Exibe o erro da board, se houver. */
function BoardError({ error }: { error: string | null }) {
  if (error === null) return null;
  return (
    <Alert severity="error" variant="outlined" role="alert">
      {error}
    </Alert>
  );
}

/** Encerra a sessão no servidor e limpa o usuário no frontend. */
async function endSession(
  setUser: (user: User | null) => void,
  navigate: ReturnType<typeof useNavigate>,
): Promise<void> {
  try {
    await logout();
  } finally {
    setUser(null);
    navigate("/login");
  }
}

/** Saudação e botão de logout do usuário autenticado. */
function HomeSessionBar() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  if (user === null) {
    return <Typography color="text.secondary">Não logado</Typography>;
  }
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
      <Typography color="text.secondary">Olá, {user.nickname}</Typography>
      <ActionButton
        type="button"
        onClick={() => void endSession(setUser, navigate)}
      >
        Sair
      </ActionButton>
    </Stack>
  );
}

/**
 * Página inicial após autenticação.
 * Exibe o usuário da sessão, logout e a demo de /api/messages.
 */
export function HomePage() {
  const [draft, setDraft] = useState("");
  const [listing, setListing] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <PageContainer>
      <HomePanels
        draft={draft}
        setDraft={setDraft}
        listing={listing}
        setListing={setListing}
        error={error}
        setError={setError}
      />
    </PageContainer>
  );
}

/** Agrupa a sessão, os formulários e os avisos da página inicial. */
function HomePanels(props: {
  draft: string;
  setDraft: SetString;
  listing: string;
  setListing: SetString;
  error: string | null;
  setError: SetError;
}) {
  return (
    <Stack spacing={2.5}>
      <HomeSessionBar />
      <HomeMessagePanels {...props} />
      <BoardError error={props.error} />
    </Stack>
  );
}

/** Separa o envio de mensagem da listagem publicada. */
function HomeMessagePanels(props: {
  draft: string;
  setDraft: SetString;
  listing: string;
  setListing: SetString;
  setError: SetError;
}) {
  return (
    <>
      <NewMessageSection {...props} />
      <PublishedMessagesSection {...props} />
    </>
  );
}

/** Seção para publicar uma nova mensagem. */
function NewMessageSection(props: {
  draft: string;
  setDraft: SetString;
  setError: SetError;
}) {
  return (
    <MessageSection title="Nova mensagem">
      <MessageForm {...props} />
    </MessageSection>
  );
}

/** Seção para consultar mensagens já publicadas. */
function PublishedMessagesSection(props: {
  listing: string;
  setListing: SetString;
  setError: SetError;
}) {
  return (
    <MessageSection title="Mensagens publicadas">
      <MessageListing {...props} />
    </MessageSection>
  );
}

/** Cartão reutilizado pelas seções de mensagem da página inicial. */
function MessageSection(props: { title: string; children: ReactNode }) {
  return (
    <SectionCard sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <PageHeading>{props.title}</PageHeading>
        {props.children}
      </Stack>
    </SectionCard>
  );
}
