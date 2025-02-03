import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { db } from '@db';
import { messages } from '@db/schema';
import { eq } from 'drizzle-orm';
import { log } from './vite';

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ 
    server,
    path: '/ws',
    clientTracking: true
  });
  const clients = new Map<number, WebSocket>();

  wss.on('connection', (ws, req) => {
    if (req.headers['sec-websocket-protocol'] === 'vite-hmr') {
      return;
    }

    log('New WebSocket connection established', 'websocket');
    let userId: number | null = null;

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        log(`Received message of type: ${message.type}`, 'websocket');

        switch (message.type) {
          case 'auth': {
            if (typeof message.userId !== 'number') {
              throw new Error('Invalid userId');
            }

            userId = message.userId;
            clients.set(userId, ws);
            log(`User ${userId} authenticated`, 'websocket');

            ws.send(JSON.stringify({ 
              type: 'auth_success',
              userId 
            }));
            break;
          }

          case 'message': {
            if (!userId || typeof message.receiverId !== 'number') {
              throw new Error('Invalid message parameters');
            }

            const newMessage = await db.insert(messages).values({
              content: message.content,
              senderId: userId,
              receiverId: message.receiverId,
              createdAt: new Date()
            }).returning();

            log(`Message sent from ${userId} to ${message.receiverId}`, 'websocket');

            // Send to sender for immediate feedback
            ws.send(JSON.stringify({
              type: 'message_sent',
              message: newMessage[0]
            }));

            // Send to receiver if online
            const receiverWs = clients.get(message.receiverId);
            if (receiverWs?.readyState === WebSocket.OPEN) {
              receiverWs.send(JSON.stringify({
                type: 'new_message',
                message: newMessage[0]
              }));
            }
            break;
          }
        }
      } catch (err) {
        console.error('WebSocket message handling error:', err);
        ws.send(JSON.stringify({ 
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to process message'
        }));
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    ws.on('close', () => {
      if (userId) {
        log(`User ${userId} disconnected`, 'websocket');
        clients.delete(userId);
      }
    });
  });

  return wss;
}