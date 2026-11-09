import { schema, t, type SchemaType } from "@colyseus/schema";

export const Player = schema({
  name: t.string(),
  x: t.number(),
  y: t.number(),
  height: t.number(),
  yaw: t.number(),
  pitch: t.number(),
  equipped: t.boolean(),
});
export type Player = SchemaType<typeof Player>;

export const MyRoomState = schema({
  players: t.map(Player),
});
export type MyRoomState = SchemaType<typeof MyRoomState>;
