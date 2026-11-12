import { type SubmitEvent } from "react";
import { Link as RouterLink } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import MuiLink from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import InputAdornment from "@mui/material/InputAdornment";
import { alpha } from "@mui/material/styles";
import { type ChatMessage } from "../api/chat";
import { MAX_CHAT_MESSAGE_LENGTH } from "../api/validation";
import type { Friend } from "../api/friends";
import { liveAvatarUrl } from "../api/profile";
import { useAuth } from "../app/auth-session";
import { useFriends } from "../app/friends-session";
import {
  GLOBAL_CHAT_TAB_ID,
  isAcceptedFriend,
  type ChatSession,
} from "../chat/privateChat";
import { useChatSession } from "../chat/useChatSession";
import { Avatar } from "../ui/Avatar";
import { ErrorText } from "../ui/ErrorText";
import { ActionButton } from "../ui/ActionButton";
import { AppTextField } from "../ui/AppTextField";
import { PageContainer } from "../ui/PageContainer";
import { UnreadBadge } from "../ui/UnreadBadge";
import { AppIcon } from "../ui/AppIcon";
import { EmptyState } from "../ui/EmptyState";
import type {
  ChatBlockButtonProps,
  ChatComposerProps,
  ChatContentProps,
  ChatSessionProps,
  ChatTabProps,
  GameInvitationActionsProps,
  GameInvitationAlertProps,
  GameInvitationNoticeProps,
  GameInvitationNoticesProps,
  GameInviteButtonProps,
  MessageContentProps,
  MessageItemProps,
  MessageLengthCounterProps,
  MessageListFrameProps,
  MessageListItemsProps,
  MessageListPanelProps,
  MessageListProps,
  MessageReceiptInfo,
  MessageReceiptProps,
  MessageRowsProps,
  PrivateChatActionsProps,
  PrivateMessageAccessNoticeProps,
  TypingFooterProps,
} from "./chatProps";

/** Text and appearance used for each receipt state. */
const messageReceiptDisplay: Record<
  MessageReceiptInfo["kind"],
  { label: string; marks: string; color: "success.main" | "text.disabled" }
> = {
  entregue: { label: "Enviado", marks: "✓", color: "text.disabled" },
  visualizado: { label: "Lido", marks: "✓✓", color: "success.main" },
};

/** Receipt for the most recent message sent by the current user (delivered / read). */
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

/** Author's current avatar (session / friends, with the message as a fallback). */
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

