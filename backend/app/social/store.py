from db import db_cursor


def blocked_user_ids(user_id: int) -> list[int]:
    with db_cursor() as cur:
        cur.execute(
            "SELECT blocked_id FROM blocked_users WHERE blocker_id = %s ORDER BY blocked_id;",
            (user_id,),
        )
        return [row[0] for row in cur.fetchall()]


def blocking_user_ids(user_id: int) -> list[int]:
    with db_cursor() as cur:
        cur.execute(
            "SELECT blocker_id FROM blocked_users WHERE blocked_id = %s ORDER BY blocker_id;",
            (user_id,),
        )
        return [row[0] for row in cur.fetchall()]


def is_blocked_between(first_user_id: int, second_user_id: int) -> bool:
    with db_cursor() as cur:
        cur.execute(
            "SELECT EXISTS (SELECT 1 FROM blocked_users "
            "WHERE (blocker_id = %s AND blocked_id = %s) "
            "OR (blocker_id = %s AND blocked_id = %s));",
            (first_user_id, second_user_id, second_user_id, first_user_id),
        )
        row = cur.fetchone()
        return bool(row and row[0])


def block_user(blocker_id: int, blocked_id: int) -> None:
    with db_cursor() as cur:
        cur.execute(
            "INSERT INTO blocked_users (blocker_id, blocked_id) VALUES (%s, %s) "
            "ON CONFLICT (blocker_id, blocked_id) DO NOTHING;",
            (blocker_id, blocked_id),
        )


def unblock_user(blocker_id: int, blocked_id: int) -> None:
    with db_cursor() as cur:
        cur.execute(
            "DELETE FROM blocked_users WHERE blocker_id = %s AND blocked_id = %s;",
            (blocker_id, blocked_id),
        )

def avatar_url(user_id: int, avatar_updated_at) -> str | None:
    if avatar_updated_at is None:
        return None
    version = int(avatar_updated_at.timestamp() * 1000)
    return f"/api/profile/avatar/{user_id}?v={version}"

def get_user_profile(user_id: int) -> tuple[str, object] | None:
    with db_cursor() as cur:
        cur.execute(
            "SELECT u.nickname, a.updated_at FROM users u "
            "LEFT JOIN avatars a ON a.user_id = u.id WHERE u.id = %s;",
            (user_id,),
        )
        return cur.fetchone()

def update_nickname(user_id: int, nickname: str) -> tuple[str, object]:
    with db_cursor() as cur:
        cur.execute(
            "UPDATE users SET nickname = %s WHERE id = %s RETURNING email;",
            (nickname, user_id),
        )
        row = cur.fetchone()
        if row is None:
            raise LookupError("usuário não existe")
        cur.execute(
            "SELECT updated_at FROM avatars WHERE user_id = %s;",
            (user_id,),
        )
        avatar_row = cur.fetchone()
        return row[0], None if avatar_row is None else avatar_row[0]

def update_email(user_id: int, email: str) -> tuple[str, str, object]:
    with db_cursor() as cur:
        cur.execute(
            "UPDATE users SET email = %s WHERE id = %s RETURNING nickname;",
            (email, user_id),
        )
        row = cur.fetchone()
        if row is None:
            raise LookupError("usuário não existe")
        cur.execute("SELECT updated_at FROM avatars WHERE user_id = %s;", (user_id,))
        avatar_row = cur.fetchone()
        return email, row[0], None if avatar_row is None else avatar_row[0]

def set_avatar(user_id: int, content_type: str, data: bytes) -> object:
    with db_cursor() as cur:
        cur.execute(
            "INSERT INTO avatars (user_id, content_type, data) VALUES (%s, %s, %s) "
            "ON CONFLICT (user_id) DO UPDATE SET "
            "content_type = EXCLUDED.content_type, data = EXCLUDED.data, "
            "updated_at = now() RETURNING updated_at;",
            (user_id, content_type, data),
        )
        row = cur.fetchone()
        if row is None:
            raise RuntimeError("O UPSERT não devolveu linha.")
        return row[0]

def delete_avatar(user_id: int) -> None:
    with db_cursor() as cur:
        cur.execute("DELETE FROM avatars WHERE user_id = %s;", (user_id,))

def get_avatar(user_id: int) -> tuple[str, bytes, object] | None:
    with db_cursor() as cur:
        cur.execute(
            "SELECT content_type, data, updated_at FROM avatars WHERE user_id = %s;",
            (user_id,),
        )
        return cur.fetchone()

def find_user_by_nickname(nickname: str) -> tuple[int, str, object] | None:
    with db_cursor() as cur:
        cur.execute(
            "SELECT u.id, u.nickname, a.updated_at FROM users u "
            "LEFT JOIN avatars a ON a.user_id = u.id WHERE u.nickname = %s;",
            (nickname,),
        )
        return cur.fetchone()

def get_friend_edge(me_id: int, other_id: int) -> tuple[int, str] | None:
    with db_cursor() as cur:
        cur.execute(
            "SELECT requester_id, status FROM friendships "
            "WHERE (requester_id = %s AND addressee_id = %s) "
            "OR (requester_id = %s AND addressee_id = %s);",
            (me_id, other_id, other_id, me_id),
        )
        return cur.fetchone()

