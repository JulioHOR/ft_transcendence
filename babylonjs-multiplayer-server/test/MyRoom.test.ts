import assert from "assert";
import { ColyseusTestServer, boot } from "@colyseus/testing";

import appConfig from "../src/app.config.js";
import type { MyRoomState } from "../src/rooms/schema/MyRoomState.js";
import { MSG_UPDATE_POSITION } from "../src/shared/messages.js";

describe("MyRoom", () => {
	let colyseus: ColyseusTestServer<typeof appConfig>;

	before(async () => (colyseus = await boot(appConfig)));
	after(async () => colyseus.shutdown());

	beforeEach(async () => {
		await colyseus.cleanup();
	});

	const position = { x: 5, y: 6, height: 1, yaw: 1, pitch: 0.5 };

	it("creates a Player on join", async () => {
		const room = await colyseus.createRoom<MyRoomState>("my_room", {});
		const client1 = await colyseus.connectTo(room);

		const player = room.state.players.get(client1.sessionId);
		assert.ok(player, "a Player is created on join");
		assert.match(player.name, /^dev_\d+$/); // outside production, no cookie means a guest name
	});

	it("stores the position a client sends", async () => {
		const room = await colyseus.createRoom<MyRoomState>("my_room", {});
		const client1 = await colyseus.connectTo(room);
		const player = room.state.players.get(client1.sessionId);
		assert.ok(player);

		client1.send(MSG_UPDATE_POSITION, position);
		await room.waitForNextMessage();

		assert.strictEqual(player.x, 5);
		assert.strictEqual(player.y, 6);
		assert.strictEqual(player.height, 1);
	});

	it("ignores values that are not finite numbers", async () => {
		const room = await colyseus.createRoom<MyRoomState>("my_room", {});
		const client1 = await colyseus.connectTo(room);
		const player = room.state.players.get(client1.sessionId);
		assert.ok(player);

		client1.send(MSG_UPDATE_POSITION, position);
		await room.waitForNextMessage();
		client1.send(MSG_UPDATE_POSITION, { x: NaN, y: "abc", height: Infinity, yaw: 2, pitch: null });
		await room.waitForNextMessage();

		assert.strictEqual(player.x, 5); // bad values ignored
		assert.strictEqual(player.height, 1);
		assert.strictEqual(player.yaw, 2); // the valid field is applied
	});

	it("survives a message with no payload", async () => {
		const room = await colyseus.createRoom<MyRoomState>("my_room", {});
		const client1 = await colyseus.connectTo(room);
		const player = room.state.players.get(client1.sessionId);
		assert.ok(player);

		client1.send(MSG_UPDATE_POSITION);
		await room.waitForNextMessage();
		client1.send(MSG_UPDATE_POSITION, position);
		await room.waitForNextMessage();

		assert.strictEqual(player.x, 5);
	});
});
