const held = new Set<string>();
addEventListener("keydown", (e) => held.add(e.key.toLowerCase()));
addEventListener("keyup", (e) => held.delete(e.key.toLowerCase()));

export function isHeld(key: string): boolean {
	return held.has(key);
}

// Opposite keys cancel out, so the axis is always exactly -1, 0 or 1.
export function axis(negative: string[], positive: string[]): -1 | 0 | 1 {
	const back = negative.some((k) => held.has(k));
	const forward = positive.some((k) => held.has(k));
	if (back === forward) {
		return 0;
	}
	return back ? -1 : 1;
}
