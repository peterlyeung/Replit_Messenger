import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { messages } from "@db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { setupWebSocket } from "./ws";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  setupWebSocket(httpServer);

  app.get("/api/messages/:userId/:otherId", async (req, res) => {
    const { userId, otherId } = req.params;

    const chatMessages = await db.query.messages.findMany({
      where: or(
        and(
          eq(messages.senderId, parseInt(userId)),
          eq(messages.receiverId, parseInt(otherId))
        ),
        and(
          eq(messages.senderId, parseInt(otherId)),
          eq(messages.receiverId, parseInt(userId))
        )
      ),
      orderBy: [desc(messages.createdAt)],
      limit: 50
    });

    res.json(chatMessages.reverse());
  });

  return httpServer;
}