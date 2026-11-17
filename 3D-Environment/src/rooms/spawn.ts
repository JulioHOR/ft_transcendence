export type SpawnPoint = { x: number; y: number; height: number; yaw: number };
type Position = { x: number; y: number; height: number };

// a point with a player closer than this counts as taken
export const MIN_SPAWN_DISTANCE = 1.5;

// must be on the floor and clear of the building's collisions.
export const SPAWN_POINTS: [SpawnPoint, ...SpawnPoint[]] = [
	{ x: -3.5, y: 51.1, height: 3.2, yaw: 1.14 },
	{ x: -3.7, y: 53.2, height: 3.2, yaw: 1.61 },
	{ x: -3.5, y: 56.7, height: 3.2, yaw: 1.89 },
	{ x: -3.7, y: 59.1, height: 3.2, yaw: 2.11 },
	{ x: -4.9, y: 49.3, height: 3.2, yaw: 0.92 },
	{ x: -3.0, y: 50.1, height: 3.2, yaw: 0.38 },
	{ x: -2.9, y: 59.4, height: 3.2, yaw: 2.87 },
	{ x: -5.1, y: 54.2, height: 3.2, yaw: 1.58 },
];

// distance from a point to the nearest player, or Infinity when nobody is there.
function nearestPlayer(point: Position, players: Position[]): number {
	return players.reduce((nearest, p) => Math.min(nearest, Math.hypot(p.x - point.x, p.y - point.y, p.height - point.height)), Infinity);
}

// a free spawn point if there is one, chosen at random, otherwise the point. farthest from the nearest player, so nobody lands on top of someone.
export function pickSpawn(spawns: [SpawnPoint, ...SpawnPoint[]], players: Position[]): SpawnPoint {
	const free = spawns.filter((s) => nearestPlayer(s, players) >= MIN_SPAWN_DISTANCE);
	if (free.length > 0) {
		return free[Math.floor(Math.random() * free.length)];
	}
	return spawns.reduce((best, s) => (nearestPlayer(s, players) > nearestPlayer(best, players) ? s : best));
}
