import { EventEmitter } from "events";
import { getIO } from "../socket";

export function subscribeToProgress(emitter: EventEmitter, userId: string): void {
  const io = getIO();

  emitter.on("progress", (data) => io.to(userId).emit("chapter:progress", data));
  emitter.on("plan_ready", (data) => io.to(userId).emit("chapter:plan_ready", data));
  emitter.on("done", (data) => io.to(userId).emit("chapter:done", data));
  emitter.on("error", (data) => io.to(userId).emit("chapter:error", data));
}
