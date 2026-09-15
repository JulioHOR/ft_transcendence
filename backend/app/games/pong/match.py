
import threading
import time
import uuid

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

class PongMatch:

    def __init__(self, left_sid: str, right_sid: str, broadcast):
        self.id = uuid.uuid4().hex
        self.sides: dict[str, Side] = {left_sid: "left", right_sid: "right"}
        self.broadcast = broadcast
        self.sim: SimState = create_initial_sim_state()
        self.phase: str = "playing"
        self._lock = threading.Lock()
        self._destroyed = threading.Event()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def _run(self) -> None:
        last_frame_time = 0.0
        while not self._destroyed.is_set():
            start = time.monotonic()
            delta_seconds, last_frame_time = compute_delta_seconds(last_frame_time)

            with self._lock:
                if self.phase == "playing":
                    step_simulation(self.sim, delta_seconds)
                    if is_match_finished(self.sim):
                        self.phase = "finished"
                snapshot = to_snapshot(self.sim, now_ms())

            self.broadcast(self.id, "game:snapshot", snapshot)

            elapsed = time.monotonic() - start
            time.sleep(max(0.0, TICK_INTERVAL - elapsed))

    def apply_input(self, sid: str, offset: float, timestamp_ms: float) -> bool:
        side = self.sides.get(sid)
        if side is None:
            return False
        with self._lock:
            if self.phase == "finished":
                return False
            apply_paddle_input(self.sim, side, offset, timestamp_ms)
        return True

    def restart(self) -> bool:
        with self._lock:
            if self.phase != "finished":
                return False
            self.sim = create_initial_sim_state()
            self.phase = "playing"
        return True

    def destroy(self) -> None:
        self._destroyed.set()
        self._thread.join(timeout=THREAD_JOIN_TIMEOUT)
