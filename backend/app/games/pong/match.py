import logging
import os
import threading
import time
import uuid
from collections.abc import Callable
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
MAX_STEP_SECONDS = 0.05
THREAD_JOIN_TIMEOUT = 1.0
DEFAULT_COUNTDOWN_SECONDS = 5.0
logger = logging.getLogger(__name__)

RematchOutcome = Literal["rejected", "pending", "countdown"]


def _countdown_seconds() -> float:
    try:
        return max(0.0, float(os.environ.get("PONG_COUNTDOWN_SECONDS", DEFAULT_COUNTDOWN_SECONDS)))
    except ValueError:
        return DEFAULT_COUNTDOWN_SECONDS


class PongMatch:
    def __init__(
        self,
        left_user_id: int,
        right_user_id: int,
        broadcast,
        countdown_seconds=None,
        on_match_finished: Callable[[str, int, int, int, int, int], None] | None = None,
    ):
        self.id = uuid.uuid4().hex
        self.game_id = uuid.uuid4().hex
        self.sides: dict[int, Side] = {left_user_id: "left", right_user_id: "right"}
        self.broadcast = broadcast
        self.on_match_finished = on_match_finished
        self.sim: SimState = create_initial_sim_state()
        self._countdown_seconds = (
            _countdown_seconds()
            if countdown_seconds is None
            else max(0.0, float(countdown_seconds))
        )
        self.starts_at_ms = 0.0
        self.phase = "countdown"
        self._phase_before_pause: str | None = None
        self._accepted_sides: set[Side] = set()
        self._lock = threading.Lock()
        self._destroyed = threading.Event()
        self._start_countdown()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def _start_countdown(self) -> None:
        self.starts_at_ms = now_ms() + self._countdown_seconds * 1000.0
        self.phase = "countdown" if self._countdown_seconds > 0 else "playing"
        self._accepted_sides.clear()

    def accepted_sides(self) -> dict[str, bool]:
        with self._lock:
            return {
                "left": "left" in self._accepted_sides,
                "right": "right" in self._accepted_sides,
            }
    
    def pause(self) -> None:
        with self._lock:
            if self.phase in ("playing", "countdown", "paused"):
                if self.phase != "paused":
                    self._phase_before_pause = self.phase
                    self.phase = "paused"
                    self._accepted_sides.clear()
    
    def accept_resume(self, user_id: int) -> str:
        side = self.sides.get(user_id)
        if side is None:
            return "rejected"

        with self._lock:
            if self.phase != "paused":
                return "rejected"

            self._accepted_sides.add(side)
            if len(self._accepted_sides) < 2:
                return "pending"

            self.phase = self._phase_before_pause or "playing"
            self._phase_before_pause = None
            self._accepted_sides.clear()
            return "resumed"

    def try_close(self) -> bool:
        with self._lock:
            if self.phase not in ("paused", "finished"):
                return False
            self.phase = "closed"
        self._destroyed.set()
        return True

    def force_close(self) -> None:
        with self._lock:
            if self.phase != "closed":
                self.phase = "closed"
        self._destroyed.set()

    def _run(self) -> None:
        last_frame_time = 0.0
        finished_emitted = False
        while not self._destroyed.is_set() and not finished_emitted:
            started = time.monotonic()
            delta_seconds, last_frame_time = compute_delta_seconds(last_frame_time)
            delta_seconds = min(delta_seconds, MAX_STEP_SECONDS)
            status = None
            snapshot = None
            finished_result = None

            with self._lock:
                if self.phase == "countdown" and now_ms() >= self.starts_at_ms:
                    self.phase = "playing"
                    status = {"state": "playing"}

                if self.phase == "playing":
                    step_simulation(self.sim, delta_seconds)
                    if is_match_finished(self.sim):
                        self.phase = "finished"

                if self.phase == "finished":
                    snapshot = to_snapshot(self.sim, now_ms())
                    winner_user_id = next(
                        user_id
                        for user_id, side in self.sides.items()
                        if side == self.sim.winner
                    )
                    left_user_id = next(
                        user_id
                        for user_id, side in self.sides.items()
                        if side == "left"
                    )
                    right_user_id = next(
                        user_id
                        for user_id, side in self.sides.items()
                        if side == "right"
                    )
                    finished_result = (
                        self.game_id,
                        left_user_id,
                        right_user_id,
                        winner_user_id,
                        self.sim.score_left,
                        self.sim.score_right,
                    )

                elif self.phase in ("playing",):
                    snapshot = to_snapshot(self.sim, now_ms())

            try:
                if status is not None:
                    self.broadcast(self.id, "game:status", status)
                if snapshot is not None:
                    self.broadcast(self.id, "game:snapshot", snapshot)
            except Exception:
                logger.exception("Não foi possível transmitir o quadro da partida.")
                self.force_close()
                return

            if finished_result is not None and self.on_match_finished is not None:
                try:
                    self.on_match_finished(*finished_result)
                except Exception:
                    logger.exception("Não foi possível salvar o resultado da partida.")
                finished_emitted = True
            elif finished_result is not None:
                finished_emitted = True

            if finished_emitted:
                return
            time.sleep(max(0.0, TICK_INTERVAL - (time.monotonic() - started)))

    def apply_input(self, user_id: int, position: float, timestamp_ms: float) -> bool:
        side = self.sides.get(user_id)
        if side is None:
            return False
        with self._lock:
            if self.phase != "playing":
                return False
            apply_paddle_input(self.sim, side, position, timestamp_ms)
        return True

    def accept_rematch(self, user_id: int) -> RematchOutcome:
        side = self.sides.get(user_id)
        if side is None:
            return "rejected"
        with self._lock:
            if self.phase != "finished":
                return "rejected"

            self._accepted_sides.add(side)
            if len(self._accepted_sides) < 2:
                return "pending"

            self._destroyed.set()
            self._thread.join(timeout=THREAD_JOIN_TIMEOUT)
            if self.phase != "finished":
                return "rejected"
            self.sim = create_initial_sim_state()
            self.game_id = uuid.uuid4().hex
            self._start_countdown()
        self._destroyed.clear()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()
        return "countdown"

    def destroy(self) -> None:
        self._destroyed.set()
        self._thread.join(timeout=THREAD_JOIN_TIMEOUT)
