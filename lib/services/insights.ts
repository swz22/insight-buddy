import { z } from "zod";
import { withRetry } from "@/lib/utils/retry";

interface SpeakerMetric {
  speaker: string;
  totalDuration: number;
  speakingPercentage: number;
}

interface ConversationDynamics {
  turnTaking: { frequent: boolean; averageTurnDuration: number };
  interruptions: number;
  silences: { count: number; averageDuration: number };
  speakingRateVariation: number;
}

interface SentimentResult {
  label: string;
  score: number;
}

interface SentimentScore {
  positive: number;
  negative: number;
  neutral: number;
}

interface SentimentData {
  overall: {
    score: number;
    magnitude: number;
    label: "very_positive" | "positive" | "neutral" | "negative" | "very_negative";
  };
  timeline: Array<{
    timestamp: number;
    score: number;
    text: string;
    speaker: string;
  }>;
  bySpeaker: Record<
    string,
    {
      score: number;
      magnitude: number;
      label: "very_positive" | "positive" | "neutral" | "negative" | "very_negative";
    }
  >;
  topPositiveSegments: Array<{
    text: string;
    speaker: string;
    startTime: number;
    endTime: number;
    sentiment?: {
      score: number;
      magnitude: number;
      label: "very_positive" | "positive" | "neutral" | "negative" | "very_negative";
    };
  }>;
  topNegativeSegments: Array<{
    text: string;
    speaker: string;
    startTime: number;
    endTime: number;
    sentiment?: {
      score: number;
      magnitude: number;
      label: "very_positive" | "positive" | "neutral" | "negative" | "very_negative";
    };
  }>;
}

export interface MeetingInsights {
  meeting_id: string;
  speakerMetrics: SpeakerMetric[];
  engagementScore: number;
  dynamics: ConversationDynamics;
  sentiment: SentimentData;
  keyTopics?: string[];
  created_at: string;
}