def insert_friend_edge(requester_id: int, addressee_id: int) -> None:
    with db_cursor() as cur:
        cur.execute(
            "INSERT INTO friendships (requester_id, addressee_id) VALUES (%s, %s);",
            (requester_id, addressee_id),
        )

def accept_edge(from_id: int, to_id: int) -> bool:
    with db_cursor() as cur:
        cur.execute(
            "UPDATE friendships SET status = 'accepted' "
            "WHERE requester_id = %s AND addressee_id = %s AND status = 'pending';",
            (from_id, to_id),
        )
        return cur.rowcount == 1

def reject_edge(from_id: int, to_id: int) -> bool:
    with db_cursor() as cur:
        cur.execute(
            "DELETE FROM friendships "
            "WHERE requester_id = %s AND addressee_id = %s AND status = 'pending';",
            (from_id, to_id),
        )
        return cur.rowcount == 1

def delete_edges(a: int, b: int) -> None:
    with db_cursor() as cur:
        cur.execute(
            "DELETE FROM friendships "
            "WHERE (requester_id = %s AND addressee_id = %s) "
            "OR (requester_id = %s AND addressee_id = %s);",
            (a, b, b, a),
        )

def friend_rows(me_id: int) -> list[tuple[int, str, int, str, object]]:
    with db_cursor() as cur:
        cur.execute(
            "SELECT u.id, f.status, f.requester_id, u.nickname, a.updated_at "
            "FROM friendships f "
            "JOIN users u ON u.id = CASE WHEN f.requester_id = %s "
            "THEN f.addressee_id ELSE f.requester_id END "
            "LEFT JOIN avatars a ON a.user_id = u.id "
            "WHERE f.requester_id = %s OR f.addressee_id = %s ORDER BY f.id;",
            (me_id, me_id, me_id),
        )
        return cur.fetchall()

def insert_message(sender_id: int, recipient_id: int | None, text: str) -> dict:
    with db_cursor() as cur:
        cur.execute(
            "INSERT INTO chat_messages (sender_id, recipient_id, text) "
            "VALUES (%s, %s, %s) RETURNING id, created_at;",
            (sender_id, recipient_id, text),
        )
        row = cur.fetchone()
        if row is None:
            raise RuntimeError("O INSERT não devolveu linha.")
        new_id, created_at = row
        cur.execute(
            "SELECT u.nickname, a.updated_at FROM users u "
            "LEFT JOIN avatars a ON a.user_id = u.id WHERE u.id = %s;",
            (sender_id,),
        )
        author = cur.fetchone()
        if author is None:
            raise RuntimeError("Quem enviou a mensagem não existe mais.")
        return {
            "id": str(new_id),
            "userId": sender_id,
            "nickname": author[0],
            "avatarUrl": avatar_url(sender_id, author[1]),
            "text": text,
            "createdAt": int(created_at.timestamp() * 1000),
        }

def global_rows() -> list[dict]:
    with db_cursor() as cur:
        cur.execute(
            "SELECT m.id, m.sender_id, m.text, m.created_at, u.nickname, a.updated_at "
            "FROM chat_messages m "
            "JOIN users u ON u.id = m.sender_id "
            "LEFT JOIN avatars a ON a.user_id = m.sender_id "
            "WHERE m.recipient_id IS NULL ORDER BY m.id;",
        )
        return [
            {
                "id": str(row[0]),
                "userId": row[1],
                "nickname": row[4],
                "avatarUrl": avatar_url(row[1], row[5]),
                "text": row[2],
                "createdAt": int(row[3].timestamp() * 1000),
            }
            for row in cur.fetchall()
        ]

def private_rows(me_id: int) -> list[dict]:
    with db_cursor() as cur:
        cur.execute(
            "SELECT m.id, m.sender_id, m.recipient_id, m.text, m.created_at, "
            "s.nickname, s_avatar.updated_at, r.nickname "
            "FROM chat_messages m "
            "JOIN users s ON s.id = m.sender_id "
            "LEFT JOIN avatars s_avatar ON s_avatar.user_id = m.sender_id "
            "JOIN users r ON r.id = m.recipient_id "
            "WHERE m.sender_id = %s OR m.recipient_id = %s ORDER BY m.id;",
            (me_id, me_id),
        )
        rows = cur.fetchall()
        messages = []
        for (message_id, sender_id, recipient_id, text, created_at,
             sender_nickname, sender_avatar_ts, _r_nickname) in rows:
            own = sender_id == me_id
            messages.append({
                "id": str(message_id),
                "senderId": sender_id,
                "recipientId": recipient_id,
                "peerId": recipient_id if own else sender_id,
                "peerNickname": sender_nickname if own else _r_nickname,
                "userId": sender_id,
                "nickname": sender_nickname,
                "avatarUrl": avatar_url(sender_id, sender_avatar_ts),
                "text": text,
                "createdAt": int(created_at.timestamp() * 1000),
            })
        return messages
