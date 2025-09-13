import { MessageSquare, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  id: string;
  text: string;
  paragraphId: string;
  timestamp: string;
  userName: string;
  userColor: string;
  replies?: Comment[];
}

interface CommentThreadProps {
  comment: Comment;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  isDemo?: boolean;
}

export function CommentThread({
  comment,
  isActive,
  onClick,
  onDelete,
  isDemo = false,
}: CommentThreadProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg border transition-all cursor-pointer",
        isActive
          ? "bg-purple-500/10 border-purple-500/50"
          : "bg-white/5 border-white/10 hover:bg-white/10"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0"
            style={{ backgroundColor: comment.userColor }}
          >
            {comment.userName[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-white/90">
                {comment.userName}
              </span>
              <span className="text-xs text-white/40 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm text-white/70 whitespace-pre-wrap break-words">
              {comment.text}
            </p>
          </div>
        </div>
        {(isDemo || comment.userName === "You") && (
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="w-8 h-8 p-0 text-white/40 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}