export class InsightsService {
  private apiKey: string;
  private sentimentApiUrl =
    "https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeMeeting(
    meetingId: string,
    transcript: { utterances?: any[]; text: string; audio_duration?: number }
  ): Promise<MeetingInsights> {
    try {
      const utterances = transcript.utterances || [];
      const totalDuration = transcript.audio_duration || 0;

      const speakerMetrics = this.calculateSpeakerMetrics(utterances, totalDuration);
      const dynamics = this.analyzeConversationDynamics(utterances);
      const sentiment = await this.analyzeSentiment(transcript.text, utterances);
      const engagementScore = this.calculateEngagementScore(speakerMetrics, dynamics, sentiment);

      return {
        meeting_id: meetingId,
        speakerMetrics,
        engagementScore,
        dynamics,
        sentiment,
        created_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Meeting analysis error:", error);
      throw error;
    }
  }

  private calculateSpeakerMetrics(utterances: any[], totalDuration: number): SpeakerMetric[] {
    const speakerDurations = new Map<string, number>();

    utterances.forEach((utterance) => {
      const speaker = utterance.speaker || "Unknown";
      const duration = (utterance.end - utterance.start) / 1000;
      speakerDurations.set(speaker, (speakerDurations.get(speaker) || 0) + duration);
    });

    const metrics: SpeakerMetric[] = [];
    speakerDurations.forEach((duration, speaker) => {
      metrics.push({
        speaker,
        totalDuration: duration,
        speakingPercentage: totalDuration > 0 ? (duration / totalDuration) * 100 : 0,
      });
    });

    return metrics.sort((a, b) => b.totalDuration - a.totalDuration);
  }

  private analyzeConversationDynamics(utterances: any[]): ConversationDynamics {
    if (utterances.length === 0) {
      return {
        turnTaking: { frequent: false, averageTurnDuration: 0 },
        interruptions: 0,
        silences: { count: 0, averageDuration: 0 },
        speakingRateVariation: 0,
      };
    }

    const turns = utterances.length;
    const totalDuration =
      utterances.length > 0 ? (utterances[utterances.length - 1].end - utterances[0].start) / 1000 : 0;
    const averageTurnDuration = totalDuration / turns;

    let interruptions = 0;
    let silences: number[] = [];

    for (let i = 1; i < utterances.length; i++) {
      const gap = (utterances[i].start - utterances[i - 1].end) / 1000;
      if (gap < -0.5) {
        interruptions++;
      } else if (gap > 2) {
        silences.push(gap);
      }
    }

    return {
      turnTaking: {
        frequent: turns > totalDuration / 10,
        averageTurnDuration,
      },
      interruptions,
      silences: {
        count: silences.length,
        averageDuration: silences.length > 0 ? silences.reduce((a, b) => a + b, 0) / silences.length : 0,
      },
      speakingRateVariation: 0.15,
    };
  }

  private async analyzeSentiment(text: string, utterances: any[]): Promise<SentimentData> {
    const overall = await this.getSentimentScoreWithLabel(text);

    const timeline: SentimentData["timeline"] = [];
    const segments = this.createTextSegments(utterances, 5);

    for (const segment of segments) {
      const sentimentResult = await this.getRawSentimentScore(segment.text);
      const score = this.convertToScore(sentimentResult);
      timeline.push({
        timestamp: segment.time * 1000, // Convert to milliseconds
        score,
        text: segment.text.slice(0, 100),
        speaker: segment.speaker || "Unknown",
      });
    }

    // Calculate by speaker sentiment
    const bySpeaker: SentimentData["bySpeaker"] = {};
    const speakerTexts = new Map<string, string[]>();

    utterances.forEach((utterance) => {
      const speaker = utterance.speaker || "Unknown";
      if (!speakerTexts.has(speaker)) {
        speakerTexts.set(speaker, []);
      }
      speakerTexts.get(speaker)!.push(utterance.text || "");
    });

    for (const [speaker, texts] of speakerTexts) {
      const speakerText = texts.join(" ");
      bySpeaker[speaker] = await this.getSentimentScoreWithLabel(speakerText);
    }

    // Create segments for positive/negative segments
    const allSegments = utterances.map((u, i) => ({
      text: u.text || "",
      speaker: u.speaker || "Unknown",
      startTime: u.start / 1000,
      endTime: u.end / 1000,
      sentiment: undefined as any,
    }));

    // Get sentiment for each segment
    for (const segment of allSegments) {
      const sentimentResult = await this.getRawSentimentScore(segment.text);
      const score = this.convertToScore(sentimentResult);
      segment.sentiment = {
        score,
        magnitude: Math.abs(score),
        label: this.getLabel(score),
      };
    }

    // Sort and get top segments
    const sortedSegments = [...allSegments].sort((a, b) => (b.sentiment?.score || 0) - (a.sentiment?.score || 0));

    const topPositiveSegments = sortedSegments.slice(0, 3);
    const topNegativeSegments = sortedSegments.slice(-3).reverse();

    return {
      overall,
      timeline,
      bySpeaker,
      topPositiveSegments,
      topNegativeSegments,
    };
  }

  private createTextSegments(
    utterances: any[],
    numSegments: number
  ): { time: number; text: string; speaker?: string }[] {
    if (utterances.length === 0) return [];

    const segments: { time: number; text: string; speaker?: string }[] = [];
    const utterancesPerSegment = Math.ceil(utterances.length / numSegments);

    for (let i = 0; i < numSegments; i++) {
      const start = i * utterancesPerSegment;
      const end = Math.min(start + utterancesPerSegment, utterances.length);
      const segmentUtterances = utterances.slice(start, end);

      if (segmentUtterances.length > 0) {
        segments.push({
          time: segmentUtterances[0].start / 1000,
          text: segmentUtterances.map((u) => u.text).join(" "),
          speaker: segmentUtterances[0].speaker,
        });
      }
    }

    return segments;
  }

  private async getRawSentimentScore(text: string): Promise<SentimentScore> {
    try {
      const result = await withRetry(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(this.sentimentApiUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: text.slice(0, 512) }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Sentiment API error: ${response.statusText}`);
        }

        const results = await response.json();
        if (!Array.isArray(results) || !results[0]) {
          throw new Error("Invalid sentiment response");
        }

        const sentiments = results[0] as SentimentResult[];
        const positive = sentiments.find((s) => s.label === "POSITIVE")?.score || 0;
        const negative = sentiments.find((s) => s.label === "NEGATIVE")?.score || 0;
        const neutral = 1 - positive - negative;

        return {
          positive: Math.round(positive * 100),
          negative: Math.round(negative * 100),
          neutral: Math.round(neutral * 100),
        };
      });

      return result;
    } catch (error) {
      console.error("Sentiment analysis error after retries:", error);
      return { positive: 33, negative: 33, neutral: 34 };
    }
  }

  private async getSentimentScoreWithLabel(text: string): Promise<{
    score: number;
    magnitude: number;
    label: "very_positive" | "positive" | "neutral" | "negative" | "very_negative";
  }> {
    const sentimentScore = await this.getRawSentimentScore(text);
    const score = this.convertToScore(sentimentScore);
    const magnitude = Math.abs(score);
    const label = this.getLabel(score);

    return { score, magnitude, label };
  }

  private convertToScore(sentiment: SentimentScore): number {
    // Convert percentage-based sentiment to -1 to 1 scale
    const positiveWeight = sentiment.positive / 100;
    const negativeWeight = sentiment.negative / 100;
    return positiveWeight - negativeWeight;
  }

  private getLabel(score: number): "very_positive" | "positive" | "neutral" | "negative" | "very_negative" {
    if (score >= 0.6) return "very_positive";
    if (score >= 0.2) return "positive";
    if (score >= -0.2) return "neutral";
    if (score >= -0.6) return "negative";
    return "very_negative";
  }

  private calculateEngagementScore(
    speakerMetrics: SpeakerMetric[],
    dynamics: ConversationDynamics,
    sentiment: SentimentData
  ): number {
    let score = 50;

    const balancedParticipation =
      speakerMetrics.length > 1 && Math.max(...speakerMetrics.map((m) => m.speakingPercentage)) < 70;
    if (balancedParticipation) score += 20;

    if (dynamics.turnTaking.frequent) score += 15;

    score -= dynamics.interruptions * 2;
    score -= dynamics.silences.count;

    const sentimentBonus = sentiment.overall.score * 15;
    score += sentimentBonus;

    return Math.max(0, Math.min(100, Math.round(score)));
  }
}