/** Receipt icon: ✓ delivered, ✓✓ read. */
function MessageReceipt(props: MessageReceiptProps) {
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

/** Message text and receipt, with a link to the author's profile. */
function MessageContent(props: MessageContentProps) {
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

/** Displays a message's avatar, content, and receipt. */
function MessageItem(props: MessageItemProps) {
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

/** Items in the message list. */
function MessageListItems(props: MessageListItemsProps) {
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

/** Frame footer: someone is typing. */
function TypingFooter({ nickname }: TypingFooterProps) {
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

/** Receipt for the private tab, or null for the global tab. */
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

/** Message frame with “typing…” in the footer. */
function EmptyChatMessages() {
  return (
    <ListItem component="li" sx={{ justifyContent: "center", py: 3 }}>
      <EmptyState>Ainda não há mensagens nesta conversa.</EmptyState>
    </ListItem>
  );
}

/** Displays the messages or the conversation's empty state. */
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

/** Scrollable area containing the message list. */
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

/** Visual structure of the list and typing indicator. */
function MessageListFrame(props: MessageListFrameProps) {
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

/** Calculates the receipt and builds the active conversation frame. */
function MessageListPanel(props: MessageListPanelProps) {
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

/** Selects the active tab's messages and prepares the frame. */
function MessageList(props: MessageListProps) {
  const messages = activeTabMessages(props.session);
  return <MessageListPanel {...props} messages={messages} />;
}

/** Visual properties and actions shared by the chat tabs. */
/** Shared style for the global and private tabs. */
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

/** Renders a conversation tab with optional closing. */
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

/** Renders the private tabs opened in the chat session. */
function PrivateTabs({ session }: ChatSessionProps) {
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

/** Tab bar: global conversation and open private conversations. */
function ChatTabBar({ session }: ChatSessionProps) {
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

/** Composer text field. */
function ChatDraftInput({ session }: ChatSessionProps) {
  return (
    <AppTextField
      id="chat-draft"
      size="small"
      fullWidth
      sx={{ flex: 1, minWidth: 0 }}
      value={session.draft}
      slotProps={{
        htmlInput: { maxLength: MAX_CHAT_MESSAGE_LENGTH },
        input: {
          endAdornment: <MessageLengthCounter value={session.draft.length} />,
        },
      }}
      required
      disabled={!session.canSendOnActiveTab}
      onChange={(event) => session.setDraft(event.target.value)}
      placeholder="mensagem"
      aria-label="Mensagem"
    />
  );
}

/** Displays the message limit and current length. */
function MessageLengthCounter({ value }: MessageLengthCounterProps) {
  return (
    <InputAdornment position="end">
      <Typography variant="caption" color="text.secondary">
        {value}/{MAX_CHAT_MESSAGE_LENGTH}
      </Typography>
    </InputAdornment>
  );
}

/** Send form for the active tab. */
function ChatComposer({ session }: ChatComposerProps) {
  /** Sends the current draft without reloading the page. */
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

/** Messages from the active tab (global or private conversation). */
function activeTabMessages(session: ChatSession): ChatMessage[] {
  if (session.activeTabId === GLOBAL_CHAT_TAB_ID) return session.globalMessages;
  return session.privateMessagesByConversation[session.activeTabId] ?? [];
}

/** Notice shown when the friendship has ended and sending is blocked. */
function PrivateMessageAccessNotice({
  session,
}: PrivateMessageAccessNoticeProps) {
  if (
    session.activeTabId === GLOBAL_CHAT_TAB_ID ||
    session.canSendOnActiveTab
  ) {
    return null;
  }
  return (
    <Alert severity="info" variant="outlined" role="status">
      Esta conversa não está disponível para enviar mensagens.
    </Alert>
  );
}

/** Actions available in the active private conversation. */
function PrivateChatActions({ session, friends }: PrivateChatActionsProps) {
  const tab = activePrivateTab(session);
  if (tab == null) return null;
  const hasActiveInvitation = hasActiveInvitationFor(session, tab.otherUserId);
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
      {isAcceptedFriend(friends, tab.otherUserId) ? (
        <GameInviteButton
          session={session}
          userId={tab.otherUserId}
          disabled={!session.canSendOnActiveTab || hasActiveInvitation}
        />
      ) : null}
      <ChatBlockButton session={session} userId={tab.otherUserId} />
    </Stack>
  );
}

/** Action to invite the contact to play. */
function GameInviteButton({
  session,
  userId,
  disabled,
}: GameInviteButtonProps) {
  return (
    <ActionButton
      startIcon={<AppIcon name="sports" />}
      disabled={disabled}
      onClick={() => session.sendGameInvite(userId)}
    >
      Convidar para jogar
    </ActionButton>
  );
}

/** Action to block or unblock messages from the contact. */
function ChatBlockButton({ session, userId }: ChatBlockButtonProps) {
  if (session.blockedByOtherUser) return null;
  const blocked = session.blockedByCurrentUser;
  return (
    <ActionButton
      startIcon={<AppIcon name="block" />}
      onClick={() =>
        blocked ? session.unblockUser(userId) : session.blockUser(userId)
      }
    >
      {blocked ? "Desbloquear" : "Bloquear mensagens"}
    </ActionButton>
  );
}

/** Indicates whether the contact has an invitation that has not ended. */
function hasActiveInvitationFor(session: ChatSession, userId: number) {
  return session.gameInvitations.some((invitation) =>
    isActiveInvitationFor(invitation, userId),
  );
}

/** Returns the selected private conversation. */
function activePrivateTab(session: ChatSession) {
  if (session.activeTabId === GLOBAL_CHAT_TAB_ID) return null;
  return (
    session.privateChatTabs.find(
      (tab) => tab.conversationId === session.activeTabId,
    ) ?? null
  );
}

/** Indicates whether there is already an active invitation for the contact. */
function isActiveInvitationFor(
  invitation: ChatSession["gameInvitations"][number],
  userId: number,
) {
  return (
    invitation.status !== "declined" &&
    invitation.status !== "cancelled" &&
    (invitation.senderId === userId || invitation.recipientId === userId)
  );
}

/** Displays match invitations sent or received through the chat. */
function GameInvitationNotices({ session }: GameInvitationNoticesProps) {
  const tab = activePrivateTab(session);
  if (tab == null) return null;
  const invitations = session.gameInvitations.filter(
    (invitation) =>
      invitation.status !== "started" &&
      (invitation.senderId === tab.otherUserId ||
        invitation.recipientId === tab.otherUserId),
  );
  if (invitations.length === 0) return null;
  return (
    <Stack spacing={1}>
      {invitations.map((invitation) => (
        <GameInvitationNotice
          key={invitation.inviteId}
          invitation={invitation}
          session={session}
        />
      ))}
    </Stack>
  );
}

/** Selects the invitation notification that matches the current state. */
function GameInvitationNotice({
  invitation,
  session,
}: GameInvitationNoticeProps) {
  const sentByCurrentUser = invitation.senderId === session.currentUserId;
  const accepted = invitation.status === "accepted";
  const finished = ["declined", "cancelled"].includes(invitation.status);
  const action = finished ? undefined : (
    <GameInvitationActions
      invitation={invitation}
      session={session}
      accepted={accepted}
      sentByCurrentUser={sentByCurrentUser}
    />
  );
  return (
    <GameInvitationAlert
      accepted={accepted}
      action={action}
      message={gameInvitationMessage(invitation, session)}
    />
  );
}

/** Displays the invitation with its corresponding action. */
function GameInvitationAlert(props: GameInvitationAlertProps) {
  return (
    <Alert
      severity={props.accepted ? "success" : "info"}
      variant="outlined"
      sx={{
        borderColor: (theme) =>
          alpha(
            props.accepted
              ? theme.palette.success.main
              : theme.palette.info.main,
            0.25,
          ),
      }}
      action={props.action}
    >
      {props.message}
    </Alert>
  );
}

/** Text appropriate to the invitation state. */
function gameInvitationMessage(
  invitation: ChatSession["gameInvitations"][number],
  session: ChatSession,
): string {
  const sentByCurrentUser = invitation.senderId === session.currentUserId;
  const otherNickname = sentByCurrentUser
    ? invitation.recipientNickname
    : invitation.senderNickname;
  if (invitation.status === "accepted")
    return "Convite aceito. A partida começa quando os dois entrarem.";
  if (invitation.status === "cancelled")
    return "O convite para jogar foi cancelado.";
  if (invitation.status === "declined") {
    return sentByCurrentUser
      ? `${invitation.recipientNickname} recusou o convite.`
      : "Você recusou o convite.";
  }
  return sentByCurrentUser
    ? `Convite enviado para ${otherNickname}.`
    : `${otherNickname} convidou você para jogar Pong.`;
}

/** Actions available depending on whether the invitation was sent, received, or accepted. */
function GameInvitationActions({
  invitation,
  session,
  accepted,
  sentByCurrentUser,
}: GameInvitationActionsProps) {
  if (accepted)
    return (
      <AcceptedInvitationActions invitation={invitation} session={session} />
    );
  if (sentByCurrentUser) {
    return (
      <ActionButton
        onClick={() => session.cancelGameInvite(invitation.inviteId)}
      >
        Cancelar
      </ActionButton>
    );
  }
  return <RespondInvitationActions invitation={invitation} session={session} />;
}

/** Accepts or declines a received invitation. */
function RespondInvitationActions({
  invitation,
  session,
}: GameInvitationNoticeProps) {
  return (
    <Stack direction="row" spacing={1}>
      <ActionButton
        appearance="primary"
        onClick={() => session.respondGameInvite(invitation.inviteId, true)}
      >
        Aceitar
      </ActionButton>
      <ActionButton
        onClick={() => session.respondGameInvite(invitation.inviteId, false)}
      >
        Recusar
      </ActionButton>
    </Stack>
  );
}

/** Actions to join the accepted match or cancel the invitation. */
function AcceptedInvitationActions({
  invitation,
  session,
}: GameInvitationNoticeProps) {
  return (
    <Stack direction="row" spacing={1}>
      <Button
        component={RouterLink}
        to={`/pong?inviteId=${invitation.inviteId}`}
        startIcon={<AppIcon name="play" />}
        variant="contained"
      >
        Ir para a partida
      </Button>
      <ActionButton
        onClick={() => session.cancelGameInvite(invitation.inviteId)}
      >
        Cancelar
      </ActionButton>
    </Stack>
  );
}

/** Page content (tabs, list, composer). */
function ChatContent(props: ChatContentProps) {
  const { session } = props;
  const isPrivate = session.activeTabId !== GLOBAL_CHAT_TAB_ID;
  return (
    <Stack spacing={1.5} sx={{ minHeight: 0, flex: 1 }}>
      <ChatTabBar session={session} />
      <ErrorText error={session.error} onDismiss={session.clearError} />
      <GameInvitationNotices session={session} />
      <PrivateChatActions session={session} friends={props.friends} />
      <PrivateMessageAccessNotice session={session} />
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

/** Global chat page and private conversations. */
export function ChatPage() {
  const { user } = useAuth();
  const { friends } = useFriends();
  return (
    <PageContainer fillHeight>
      <ChatContent
        session={useChatSession(user?.id)}
        selfAvatarUrl={user?.avatarUrl}
        friends={friends}
      />
    </PageContainer>
  );
}
