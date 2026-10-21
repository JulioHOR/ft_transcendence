import { type ReactNode, type SubmitEvent } from "react";
import { Link as RouterLink } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import MuiLink from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ChatMessage } from "../api/chat";
import type { Friend } from "../api/friends";
import { liveAvatarUrl } from "../api/profile";
import { useAuth } from "../app/auth-session";
import { useFriends } from "../app/friends-session";
import { GLOBAL_CHAT_TAB_ID, type ChatSession } from "../chat/privateChat";
import { useChatSession } from "../chat/useChatSession";
import { Avatar } from "../ui/Avatar";
import { ErrorText } from "../ui/ErrorText";
import { ActionButton } from "../ui/ActionButton";
import { AppTextField } from "../ui/AppTextField";
import { PageContainer } from "../ui/PageContainer";
import { UnreadBadge } from "../ui/UnreadBadge";

/** Identifica o estado de leitura da última mensagem própria. */
type MessageReceiptInfo = {
  /** Mensagem própria à qual o recibo se refere. */
  messageId: string;
  /** Estado de entrega ou leitura exibido na interface. */
  kind: "entregue" | "visualizado";
};

/** Texto e aparência usados para cada estado do recibo. */
const messageReceiptDisplay: Record<
  MessageReceiptInfo["kind"],
  { label: string; marks: string; color: "success.main" | "text.disabled" }
> = {
  entregue: { label: "Enviado", marks: "✓", color: "text.disabled" },
  visualizado: { label: "Lido", marks: "✓✓", color: "success.main" },
};

/** Recibo da última mensagem própria (entregue / visualizado). */
function lastOwnReceipt(
  messages: ChatMessage[],
  currentUserId: number | undefined,
  peerLastReadMessageId: string | null,
): MessageReceiptInfo | null {
  if (currentUserId == null) return null;
  const lastOwn = messages.findLast(
    (message) => message.userId === currentUserId,
  );
  if (lastOwn == null) return null;
  if (peerLastReadMessageId == null) {
    return { messageId: lastOwn.id, kind: "entregue" };
  }
  const readIndex = messages.findIndex((m) => m.id === peerLastReadMessageId);
  const ownIndex = messages.findIndex((m) => m.id === lastOwn.id);
  const seen = readIndex >= 0 && ownIndex >= 0 && ownIndex <= readIndex;
  return { messageId: lastOwn.id, kind: seen ? "visualizado" : "entregue" };
}

/** Avatar atual do autor (sessão / friends, com fallback da mensagem). */
function messageAvatarUrl(
  message: ChatMessage,
  selfId: number | undefined,
  selfAvatarUrl: string | null | undefined,
  friends: Friend[],
): string | null {
  return liveAvatarUrl(message.userId, {
    selfId,
    selfAvatarUrl,
    friends,
    fallback: message.avatarUrl,
  });
}

/** Ícone de recibo: ✓ entregue, ✓✓ visualizado. */
function MessageReceipt(props: { kind: "entregue" | "visualizado" }) {
  const display = messageReceiptDisplay[props.kind];
  return (
    <Box
      component="span"
      aria-label={display.label}
      sx={{
        ml: 1,
        whiteSpace: "nowrap",
        fontSize: "caption.fontSize",
        fontWeight: 600,
        color: display.color,
      }}
    >
      {display.marks} {display.label}
    </Box>
  );
}

/** Texto e recibo de uma mensagem, com link para o perfil do autor. */
function MessageContent(props: {
  message: ChatMessage;
  receipt: "entregue" | "visualizado" | null;
}) {
  return (
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}
    >
      <MuiLink
        component={RouterLink}
        to={`/profile/${props.message.userId}`}
        underline="hover"
        color="text.primary"
      >
        {props.message.nickname}
      </MuiLink>
      : {props.message.text}
      {props.receipt ? <MessageReceipt kind={props.receipt} /> : null}
    </Typography>
  );
}

function MessageItem(props: {
  message: ChatMessage;
  avatarUrl: string | null;
  receipt: "entregue" | "visualizado" | null;
}) {
  return (
    <ListItem
      component="li"
      disableGutters
      sx={{ gap: 1, alignItems: "center", py: 1 }}
    >
      <Avatar
        userId={props.message.userId}
        avatarUrl={props.avatarUrl}
        alt={props.message.nickname}
        size="sm"
      />
      <MessageContent message={props.message} receipt={props.receipt} />
    </ListItem>
  );
}

