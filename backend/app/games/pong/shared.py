import time

def clamp(value: float, min_value: float, max_value: float) -> float:
    return min(max_value, max(min_value, value))

def compute_delta_seconds(last_frame_time: float) -> tuple[float, float]:
    now = time.monotonic() * 1000
    if last_frame_time == 0:
        return 0.0, now
    return (now - last_frame_time) / 1000, now

def now_ms() -> float:
    return time.time() * 1000
