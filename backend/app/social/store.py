import datetime
from typing import NamedTuple

from db import db_cursor


class ProfileRow(NamedTuple):
    nickname: str
    avatar_updated_at: datetime.datetime | None


class FriendRow(NamedTuple):
    user_id: int
    status: str
    requester_id: int
    nickname: str
    avatar_updated_at: datetime.datetime | None


_PROFILE_FIELDS = (
    "SELECT account.nickname, avatar.updated_at "
    "FROM account "
    "LEFT JOIN avatar ON avatar.user_id = account.id "
)


BLOCKED_USER_LIMIT = 1000


def _fetch_profile_by_id(cur, user_id: int) -> ProfileRow | None:
    cur.execute(
        _PROFILE_FIELDS + "WHERE account.id = %s;",
        (user_id,),
    )
    row = cur.fetchone()
    return None if row is None else ProfileRow(row[0], row[1])


def blocked_user_ids(user_id: int) -> list[int]:
    with db_cursor() as cur:
        cur.execute(
            "SELECT blocked_user.blocked_id "
            "FROM blocked_user "
            "WHERE blocked_user.blocker_id = %s "
            "ORDER BY blocked_user.blocked_id "
            "LIMIT %s;",
            (user_id, BLOCKED_USER_LIMIT),
        )
        return [row[0] for row in cur.fetchall()]


def blocking_user_ids(user_id: int) -> list[int]:
    with db_cursor() as cur:
        cur.execute(
            "SELECT blocked_user.blocker_id "
            "FROM blocked_user "
            "WHERE blocked_user.blocked_id = %s "
            "ORDER BY blocked_user.blocker_id "
            "LIMIT %s;",
            (user_id, BLOCKED_USER_LIMIT),
        )
        return [row[0] for row in cur.fetchall()]


def _parse_message_id(message_id: str) -> int | None:
    try:
        return int(message_id)
    except ValueError:
        return None


def is_blocked_between(first_user_id: int, second_user_id: int) -> bool:
    with db_cursor() as cur:
        cur.execute(
            "SELECT EXISTS ("
            "    SELECT 1 "
            "    FROM blocked_user "
            "    WHERE (blocked_user.blocker_id = %s AND blocked_user.blocked_id = %s) "
            "       OR (blocked_user.blocker_id = %s AND blocked_user.blocked_id = %s)"
            ");",
            (first_user_id, second_user_id, second_user_id, first_user_id),
        )
        row = cur.fetchone()
        return bool(row and row[0])


def block_user(blocker_id: int, blocked_id: int) -> None:
    with db_cursor() as cur:
        cur.execute(
            "INSERT INTO blocked_user (blocker_id, blocked_id) "
            "VALUES (%s, %s) "
            "ON CONFLICT (blocker_id, blocked_id) DO NOTHING;",
            (blocker_id, blocked_id),
        )


def message_in_conversation(sender_id: int, recipient_id: int, message_id: str) -> bool:
    numeric_id = _parse_message_id(message_id)
    if numeric_id is None:
        return False
    with db_cursor() as cur:
        cur.execute(
            "SELECT 1 "
            "FROM chat_message "
            "WHERE chat_message.id = %s "
            "  AND chat_message.sender_id = %s "
            "  AND chat_message.recipient_id = %s "
            "LIMIT 1;",
            (numeric_id, sender_id, recipient_id),
        )
        return cur.fetchone() is not None


def unblock_user(blocker_id: int, blocked_id: int) -> None:
    with db_cursor() as cur:
        cur.execute(
            "DELETE FROM blocked_user "
            "WHERE blocked_user.blocker_id = %s AND blocked_user.blocked_id = %s;",
            (blocker_id, blocked_id),
        )

def avatar_url(user_id: int, avatar_updated_at: datetime.datetime | None) -> str | None:
    if avatar_updated_at is None:
        return None
    version = int(avatar_updated_at.timestamp() * 1000)
    return f"/api/profile/avatar/{user_id}?v={version}"

def get_user_profile(user_id: int) -> ProfileRow | None:
    with db_cursor() as cur:
        return _fetch_profile_by_id(cur, user_id)

def update_profile(
    user_id: int, email: str, nickname: str
) -> tuple[str, str, datetime.datetime | None]:
    with db_cursor() as cur:
        cur.execute(
            "UPDATE account "
            "SET email = %s, nickname = %s "
            "WHERE account.id = %s "
            "RETURNING account.email, account.nickname;",
            (email, nickname, user_id),
        )
        row = cur.fetchone()
        if row is None:
            raise LookupError("usuário não existe")
        cur.execute(
            "SELECT avatar.updated_at "
            "FROM avatar "
            "WHERE avatar.user_id = %s "
            "LIMIT 1;",
            (user_id,),
        )
        avatar_row = cur.fetchone()
        return (*row, None if avatar_row is None else avatar_row[0])


