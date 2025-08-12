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
  id: string;
  meetingId: string;
  speakerMetrics: SpeakerMetrics[];
  sentiment: SentimentAnalysis;
  dynamics: ConversationDynamics;
  keyMoments: KeyMoment[];
  engagementScore: number;
  generatedAt: string;
}

export interface KeyMoment {
  type: "high_engagement" | "topic_shift" | "decision_point" | "action_item" | "concern_raised";
  timestamp: number;
  description: string;
  participants: string[];
  sentiment: SentimentScore;
}
