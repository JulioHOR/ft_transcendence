import assert from "assert";
import { pickSpawn, type SpawnPoint } from "../src/rooms/spawn.js";

const spawns: [SpawnPoint, ...SpawnPoint[]] = [
	{ x: 0, y: 0, yaw: 0 },
	{ x: 10, y: 0, yaw: 1 },
	{ x: 20, y: 0, yaw: 2 },
];

describe("pickSpawn", () => {
	it("returns one of the points when the room is empty", () => {
		assert.ok(spawns.includes(pickSpawn(spawns, [])));
	});

	it("never returns a point that has a player on it", () => {
		for (let i = 0; i < 50; i++) {
			assert.notStrictEqual(pickSpawn(spawns, [{ x: 0.5, y: 0 }]), spawns[0]);
		}
	});

	it("skips every occupied point", () => {
		for (let i = 0; i < 50; i++) {
			assert.strictEqual(pickSpawn(spawns, [{ x: 0, y: 0 }, { x: 10, y: 0.4 }]), spawns[2]);
		}
	});

	it("uses the point farthest from the nearest player when all are taken", () => {
		const players = [{ x: 0.5, y: 0 }, { x: 10.2, y: 0 }, { x: 20.9, y: 0 }];
		assert.strictEqual(pickSpawn(spawns, players), spawns[2]); // nearest players: 0.5, 0.2, 0.9
	});
});