def set_avatar(user_id: int, content_type: str, data: bytes) -> datetime.datetime:
    with db_cursor() as cur:
        cur.execute(
            "INSERT INTO avatar (user_id, content_type, data) "
            "VALUES (%s, %s, %s) "
            "ON CONFLICT (user_id) DO UPDATE SET "
            "    content_type = EXCLUDED.content_type, "
            "    data = EXCLUDED.data, "
            "    updated_at = now() "
            "RETURNING avatar.updated_at;",
            (user_id, content_type, data),
        )
        row = cur.fetchone()
        if row is None:
            raise RuntimeError("O UPSERT não devolveu linha.")
        return row[0]


def delete_avatar(user_id: int) -> None:
    with db_cursor() as cur:
        cur.execute("DELETE FROM avatar WHERE avatar.user_id = %s;", (user_id,))


def get_avatar(
    user_id: int,
) -> tuple[str, bytes, datetime.datetime] | None:
    with db_cursor() as cur:
        cur.execute(
            "SELECT avatar.content_type, avatar.data, avatar.updated_at "
            "FROM avatar "
            "WHERE avatar.user_id = %s "
            "LIMIT 1;",
            (user_id,),
        )
        return cur.fetchone()


def find_user_by_nickname(
    nickname: str,
) -> tuple[int, str, datetime.datetime | None] | None:
    with db_cursor() as cur:
        cur.execute(
            "SELECT account.id, account.nickname, avatar.updated_at "
            "FROM account "
            "LEFT JOIN avatar ON avatar.user_id = account.id "
            "WHERE account.nickname = %s "
            "LIMIT 1;",
            (nickname,),
        )
        return cur.fetchone()


def get_friend_edge(me_id: int, other_id: int) -> tuple[int, str] | None:
    with db_cursor() as cur:
        cur.execute(
            "SELECT friendship.requester_id, friendship.status "
            "FROM friendship "
            "WHERE (friendship.requester_id = %s AND friendship.addressee_id = %s) "
            "   OR (friendship.requester_id = %s AND friendship.addressee_id = %s) "
            "LIMIT 1;",
            (me_id, other_id, other_id, me_id),
        )
        return cur.fetchone()


def insert_friend_edge(requester_id: int, addressee_id: int) -> None:
    with db_cursor() as cur:
        cur.execute(
            "INSERT INTO friendship (requester_id, addressee_id) "
            "VALUES (%s, %s);",
            (requester_id, addressee_id),
        )


def accept_edge(from_id: int, to_id: int) -> bool:
    with db_cursor() as cur:
        cur.execute(
            "UPDATE friendship "
            "SET status = 'accepted' "
            "WHERE friendship.requester_id = %s "
            "  AND friendship.addressee_id = %s "
            "  AND friendship.status = 'pending';",
            (from_id, to_id),
        )
        return cur.rowcount == 1


def reject_edge(from_id: int, to_id: int) -> bool:
    with db_cursor() as cur:
        cur.execute(
            "DELETE FROM friendship "
            "WHERE friendship.requester_id = %s "
            "  AND friendship.addressee_id = %s "
            "  AND friendship.status = 'pending';",
            (from_id, to_id),
        )
        return cur.rowcount == 1


def delete_edges(first_user_id: int, second_user_id: int) -> None:
    with db_cursor() as cur:
        cur.execute(
            "DELETE FROM friendship "
            "WHERE (friendship.requester_id = %s AND friendship.addressee_id = %s) "
            "   OR (friendship.requester_id = %s AND friendship.addressee_id = %s);",
            (first_user_id, second_user_id, second_user_id, first_user_id),
        )


FRIEND_LIMIT = 1000


def friend_rows(me_id: int) -> list[FriendRow]:
    with db_cursor() as cur:
        cur.execute(
            "SELECT "
            "    account.id, "
            "    friendship.status, "
            "    friendship.requester_id, "
            "    account.nickname, "
            "    avatar.updated_at "
            "FROM friendship "
            "JOIN account ON account.id = CASE "
            "    WHEN friendship.requester_id = %s THEN friendship.addressee_id "
            "    ELSE friendship.requester_id "
            "END "
            "LEFT JOIN avatar ON avatar.user_id = account.id "
            "WHERE friendship.requester_id = %s OR friendship.addressee_id = %s "
            "ORDER BY friendship.id "
            "LIMIT %s;",
            (me_id, me_id, me_id, FRIEND_LIMIT),
        )
        return [FriendRow(*row) for row in cur.fetchall()]

