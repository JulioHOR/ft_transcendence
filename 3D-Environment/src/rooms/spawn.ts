export type SpawnPoint = { x: number; y: number; yaw: number };
type Position = { x: number; y: number };

// a point with a player closer than this counts as taken
export const MIN_SPAWN_DISTANCE = 1.5;

// must be on the floor and clear of the building's collisions.
export const SPAWN_POINTS: [SpawnPoint, ...SpawnPoint[]] = [
	{ x: 1, y: -6, yaw: 0 },
	{ x: 1, y: -4, yaw: 0 },
	{ x: 1, y: -2, yaw: 0 },
	{ x: 1, y: 0, yaw: 0 },
	{ x: 1, y: 2, yaw: 0 },
	{ x: 3, y: 4, yaw: 0 },
	{ x: 5, y: 4, yaw: 0 },
	{ x: 7, y: 4, yaw: 0 },
];

// distance from a point to the nearest player, or Infinity when nobody is there.
function nearestPlayer(point: Position, players: Position[]): number {
	return players.reduce((nearest, p) => Math.min(nearest, Math.hypot(p.x - point.x, p.y - point.y)), Infinity);
}

// a free spawn point if there is one, chosen at random, otherwise the point. farthest from the nearest player, so nobody lands on top of someone.
export function pickSpawn(spawns: [SpawnPoint, ...SpawnPoint[]], players: Position[]): SpawnPoint {
	const free = spawns.filter((s) => nearestPlayer(s, players) >= MIN_SPAWN_DISTANCE);
	if (free.length > 0) {
		return free[Math.floor(Math.random() * free.length)];
	}
	return spawns.reduce((best, s) => (nearestPlayer(s, players) > nearestPlayer(best, players) ? s : best));
}
