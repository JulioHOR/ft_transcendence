import threading
from collections import deque
from collections.abc import Callable
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

class Matchmaker:
    def __init__(self, match_factory: Callable[[int, int], Match]) -> None:
        self._lock = threading.Lock()
        self._queue: deque[int] = deque()
        self._match_factory = match_factory
        self._user_id_by_sid: dict[str, int] = {}
        self._sid_by_user_id: dict[int, str] = {}
        self._match_by_user_id: dict[int, Match] = {}

    def join(self, sid: str, user_id: int) -> Match | None:
        with self._lock:
            if user_id in self._sid_by_user_id or user_id in self._queue:
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