def _public_chat_message(
    message_id: int,
    sender_id: int,
    nickname: str,
    avatar_ts: datetime.datetime | None,
    text: str,
    created_at: datetime.datetime,
) -> dict:
    return {
        "id": str(message_id),
        "userId": sender_id,
        "nickname": nickname,
        "avatarUrl": avatar_url(sender_id, avatar_ts),
        "text": text,
        "createdAt": int(created_at.timestamp() * 1000),
    }

def insert_message(sender_id: int, recipient_id: int | None, text: str) -> dict:
    with db_cursor() as cur:
        cur.execute(
            "INSERT INTO chat_message (sender_id, recipient_id, text) "
            "VALUES (%s, %s, %s) "
            "RETURNING chat_message.id, chat_message.created_at;",
            (sender_id, recipient_id, text),
        )
        row = cur.fetchone()
        if row is None:
            raise RuntimeError("O INSERT não devolveu linha.")
        new_id, created_at = row
        author = _fetch_profile_by_id(cur, sender_id)
        if author is None:
            raise RuntimeError("Quem enviou a mensagem não existe mais.")
        return _public_chat_message(
            new_id, sender_id, author.nickname, author.avatar_updated_at, text, created_at
        )

GLOBAL_CHAT_LIMIT = 200
PRIVATE_CHAT_LIMIT = 200


def global_rows() -> list[dict]:
    with db_cursor() as cur:
        cur.execute(
            "SELECT "
            "    chat_message.id, "
            "    chat_message.sender_id, "
            "    chat_message.text, "
            "    chat_message.created_at, "
            "    account.nickname, "
            "    avatar.updated_at "
            "FROM chat_message "
            "JOIN account ON account.id = chat_message.sender_id "
            "LEFT JOIN avatar ON avatar.user_id = chat_message.sender_id "
            "WHERE chat_message.recipient_id IS NULL "
            "ORDER BY chat_message.id DESC "
            "LIMIT %s;",
            (GLOBAL_CHAT_LIMIT,),
        )
        fetched = cur.fetchall()
        fetched.reverse()
        return [
            _public_chat_message(row[0], row[1], row[4], row[5], row[2], row[3])
            for row in fetched
        ]


def private_rows(me_id: int) -> list[dict]:
    with db_cursor() as cur:
        cur.execute(
            "SELECT "
            "    CASE "
            "        WHEN chat_message.sender_id = %s THEN chat_message.recipient_id "
            "        ELSE chat_message.sender_id "
            "    END AS peer_id, "
            "    MAX(chat_message.id) AS last_id "
            "FROM chat_message "
            "WHERE chat_message.recipient_id IS NOT NULL "
            "  AND (chat_message.sender_id = %s OR chat_message.recipient_id = %s) "
            "GROUP BY peer_id "
            "ORDER BY last_id DESC "
            "LIMIT %s;",
            (me_id, me_id, me_id, PRIVATE_CHAT_LIMIT),
        )
        peer_ids = [row[0] for row in cur.fetchall()]
        messages = []
        for peer_id in peer_ids:
            messages.extend(_private_rows_for_pair(cur, me_id, peer_id))
        return messages


_PRIVATE_HISTORY_SELECT = (
    "SELECT "
    "    chat_message.id, "
    "    chat_message.sender_id, "
    "    chat_message.recipient_id, "
    "    chat_message.text, "
    "    chat_message.created_at, "
    "    sender.nickname, "
    "    sender_avatar.updated_at, "
    "    recipient.nickname "
    "FROM chat_message "
    "JOIN account AS sender ON sender.id = chat_message.sender_id "
    "LEFT JOIN avatar AS sender_avatar "
    "    ON sender_avatar.user_id = chat_message.sender_id "
    "JOIN account AS recipient ON recipient.id = chat_message.recipient_id "
)


def _private_rows_for_pair(cur, me_id: int, peer_id: int) -> list[dict]:
    cur.execute(
        _PRIVATE_HISTORY_SELECT
        + "WHERE (chat_message.sender_id = %s AND chat_message.recipient_id = %s) "
        "   OR (chat_message.sender_id = %s AND chat_message.recipient_id = %s) "
        "ORDER BY chat_message.id DESC "
        "LIMIT %s;",
        (me_id, peer_id, peer_id, me_id, PRIVATE_CHAT_LIMIT),
    )
    rows = cur.fetchall()
    rows.reverse()
    messages = []
    for (message_id, sender_id, recipient_id, text, created_at,
         sender_nickname, sender_avatar_ts, recipient_nickname) in rows:
        is_own_message = sender_id == me_id
        message = _public_chat_message(
            message_id, sender_id, sender_nickname, sender_avatar_ts, text, created_at
        )
        message.update(
            {
                "senderId": sender_id,
                "recipientId": recipient_id,
                "peerId": recipient_id if is_own_message else sender_id,
                "peerNickname": sender_nickname if is_own_message else recipient_nickname,
            }
        )
        messages.append(message)
    return messages
