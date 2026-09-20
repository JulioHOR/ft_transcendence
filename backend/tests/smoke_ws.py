
import os
import sys
import threading
import time

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app"))

import socket

import socketio as si_client

PORT = int(os.environ.get("SMOKE_PORT", "5177"))
URL = f"http://127.0.0.1:{PORT}"
SNAPSHOT_WINDOW_S = 1.0
WINNER_TIMEOUT_S = 90.0

_EVENT_ATTR = {
    "game:snapshot": "snapshots",
    "game:status": "statuses",
    "game:error": "errors",
}

class Client:

    def __init__(self, name: str) -> None:
        self.name = name
        self.c = si_client.Client()
        self.snapshots: list = []
        self.statuses: list = []
        self.errors: list = []
        self.c.on("game:snapshot", self._on("snapshots"))
        self.c.on("game:status", self._on("statuses"))
        self.c.on("game:error", self._on("errors"))

    def _on(self, attr: str):
        def handler(data):
            getattr(self, attr).append(data)

        return handler

    def connect(self):
        self.c.connect(URL, transports=["websocket"])
        return self

    def ack(self, event, data=None, timeout=3):
        result = self.c.call(event, data or {}, timeout=timeout)
        return result if isinstance(result, dict) else {}

    def emit(self, event, data=None):
        self.c.emit(event, data or {})

    def count(self, event: str) -> int:
        return len(getattr(self, _EVENT_ATTR[event]))

    def wait(self, event: str, count=1, timeout=5):
        deadline = time.time() + timeout
        got = self.count(event)
        while time.time() < deadline:
            got = self.count(event)
            if got >= count:
                return
            time.sleep(0.05)
        raise AssertionError(
            f"{self.name}: timeout aguardando {event} (got={got}, want={count})"
        )

    def disconnect(self):
        self.c.disconnect()

def fail(msg: str):
    print(f"FAIL: {msg}")
    sys.exit(1)

def expect(cond, msg: str):
    if not cond:
        fail(msg)
    print(f"ok: {msg}")

def start_server() -> None:
    import db

    db.read_secret = lambda name: "secret-de-smoke"
    os.environ["PONG_COUNTDOWN_SECONDS"] = "0.15"
    import app as app_module

    os.environ["BACKEND_INTERNAL_PORT"] = str(PORT)
    server_thread = threading.Thread(
        target=lambda: app_module.socketio.run(
            app_module.app,
            host="127.0.0.1",
            port=PORT,
            allow_unsafe_werkzeug=True,
            log_output=False,
        ),
        daemon=True,
    )
    server_thread.start()
    for _ in range(50):
        try:
            with socket.create_connection(("127.0.0.1", PORT), timeout=0.2):
                return
        except OSError:
            time.sleep(0.1)
    raise RuntimeError("servidor não subiu")

