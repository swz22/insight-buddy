export interface Comment {
  id: string;
  text: string;
  selection: TextSelection;
  userId: string;
  userName: string;
  userAvatar?: string;
  userColor: string;
  createdAt: string;
  updatedAt: string;
  isEditing?: boolean;
  meetingId: string;
  parentId?: string;
  resolved?: boolean;
}

export interface TextSelection {
  start: number;
  end: number;
  text: string;
  contextBefore?: string;
  contextAfter?: string;
  paragraphId?: string;
  speakerName?: string;
}

export interface CommentThread {
  id: string;
  comments: Comment[];
  selection: TextSelection;
  isExpanded: boolean;
  position?: { x: number; y: number };
}

export interface CommentPresence {
  userId: string;
  userName: string;
  userColor: string;
  userAvatar?: string;
  cursorPosition?: number;
  selection?: TextSelection;
  isTyping: boolean;
  lastActive: string;
}

export interface CommentHighlight {
  id: string;
  start: number;
  end: number;
  commentCount: number;
  isActive: boolean;
  isHovered: boolean;
  userColors: string[];
}