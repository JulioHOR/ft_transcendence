import threading
import uuid
from collections import deque
from collections.abc import Callable
from dataclasses import dataclass
from typing import Protocol

class Match(Protocol):
    id: str
    starts_at_ms: float
    phase: str

    sides: dict[int, str]

    def apply_input(self, user_id: int, position: float, timestamp_ms: float) -> bool: ...
    def destroy(self) -> None: ...
    def accept_rematch(self, user_id: int) -> str: ...
    def accept_resume(self, user_id: int) -> str: ...
    def accepted_sides(self) -> dict[str, bool]: ...

class AlreadyPlayingError(Exception):
    pass


class InvalidGameInvitationError(Exception):
    pass


@dataclass
class GameInvitation:
    sender_user_id: int
    recipient_user_id: int
    accepted: bool = False

class Matchmaker:
    def __init__(self, match_factory: Callable[[int, int], Match]) -> None:
        self._lock = threading.Lock()
        self._queue: deque[int] = deque()
        self._match_factory = match_factory
        self._user_id_by_sid: dict[str, int] = {}
        self._sid_by_user_id: dict[int, str] = {}
        self._match_by_user_id: dict[int, Match] = {}
        self._game_invitations: dict[str, GameInvitation] = {}
        self._invited_users: dict[str, set[int]] = {}

    def create_game_invitation(
        self, sender_user_id: int, recipient_user_id: int
    ) -> str | None:
        with self._lock:
            participants = {sender_user_id, recipient_user_id}
            if (
                len(participants) != 2
                or participants.intersection(self._queue)
                or participants.intersection(self._match_by_user_id)
                or any(
                    {invitation.sender_user_id, invitation.recipient_user_id}
                    == participants
                    for invitation in self._game_invitations.values()
                )
            ):
                return None
            invitation_id = uuid.uuid4().hex
            self._game_invitations[invitation_id] = GameInvitation(
                sender_user_id, recipient_user_id
            )
            self._invited_users[invitation_id] = set()
            return invitation_id

    def respond_game_invitation(
        self, invitation_id: str, user_id: int, accepted: bool
    ) -> dict | None:
        with self._lock:
            invitation = self._game_invitations.get(invitation_id)
            if invitation is None or invitation.recipient_user_id != user_id:
                return None
            if invitation.accepted:
                return None
            if accepted:
                participants = (invitation.sender_user_id, invitation.recipient_user_id)
                if any(
                    participant in self._queue
                    or participant in self._match_by_user_id
                    for participant in participants
                ) or any(
                    other_id != invitation_id
                    and other.accepted
                    and set(participants).intersection(
                        (other.sender_user_id, other.recipient_user_id)
                    )
                    for other_id, other in self._game_invitations.items()
                ):
                    return None
                invitation.accepted = True
            else:
                self._game_invitations.pop(invitation_id, None)
                self._invited_users.pop(invitation_id, None)
            return {
                "inviteId": invitation_id,
                "senderId": invitation.sender_user_id,
                "recipientId": invitation.recipient_user_id,
            }

    def cancel_game_invitation(self, invitation_id: str, user_id: int) -> dict | None:
        with self._lock:
            invitation = self._game_invitations.get(invitation_id)
            if invitation is None or user_id not in (
                invitation.sender_user_id,
                invitation.recipient_user_id,
            ):
                return None
            waiting_users = self._invited_users.pop(invitation_id, set())
            socket_ids = []
            for waiting_user_id in waiting_users:
                sid = self._sid_by_user_id.pop(waiting_user_id, None)
                if sid is not None:
                    self._user_id_by_sid.pop(sid, None)
                    socket_ids.append(sid)
            self._game_invitations.pop(invitation_id, None)
            return {
                "inviteId": invitation_id,
                "senderId": invitation.sender_user_id,
                "recipientId": invitation.recipient_user_id,
                "socketIds": socket_ids,
            }

    def game_invitations_for_user(self, user_id: int) -> list[dict]:
        with self._lock:
            return [
                {
                    "inviteId": invitation_id,
                    "senderId": invitation.sender_user_id,
                    "recipientId": invitation.recipient_user_id,
                    "status": "accepted" if invitation.accepted else "pending",
                }
                for invitation_id, invitation in self._game_invitations.items()
                if user_id
                in (invitation.sender_user_id, invitation.recipient_user_id)
            ]

    def game_invitation(self, invitation_id: str) -> dict | None:
        with self._lock:
            invitation = self._game_invitations.get(invitation_id)
            if invitation is None:
                return None
            return {
                "inviteId": invitation_id,
                "senderId": invitation.sender_user_id,
                "recipientId": invitation.recipient_user_id,
                "accepted": invitation.accepted,
            }

    def accepted_game_invitation_for_user(self, user_id: int) -> str | None:
        with self._lock:
            return next(
                (
                    invitation_id
                    for invitation_id, invitation in self._game_invitations.items()
                    if invitation.accepted
                    and user_id
                    in (invitation.sender_user_id, invitation.recipient_user_id)
                ),
                None,
            )

    def join_invitation(
        self, sid: str, user_id: int, invitation_id: str
    ) -> Match | None:
        with self._lock:
            invitation = self._game_invitations.get(invitation_id)
            if invitation is None or not invitation.accepted:
                raise InvalidGameInvitationError(invitation_id)
            participants = {
                invitation.sender_user_id,
                invitation.recipient_user_id,
            }
            if user_id not in participants:
                raise InvalidGameInvitationError(invitation_id)
            if (
                user_id in self._sid_by_user_id
                or user_id in self._queue
                or user_id in self._match_by_user_id
            ):
                raise AlreadyPlayingError(user_id)

            self._user_id_by_sid[sid] = user_id
            self._sid_by_user_id[user_id] = sid
            waiting_users = self._invited_users[invitation_id]
            waiting_users.add(user_id)
            if waiting_users != participants:
                return None

            try:
                match = self._match_factory(
                    invitation.sender_user_id, invitation.recipient_user_id
                )
            except Exception:
                waiting_users.discard(user_id)
                self._user_id_by_sid.pop(sid, None)
                self._sid_by_user_id.pop(user_id, None)
                raise

            for participant_id in participants:
                self._match_by_user_id[participant_id] = match
            self._game_invitations.pop(invitation_id, None)
            self._invited_users.pop(invitation_id, None)
            return match

    def join(self, sid: str, user_id: int) -> Match | None:
        with self._lock:
            if (
                user_id in self._sid_by_user_id
                or user_id in self._queue
            ):
                raise AlreadyPlayingError(sid)

            self._queue.append(user_id)
            self._user_id_by_sid[sid] = user_id
            self._sid_by_user_id[user_id] = sid
            if len(self._queue) < 2:
                return None

            left_user_id = self._queue.popleft()
            right_user_id = self._queue.popleft()
            try:
                match = self._match_factory(left_user_id, right_user_id)
            except Exception:
                self._queue.appendleft(right_user_id)
                self._queue.appendleft(left_user_id)
                raise
            self._match_by_user_id[left_user_id] = match
            self._match_by_user_id[right_user_id] = match
            return match

    def leave(self, sid: str) -> None:
        with self._lock:
            user_id = self._user_id_by_sid.pop(sid, None)
            if user_id is not None:
                self._sid_by_user_id.pop(user_id, None)
                self._match_by_user_id.pop(user_id, None)
                for waiting_users in self._invited_users.values():
                    waiting_users.discard(user_id)
                try:
                    self._queue.remove(user_id)
                except ValueError:
                    pass

    def get_match(self, sid: str) -> Match | None:
        user_id = self._user_id_by_sid.get(sid)
        return self._match_by_user_id.get(user_id) if user_id is not None else None

    def get_match_for_user(self, user_id: int) -> Match | None:
        return self._match_by_user_id.get(user_id)

    def get_user_id_for_sid(self, sid: str) -> int | None:
        return self._user_id_by_sid.get(sid)

    def players(self, match: Match) -> list[tuple[int, str, str]]:
        with self._lock:
            return [
                (user_id, self._sid_by_user_id[user_id], side)
                for user_id, side in match.sides.items()
                if user_id in self._sid_by_user_id
            ]
    
    def reconnect_user(self, user_id: int, new_sid: str) -> Match | None:
        with self._lock:
            match = self._match_by_user_id.get(user_id)
            old_sid = self._sid_by_user_id.get(user_id)
            if match is None or old_sid is None or match.phase not in ("paused", "finished"):
                return None

            if user_id not in match.sides:
                return None

            self._user_id_by_sid.pop(old_sid, None)
            self._user_id_by_sid[new_sid] = user_id
            self._sid_by_user_id[user_id] = new_sid
            return match

    def get_side(self, sid: str) -> str | None:
        user_id = self._user_id_by_sid.get(sid)
        match = self._match_by_user_id.get(user_id) if user_id is not None else None
        return match.sides.get(user_id) if match is not None else None

    def in_queue(self, sid: str) -> bool:
        with self._lock:
            user_id = self._user_id_by_sid.get(sid)
            return user_id in self._queue if user_id is not None else False
