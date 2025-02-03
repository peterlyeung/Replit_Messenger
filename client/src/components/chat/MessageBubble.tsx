import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  content: string;
  timestamp: Date;
  isSelf: boolean;
}

export function MessageBubble({ content, timestamp, isSelf }: MessageBubbleProps) {
  return (
    <div className={cn(
      "flex flex-col gap-1 max-w-[80%] w-fit",
      isSelf ? "ml-auto" : "mr-auto"
    )}>
      <div className={cn(
        "rounded-2xl px-4 py-2 text-sm md:text-base break-words",
        isSelf 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted"
      )}>
        {content}
      </div>
      <span className="text-xs text-muted-foreground px-2">
        {format(new Date(timestamp), "h:mm a")}
      </span>
    </div>
  );
}