/** Itens da lista de mensagens. */
function MessageListItems(props: {
  messages: ChatMessage[];
  currentUserId: number | undefined;
  selfAvatarUrl: string | null | undefined;
  friends: Friend[];
  receipt: MessageReceiptInfo | null;
}) {
  return props.messages.map((message) => (
    <MessageItem
      key={message.id}
      message={message}
      avatarUrl={messageAvatarUrl(
        message,
        props.currentUserId,
        props.selfAvatarUrl,
        props.friends,
      )}
      receipt={
        props.receipt != null && props.receipt.messageId === message.id
          ? props.receipt.kind
          : null
      }
    />
  ));
}

/** Rodapé do quadro: alguém está digitando. */
function TypingFooter({ nickname }: { nickname: string | null }) {
  if (nickname == null) return null;
  return (
    <Box
      role="status"
      sx={{
        px: 1.5,
        py: 1,
        borderTop: 1,
        borderColor: "divider",
        color: "text.secondary",
        typography: "caption",
      }}
    >
      {nickname} está digitando…
    </Box>
  );
}

/** Recibo da aba privada, ou null no global. */
function privateTabReceipt(
  session: ChatSession,
  messages: ChatMessage[],
  isPrivate: boolean,
): MessageReceiptInfo | null {
  if (!isPrivate) return null;
  return lastOwnReceipt(
    messages,
    session.currentUserId,
    session.peerLastReadMessageId,
  );
}

/** Quadro de mensagens com “digitando…” no rodapé. */
function EmptyChatMessages() {
  return (
    <ListItem component="li" sx={{ justifyContent: "center", py: 3 }}>
      <Typography color="text.secondary">
        Ainda não há mensagens nesta conversa.
      </Typography>
    </ListItem>
  );
}

/** Propriedades compartilhadas pela lista e sua área rolável. */
type MessageRowsProps = {
  /** Mensagens da conversa ativa. */
  messages: ChatMessage[];
  /** Estado e ações compartilhados pelo chat. */
  session: ChatSession;
  /** Avatar do usuário autenticado, se disponível. */
  selfAvatarUrl: string | null | undefined;
  /** Amigos usados para resolver avatares dos autores. */
  friends: Friend[];
  /** Recibo da última mensagem própria, se houver. */
  receipt: MessageReceiptInfo | null;
};

/** Exibe as mensagens ou o estado vazio da conversa. */
function MessageRows(props: MessageRowsProps) {
  if (props.messages.length === 0) return <EmptyChatMessages />;
  return (
    <MessageListItems
      messages={props.messages}
      currentUserId={props.session.currentUserId}
      selfAvatarUrl={props.selfAvatarUrl}
      friends={props.friends}
      receipt={props.receipt}
    />
  );
}

/** Área rolável que contém a lista de mensagens. */
function MessageScroll(props: MessageRowsProps) {
  return (
    <List
      component="ul"
      sx={{ minHeight: 0, flex: 1, overflowY: "auto", px: 1.5, py: 1 }}
    >
      <MessageRows {...props} />
    </List>
  );
}

/** Estrutura visual da lista e do indicador de digitação. */
function MessageListFrame(props: {
  children: ReactNode;
  nickname: string | null;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        display: "flex",
        minHeight: 0,
        flex: 1,
        flexDirection: "column",
        overflow: "hidden",
        borderColor: "divider",
      }}
    >
      {props.children}
      <TypingFooter nickname={props.nickname} />
    </Paper>
  );
}

/** Calcula o recibo e monta o quadro da conversa ativa. */
function MessageListPanel(props: {
  session: ChatSession;
  messages: ChatMessage[];
  selfAvatarUrl: string | null | undefined;
  friends: Friend[];
  isPrivate: boolean;
}) {
  const receipt = privateTabReceipt(
    props.session,
    props.messages,
    props.isPrivate,
  );
  return (
    <MessageListFrame
      nickname={props.isPrivate ? props.session.typingNickname : null}
    >
      <MessageScroll {...props} receipt={receipt} />
    </MessageListFrame>
  );
}

/** Seleciona as mensagens da aba ativa e prepara o quadro. */
function MessageList(props: {
  session: ChatSession;
  selfAvatarUrl: string | null | undefined;
  friends: Friend[];
  isPrivate: boolean;
}) {
  const messages = activeTabMessages(props.session);
  return <MessageListPanel {...props} messages={messages} />;
}

/** Propriedades visuais e ações compartilhadas pelas abas do chat. */
type ChatTabProps = {
  /** Conteúdo exibido na aba, incluindo badge opcional. */
  label: ReactNode;
  /** Nome acessível da aba. */
  ariaLabel: string;
  /** Indica se a aba está selecionada. */
  active: boolean;
  /** Seleciona a conversa associada. */
  onSelect: () => void;
  /** Fecha a aba quando a ação estiver disponível. */
  onClose?: () => void;
};

