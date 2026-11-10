import { Room, type Client, CloseCode, type AuthContext } from "colyseus";
import { authenticate, type GameUser } from "./auth.js";
import { MyRoomState, Player } from "./schema/MyRoomState.js";
import { CLOSE_LOGGED_IN_ELSEWHERE } from "../shared/constants.js";
import { MSG_SET_EQUIPPED, MSG_SIGNAL, MSG_UPDATE_POSITION } from "../shared/messages.js";
import { pickSpawn, SPAWN_POINTS } from "./spawn.js";

type GameClient = Client<{ auth: GameUser}>;

export class MyRoom extends Room<{ state: MyRoomState; client: GameClient }> {
	maxClients = 8;
	state = new MyRoomState();

	static async onAuth(_token: string, _options: unknown, context: AuthContext) {
		return authenticate(context);
	}

	onCreate() {
		this.autoDispose = false; // prevents closing an empty room
		console.log("room created", this.roomId);

		// Accept client-authoritative position updates from Babylon collisions
		this.onMessage(MSG_UPDATE_POSITION, (client, data) => {
		const player = this.state.players.get(client.sessionId);
		if (player && data) {
			// the client is authoritative on its position.
			if (Number.isFinite(data.x)) {
				player.x = data.x;
			}

			if (Number.isFinite(data.y)) {
				player.y = data.y; // maps to schema Y (3D Z plane)
			}	

			if (Number.isFinite(data.yaw)) {
			player.yaw = data.yaw;
			}

			if (Number.isFinite(data.pitch)) {
			player.pitch = data.pitch;
			}

			if (Number.isFinite(data.height)) {
			player.height = data.height;
			}
		}
	});

	this.onMessage(MSG_SET_EQUIPPED, (client, data) => {
	const player = this.state.players.get(client.sessionId);
		if (player && typeof data?.equipped === "boolean") {
			player.equipped = data.equipped;
		}
	});

	this.onMessage(MSG_SIGNAL, (client, data) => {
		if (typeof data?.to !== "string") return;
		this.clients.get(data.to)?.send(MSG_SIGNAL, {
			from: client.sessionId,
			data: data.data,
		});
	});
}
	onJoin(client: GameClient, _options: unknown) {
		const user = client.auth!;
		console.log(client.sessionId, "joined as", user.nickname, `(#${user.id})`);

		//same account, different tab: the newset conneciton wins
		for (const other of this.clients) {
			if (other !== client && other.auth?.id === user.id) {
				other.leave(CLOSE_LOGGED_IN_ELSEWHERE);
			}
		}

		// a refresh drops the previous instantly.
		for (const [sessionId, player] of Array.from(this.state.players)) {
			if (sessionId !== client.sessionId && player.name === user.nickname) {
				this.state.players.delete(sessionId);
			}
		}

		// the position is chosen here and the client start from it.
		// after that the client is authoritative.
		const spawn = pickSpawn(SPAWN_POINTS, Array.from(this.state.players.values()));
		this.state.players.set(
		client.sessionId,
			new Player({
				name: user.nickname,
				x: spawn.x,
				y: spawn.y,
				height: 0,
				yaw: spawn.yaw,
				pitch: 0,
				equipped: false,
			}),
		);
	}

	onLeave(client: GameClient, code: CloseCode) {
		console.log(client.sessionId, "left!", code);
		this.state.players.delete(client.sessionId);
	}

	onDispose() {
		console.log("room", this.roomId, "disposing...");
	}

	/**
	 * Called on any disconnection the client did not ask for — a network blip, a
	 * suspended tab, a tunnel change. Holding the seat lets the SDK retry into the
	 * same session, so the player keeps their entity and their place in the room.
	 */
	onDrop(client: GameClient, code: number) {
		if (code === CLOSE_LOGGED_IN_ELSEWHERE) return;
		// Deliberately not awaited: the framework routes the outcome to onReconnect()
		// or onLeave() by itself. The catch is only here because the promise also
		// rejects when the room is already disposing (server shutdown), which would
		// otherwise surface as an unhandled rejection.
		this.allowReconnection(client, 30).catch(() => {});
	}

	onReconnect(client: GameClient) {
		console.log(client.sessionId, "reconnected!");
	}
}
