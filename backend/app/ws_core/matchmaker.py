import threading
from collections import deque
from collections.abc import Callable
from typing import Protocol

class Match(Protocol):
    id: str
    sides: dict[str, str]
    starts_at_ms: float
    phase: str

    def apply_input(self, sid: str, offset: float, timestamp_ms: float) -> bool: ...
    def destroy(self) -> None: ...
    def accept_rematch(self, sid: str) -> str: ...
    def rematch_accepted(self) -> dict[str, bool]: ...

class AlreadyPlayingError(Exception):
    pass

class Matchmaker:
    def __init__(self, match_factory: Callable[[str, str], Match]) -> None:
        self._lock = threading.Lock()
        self._queue: deque = deque()
        self._match_factory = match_factory
        self._match_by_sid: dict = {}
        self._side_by_sid: dict = {}

    def join(self, sid: str) -> Match | None:
        with self._lock:
            if sid in self._match_by_sid or sid in self._queue:
                raise AlreadyPlayingError(sid)

            self._queue.append(sid)
            if len(self._queue) < 2:
                return None

            left_sid = self._queue.popleft()
            right_sid = self._queue.popleft()
            try:
                match = self._match_factory(left_sid, right_sid)
            except Exception:
                self._queue.appendleft(right_sid)
                self._queue.appendleft(left_sid)
                raise
            self._match_by_sid[left_sid] = match
            self._match_by_sid[right_sid] = match
            self._side_by_sid[left_sid] = "left"
            self._side_by_sid[right_sid] = "right"
            return match

    def leave(self, sid: str) -> None:
        with self._lock:
            try:
                self._queue.remove(sid)
            except ValueError:
                pass
            self._match_by_sid.pop(sid, None)
            self._side_by_sid.pop(sid, None)

    def get_match(self, sid: str) -> Match | None:
        return self._match_by_sid.get(sid)

    def get_side(self, sid: str) -> str | None:
        return self._side_by_sid.get(sid)

    def in_queue(self, sid: str) -> bool:
        with self._lock:
            return sid in self._queue