/** Estilo compartilhado das abas geral e privadas. */
const chatTabSx = {
  height: 40,
  borderRadius: 1,
  maxWidth: { xs: "min(75vw, 280px)", sm: 360 },
  "& .MuiChip-label": {
    minWidth: 0,
    px: 1.5,
    fontSize: "0.875rem",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
};

/** Renderiza uma aba de conversa com fechamento opcional. */
function ChatTab(props: ChatTabProps) {
  return (
    <Chip
      clickable
      color={props.active ? "primary" : "default"}
      variant={props.active ? "filled" : "outlined"}
      label={props.label}
      onClick={props.onSelect}
      onDelete={props.onClose}
      aria-label={props.ariaLabel}
      sx={chatTabSx}
    />
  );
}

/** Renderiza as abas privadas abertas na sessão de chat. */
function PrivateTabs({ session }: { session: ChatSession }) {
  return (
    <>
      {session.privateChatTabs.map((tab) => {
        const unread = session.unreadByConversation[tab.conversationId] ?? 0;
        return (
          <ChatTab
            key={tab.conversationId}
            label={
              <UnreadBadge count={unread}>{tab.otherNickname}</UnreadBadge>
            }
            ariaLabel={`${tab.otherNickname}${unread > 0 ? `, ${unread} mensagens não lidas` : ""}`}
            active={session.activeTabId === tab.conversationId}
            onSelect={() => session.selectTab(tab.conversationId)}
            onClose={() => session.closeTab(tab.conversationId)}
          />
        );
      })}
    </>
  );
}

/** Barra de abas: conversa geral e conversas privadas abertas. */
function ChatTabBar({ session }: { session: ChatSession }) {
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
      <ChatTab
        label="Geral"
        ariaLabel="Conversa geral"
        active={session.activeTabId === GLOBAL_CHAT_TAB_ID}
        onSelect={() => session.selectTab(GLOBAL_CHAT_TAB_ID)}
      />
      <PrivateTabs session={session} />
    </Stack>
  );
}

/** Campo de texto do composer. */
function ChatDraftInput({ session }: { session: ChatSession }) {
  return (
    <AppTextField
      id="chat-draft"
      size="small"
      fullWidth
      sx={{ flex: 1, minWidth: 0 }}
      value={session.draft}
      disabled={!session.canSendOnActiveTab}
      onChange={(event) => session.setDraft(event.target.value)}
      placeholder="mensagem"
      aria-label="Mensagem"
    />
  );
}

/** Formulário de envio na aba ativa. */
function ChatComposer({ session }: { session: ChatSession }) {
  function onSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    session.submitDraft();
  }
  return (
    <Stack
      component="form"
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      onSubmit={onSubmit}
    >
      <ChatDraftInput session={session} />
      <ActionButton
        appearance="primary"
        type="submit"
        disabled={!session.canSendOnActiveTab}
        sx={{ width: { xs: "100%", sm: "auto" } }}
      >
        Enviar
      </ActionButton>
    </Stack>
  );
}

/** Mensagens da aba ativa (global ou conversa privada). */
function activeTabMessages(session: ChatSession): ChatMessage[] {
  if (session.activeTabId === GLOBAL_CHAT_TAB_ID) return session.globalMessages;
  return session.privateMessagesByConversation[session.activeTabId] ?? [];
}

/** Aviso quando a amizade encerrou e o envio está bloqueado. */
function EndedFriendshipNotice(props: { show: boolean }) {
  if (!props.show) return null;
  return (
    <Alert severity="info" variant="outlined" role="status">
      amizade encerrada — não é possível enviar mensagens neste chat
    </Alert>
  );
}

/** Conteúdo da página (abas, lista, composer). */
function ChatContent(props: {
  session: ChatSession;
  selfAvatarUrl: string | null | undefined;
  friends: Friend[];
}) {
  const { session } = props;
  const isPrivate = session.activeTabId !== GLOBAL_CHAT_TAB_ID;
  return (
    <Stack spacing={1.5} sx={{ minHeight: 0, flex: 1 }}>
      <ChatTabBar session={session} />
      <ErrorText error={session.error} />
      <EndedFriendshipNotice show={isPrivate && !session.canSendOnActiveTab} />
      <MessageList
        session={session}
        selfAvatarUrl={props.selfAvatarUrl}
        friends={props.friends}
        isPrivate={isPrivate}
      />
      <ChatComposer session={session} />
    </Stack>
  );
}

/** Página de chat global e conversas privadas. */
export function ChatPage() {
  const { user } = useAuth();
  const { friends } = useFriends();
  return (
    <PageContainer>
      <ChatContent
        session={useChatSession(user?.id)}
        selfAvatarUrl={user?.avatarUrl}
        friends={friends}
      />
    </PageContainer>
  );
}
