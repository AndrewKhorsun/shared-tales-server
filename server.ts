import { createServer } from "http";
import { Server } from "socket.io";
import { app } from "./app";
import { config } from "./src/config";
import { initSocket } from "./src/socket";
import { setupCheckpointer } from "./src/agents/checkpointer";

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: config.cors.allowedOrigins,
    methods: ["GET", "POST"],
  },
});
initSocket(io);

(async () => {
  await setupCheckpointer();
  httpServer.listen(config.server.port, () => {
    console.log(`🚀 Server running on http://localhost:${config.server.port}`);
    console.log(`📚 API documentation available at http://localhost:${config.server.port}/`);
    console.log("💾 Database: PostgreSQL");
  });
})().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
