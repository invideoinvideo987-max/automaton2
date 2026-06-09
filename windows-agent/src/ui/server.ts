/**
 * UI Server - Express + WebSocket server for the Electron renderer
 */

import express from "express";
import { createServer, type Server } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import path from "node:path";

export class UIServer {
  private app: express.Application;
  private server: Server;
  private io: SocketIOServer;
  private port: number;

  constructor(port: number = 3847) {
    this.port = port;
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: { origin: "*" },
    });

    this.setupRoutes();
    this.setupSocket();
  }

  private setupRoutes(): void {
    // Serve static UI files
    this.app.use(express.static(path.join(__dirname, "renderer")));

    // API endpoints
    this.app.get("/api/health", (_, res) => {
      res.json({ status: "alive", timestamp: new Date().toISOString() });
    });
  }

  private setupSocket(): void {
    this.io.on("connection", (socket) => {
      console.log("[UI] Client connected");

      socket.on("disconnect", () => {
        console.log("[UI] Client disconnected");
      });
    });
  }

  /**
   * Broadcast an event to all connected UI clients
   */
  broadcast(event: string, data: any): void {
    this.io.emit(event, data);
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`[UI] Server running on http://localhost:${this.port}`);
        resolve();
      });
    });
  }

  stop(): void {
    this.server.close();
  }
}
