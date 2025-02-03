import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { SelectMessage } from "@db/schema";

interface ChatWindowProps {
  userId: number;
  otherId: number;
  ws: WebSocket;
}

export function ChatWindow({ userId, otherId, ws }: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [localMessages, setLocalMessages] = useState<SelectMessage[]>([]);

  const { data: messages = [] } = useQuery<SelectMessage[]>({
    queryKey: [`/api/messages/${userId}/${otherId}`],
  });

  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [localMessages]);

  useEffect(() => {
    const messageHandler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'message_sent' || data.type === 'new_message') {
          setLocalMessages(prev => [...prev, data.message]);
          queryClient.invalidateQueries({ 
            queryKey: [`/api/messages/${userId}/${otherId}`]
          });
        }
      } catch (err) {
        console.error('Failed to handle message:', err);
      }
    };

    ws.addEventListener('message', messageHandler);

    return () => {
      ws.removeEventListener('message', messageHandler);
    };
  }, [ws, queryClient, userId, otherId]);

  const handleSendMessage = (content: string) => {
    try {
      ws.send(JSON.stringify({
        type: 'message',
        content,
        receiverId: otherId
      }));
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message",
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-background rounded-lg shadow-lg overflow-hidden">
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="flex flex-col gap-4">
          {localMessages.map((message) => (
            <MessageBubble
              key={message.id}
              content={message.content}
              timestamp={message.createdAt}
              isSelf={message.senderId === userId}
            />
          ))}
        </div>
      </ScrollArea>
      <ChatInput onSendMessage={handleSendMessage} />
    </div>
  );
}