def main() -> None:
    start_server()

    a = Client("A").connect()
    b = Client("B").connect()
    c = Client("C").connect()
    d = Client("D").connect()

    ack = a.ack("queue:join")
    expect(ack.get("status") == "waiting", "A entra na fila → waiting")

    ack = b.ack("queue:join")
    expect(ack.get("status") == "matched", "B entra → matched (pareado com A)")
    a.wait("game:status", 1, 3)
    b.wait("game:status", 1, 3)
    expect(
        a.statuses[0].get("state") == "countdown"
        and b.statuses[0].get("state") == "countdown",
        "A e B recebem game:status countdown",
    )
    expect(a.statuses[0].get("you") == "left", "A é left")
    expect(b.statuses[0].get("you") == "right", "B é right")
    a.wait("game:status", 2, 3)
    b.wait("game:status", 2, 3)
    expect(
        a.statuses[1].get("state") == "playing"
        and b.statuses[1].get("state") == "playing",
        "A e B recebem game:status playing após countdown",
    )

    a.emit("queue:join")
    a.wait("game:error", 1, 3)
    expect(
        a.errors[0].get("reason") == "already_playing",
        "A re-join na fila → already_playing",
    )

    base_a = a.count("game:snapshot")
    base_b = b.count("game:snapshot")
    time.sleep(SNAPSHOT_WINDOW_S)
    fa = a.count("game:snapshot") - base_a
    fb = b.count("game:snapshot") - base_b
    expect(20 <= fa <= 32, f"A recebe ~30 Hz (medido {fa}/s)")
    expect(20 <= fb <= 32, f"B recebe ~30 Hz (medido {fb}/s)")
    expect(a.snapshots[-1]["timestamp"] > 0, "snapshot tem timestamp")

    a.emit("paddle:input", {"offset": 2.0, "sequence": 1})
    b.emit("paddle:input", {"offset": -2.0, "sequence": 1})
    time.sleep(0.3)
    left_last = a.snapshots[-1]["leftPaddleOffset"]
    right_last = b.snapshots[-1]["rightPaddleOffset"]
    expect(abs(left_last - 2.0) < 1e-6, f"A moveu paddle esquerda (offset={left_last})")
    expect(
        abs(right_last - (-2.0)) < 1e-6, f"B moveu paddle direita (offset={right_last})"
    )

    a.emit("queue:leave")
    a.wait("game:error", 2, 3)
    expect(
        a.errors[-1].get("reason") == "invalid",
        "A queue:leave em partida → invalid",
    )

    d.emit("paddle:input", {"offset": 1.0, "sequence": 1})
    d.wait("game:error", 1, 3)
    expect(
        d.errors[0].get("reason") == "not_in_match",
        "D sem partida → not_in_match",
    )

    d.emit("paddle:input", {"offset": "linha", "sequence": 1})
    d.wait("game:error", 2, 3)
    expect(
        d.errors[-1].get("reason") == "malformed",
        "D input malformado → malformed",
    )

    ack = c.ack("queue:join")
    expect(ack.get("status") == "waiting", "C entra na fila → waiting (3º jogador)")

    start = time.time()
    winner_snapshot = None
    while time.time() - start < WINNER_TIMEOUT_S:
        for s in a.snapshots:
            if s["winner"] is not None:
                winner_snapshot = s
                break
        if winner_snapshot is not None:
            break
        time.sleep(0.2)
    if winner_snapshot is None:
        fail("partida não terminou dentro do timeout")
    winner = winner_snapshot["winner"] if winner_snapshot else None
    final_score = winner_snapshot["score"] if winner_snapshot else {}
    expect(winner in ("left", "right"), "winner do servidor")
    print(f"     placar final: {final_score}")

    a.emit("game:rematch")
    time.sleep(0.2)
    expect(
        any(st.get("state") == "rematch_pending" for st in a.statuses),
        "A sozinho em rematch → rematch_pending",
    )
    b.emit("game:rematch")
    time.sleep(0.5)
    expect(
        any(st.get("state") == "countdown" for st in a.statuses),
        "A+B rematch → countdown de novo",
    )
    deadline_playing = time.time() + 3
    while time.time() < deadline_playing:
        if sum(1 for st in a.statuses if st.get("state") == "playing") >= 2:
            break
        time.sleep(0.05)
    expect(
        sum(1 for st in a.statuses if st.get("state") == "playing") >= 2,
        "Após rematch countdown → playing de novo",
    )

    b.disconnect()
    deadline = time.time() + 5
    while time.time() < deadline:
        if any(st["state"] == "opponent_left" for st in a.statuses):
            break
        time.sleep(0.1)
    expect(
        any(st["state"] == "opponent_left" for st in a.statuses),
        "A recebe opponent_left após disconnect de B",
    )

    ack = a.ack("queue:join")
    expect(ack.get("status") == "matched", "A re-entra na fila → pareado com C")

    a.disconnect()
    c.disconnect()
    d.disconnect()
    print("\nSMOKE PASS")

if __name__ == "__main__":
    main()
