import {
  defineServer,
  defineRoom,
  monitor,
  playground,
  LobbyRoom,
  matchMaker,
} from "colyseus";

import express from "express";
import path from "node:path";

import { MyRoom } from "./rooms/MyRoom.js";

const server = defineServer({
  /**
   * Define your room handlers:
   */
  rooms: {
    my_room: defineRoom(MyRoom).enableRealtimeListing(),
    lobby: defineRoom(LobbyRoom),
  },

  beforeListen: async() => {
	await matchMaker.createRoom("my_room", {});
  },

  /**
   * Bind your custom express routes here:
   * Read more: https://expressjs.com/en/starter/basic-routing.html
   */
  express: (app) => {
    // fix paths for our two different envs, dev and prod.
    if (process.env.NODE_ENV === "production") {
      app.use(express.static(path.resolve("dist/client")));
    }

    /**
     * Use @colyseus/monitor
     * If you expose it in production, make sure to protect it with a password:
     * https://docs.colyseus.io/tools/monitoring#password-protection
     */
    if (process.env.NODE_ENV !== "production") {
      app.use("/monitor", monitor());
    }

    /**
     * Use @colyseus/playground
     * (It is not recommended to expose this route in a production environment)
     */
    if (process.env.NODE_ENV !== "production") {
      app.use("/playground", playground());
    }
  },
});

export default server;

/** Named export read by the `colyseus/vite` plugin's `serverEntry`. */
export { server };
