import os
import threading
import time
import uuid
from typing import Literal

from .constants import Side
from .paddles import apply_paddle_input
from .shared import compute_delta_seconds, now_ms
from .state import (
    SimState,
    create_initial_sim_state,
    is_match_finished,
    to_snapshot,
)
from .step import step_simulation

TICK_HZ = 30
TICK_INTERVAL = 1.0 / TICK_HZ
THREAD_JOIN_TIMEOUT = 1.0
DEFAULT_COUNTDOWN_SECONDS = 5.0

RematchOutcome = Literal["rejected", "pending", "countdown"]


def _countdown_seconds() -> float:
    try:
        return max(0.0, float(os.environ.get("PONG_COUNTDOWN_SECONDS", DEFAULT_COUNTDOWN_SECONDS)))
    except ValueError:
        return DEFAULT_COUNTDOWN_SECONDS


class PongMatch:
    def __init__(self, left_sid: str, right_sid: str, broadcast, countdown_seconds=None):
        self.id = uuid.uuid4().hex
        self.sides: dict[str, Side] = {left_sid: "left", right_sid: "right"}
        self.broadcast = broadcast
        self.sim: SimState = create_initial_sim_state()
        self._countdown_seconds = (
            _countdown_seconds()
            if countdown_seconds is None
            else max(0.0, float(countdown_seconds))
        )
        self.starts_at_ms = 0.0
        self.phase = "countdown"
        self._accepted_rematch_sids: set[str] = set()
        self._lock = threading.Lock()
        self._destroyed = threading.Event()
        self._start_countdown()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def _start_countdown(self) -> None:
        self.starts_at_ms = now_ms() + self._countdown_seconds * 1000.0
        self.phase = "countdown" if self._countdown_seconds > 0 else "playing"
        self._accepted_rematch_sids.clear()

    def rematch_accepted(self) -> dict[str, bool]:
        with self._lock:
            sides = {self.sides[sid] for sid in self._accepted_rematch_sids}
            return {"left": "left" in sides, "right": "right" in sides}

    def _run(self) -> None:
        last_frame_time = 0.0
        while not self._destroyed.is_set():
            started = time.monotonic()
            delta_seconds, last_frame_time = compute_delta_seconds(last_frame_time)
            status = None
            snapshot = None

            with self._lock:
                if self.phase == "countdown" and now_ms() >= self.starts_at_ms:
                    self.phase = "playing"
                    status = {"state": "playing"}

                if self.phase == "playing":
                    step_simulation(self.sim, delta_seconds)
                    if is_match_finished(self.sim):
                        self.phase = "finished"

                if self.phase in ("playing", "finished"):
                    snapshot = to_snapshot(self.sim, now_ms())

            if status is not None:
                self.broadcast(self.id, "game:status", status)
            if snapshot is not None:
                self.broadcast(self.id, "game:snapshot", snapshot)

            time.sleep(max(0.0, TICK_INTERVAL - (time.monotonic() - started)))

    def apply_input(self, sid: str, offset: float, timestamp_ms: float) -> bool:
        side = self.sides.get(sid)
        if side is None:
            return False
        with self._lock:
            if self.phase != "playing":
                return False
            apply_paddle_input(self.sim, side, offset, timestamp_ms)
        return True

    def accept_rematch(self, sid: str) -> RematchOutcome:
        if sid not in self.sides:
            return "rejected"
        with self._lock:
            if self.phase != "finished":
                return "rejected"

            self._accepted_rematch_sids.add(sid)
            if len(self._accepted_rematch_sids) < 2:
                return "pending"

            self.sim = create_initial_sim_state()
            self._start_countdown()
            return "countdown"

    def destroy(self) -> None:
        self._destroyed.set()
        self._thread.join(timeout=THREAD_JOIN_TIMEOUT)
