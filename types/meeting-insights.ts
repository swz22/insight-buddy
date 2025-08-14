export interface SpeakerMetrics {
  speaker: string;
  totalDuration: number;
  speakingPercentage: number;
  turnCount: number;
  averageTurnDuration: number;
  longestTurn: number;
  interruptions: number;
  wasInterrupted: number;
}

export interface SentimentAnalysis {
  overall: SentimentScore;
  timeline: SentimentTimeline[];
  bySpeaker: Record<string, SentimentScore>;
  topPositiveSegments: TranscriptSegment[];
  topNegativeSegments: TranscriptSegment[];
}

export interface SentimentScore {
  score: number;
  magnitude: number;
  label: "very_positive" | "positive" | "neutral" | "negative" | "very_negative";
}

export interface SentimentTimeline {
  timestamp: number;
  score: number;
  text: string;
  speaker: string;
}

export interface TranscriptSegment {
  text: string;
  speaker: string;
  startTime: number;
  endTime: number;
  sentiment?: SentimentScore;
}

export interface InterruptionEvent {
  interrupter: string;
  interrupted: string;
  timestamp: number;
  duration: number;
  context: string;
}

export interface ConversationDynamics {
  totalInterruptions: number;
  interruptionRate: number;
  averageTurnDuration: number;
  speakerBalance: number;
  mostDominantSpeaker: string;
  leastActiveSpeaker: string;
  interruptionEvents: InterruptionEvent[];
}

export interface MeetingInsights {
  id?: string;
  meeting_id: string;
  speakerMetrics: SpeakerMetrics[];
  sentiment: SentimentAnalysis;
  dynamics: ConversationDynamics;
  keyMoments?: KeyMoment[];
  engagementScore: number;
  generatedAt?: string;
  created_at: string;
}

export interface KeyMoment {
  type: "high_engagement" | "topic_shift" | "decision_point" | "action_item" | "concern_raised";
  timestamp: number;
  description: string;
  participants: string[];
  sentiment: SentimentScore;
}

export interface StoredMeetingInsights {
  id: string;
  meeting_id: string;
  speaker_metrics: SpeakerMetrics[];
  sentiment: SentimentAnalysis;
  dynamics: ConversationDynamics;
  key_moments?: KeyMoment[];
  engagement_score: number;
  generated_at: string;
  created_at: string;
  updated_at: string;
}

export function isSpeakerMetrics(obj: any): obj is SpeakerMetrics {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.speaker === "string" &&
    typeof obj.totalDuration === "number" &&
    typeof obj.speakingPercentage === "number" &&
    typeof obj.turnCount === "number" &&
    typeof obj.averageTurnDuration === "number" &&
    typeof obj.longestTurn === "number" &&
    typeof obj.interruptions === "number" &&
    typeof obj.wasInterrupted === "number"
  );
}

export function isConversationDynamics(obj: any): obj is ConversationDynamics {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.totalInterruptions === "number" &&
    typeof obj.interruptionRate === "number" &&
    typeof obj.averageTurnDuration === "number" &&
    typeof obj.speakerBalance === "number" &&
    typeof obj.mostDominantSpeaker === "string" &&
    typeof obj.leastActiveSpeaker === "string" &&
    Array.isArray(obj.interruptionEvents)
  );
}

export function isMeetingInsights(obj: any): obj is MeetingInsights {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.meeting_id === "string" &&
    Array.isArray(obj.speakerMetrics) &&
    obj.speakerMetrics.every(isSpeakerMetrics) &&
    obj.sentiment &&
    typeof obj.engagementScore === "number" &&
    obj.dynamics &&
    isConversationDynamics(obj.dynamics)
  );
}
