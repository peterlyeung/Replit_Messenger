import { useEffect, useState } from "react";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { useToast } from "@/hooks/use-toast";

// Temporary hard-coded users for demo
const CURRENT_USER_ID = 1;
const OTHER_USER_ID = 2;

// Helper to get WebSocket URL based on current environment
function getWebSocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

export default function ChatPage() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      try {
        socket = new WebSocket(getWebSocketUrl());

        socket.onopen = () => {
          console.log('WebSocket connected');
          setError(null);
          socket?.send(JSON.stringify({
            type: 'auth',
            userId: CURRENT_USER_ID
          }));
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'auth_success') {
              setConnected(true);
              setError(null);
              toast({
                title: "Connected",
                description: "Chat connection established",
              });
            }
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        };

        socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          setError('Connection error occurred');
          toast({
            variant: "destructive",
            title: "Connection Error",
            description: "Failed to connect to chat server",
          });
        };

        socket.onclose = () => {
          setConnected(false);
          setError('Connection lost');
          toast({
            variant: "destructive",
            title: "Disconnected",
            description: "Chat connection lost. Attempting to reconnect...",
          });

          // Attempt to reconnect after 3 seconds
          reconnectTimeout = setTimeout(connect, 3000);
        };

        setWs(socket);
      } catch (err) {
        console.error('Failed to create WebSocket:', err);
        setError('Failed to create connection');
      }
    };

    connect();

    return () => {
      socket?.close();
      clearTimeout(reconnectTimeout);
    };
  }, [toast]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">{error}</div>
          <p className="text-lg text-gray-600">Attempting to reconnect...</p>
        </div>
      </div>
    );
  }

  if (!ws || !connected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Connecting to chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto h-[calc(100vh-4rem)]">
        <ChatWindow
          userId={CURRENT_USER_ID}
          otherId={OTHER_USER_ID}
          ws={ws}
        />
      </div>
    </div>
  );
}