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

interface ParsedUtterance {
  speaker: string;
  text: string;
  start: number;
  end: number;
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
      let utterances = transcript.utterances || [];
      const totalDuration = transcript.audio_duration || 0;

      if (utterances.length === 0 && transcript.text) {
        utterances = this.parseTranscriptToUtterances(transcript.text, totalDuration);
      }

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

  private parseTranscriptToUtterances(transcriptText: string, totalDuration: number): ParsedUtterance[] {
    const utterances: ParsedUtterance[] = [];
    const lines = transcriptText.split("\n").filter((line) => line.trim());

    const timestampPattern = /^\[(\d{2}):(\d{2})\]\s*Speaker\s*([A-Z]):\s*(.*)$/;
    const speakerOnlyPattern = /^Speaker\s*([A-Z]):\s*(.*)$/;

    let currentTime = 0;
    const averageUtteranceDuration = totalDuration > 0 && lines.length > 0 ? totalDuration / lines.length : 10;

    lines.forEach((line, index) => {
      const timestampMatch = line.match(timestampPattern);
      const speakerMatch = line.match(speakerOnlyPattern);

      if (timestampMatch) {
        const minutes = parseInt(timestampMatch[1], 10);
        const seconds = parseInt(timestampMatch[2], 10);
        const speaker = `Speaker ${timestampMatch[3]}`;
        const text = timestampMatch[4].trim();

        currentTime = (minutes * 60 + seconds) * 1000;
        const endTime = currentTime + averageUtteranceDuration * 1000;

        utterances.push({
          speaker,
          text,
          start: currentTime,
          end: endTime,
        });
      } else if (speakerMatch) {
        const speaker = `Speaker ${speakerMatch[1]}`;
        const text = speakerMatch[2].trim();

        const startTime = currentTime;
        const endTime = startTime + averageUtteranceDuration * 1000;
        currentTime = endTime;

        utterances.push({
          speaker,
          text,
          start: startTime,
          end: endTime,
        });
      } else if (line.trim() && utterances.length > 0) {
        utterances[utterances.length - 1].text += " " + line.trim();
      }
    });

    if (utterances.length > 0 && totalDuration > 0) {
      const totalUtteranceTime = utterances.reduce((sum, u) => sum + (u.end - u.start), 0) / 1000;
      if (totalUtteranceTime > totalDuration) {
        const scaleFactor = totalDuration / totalUtteranceTime;
        utterances.forEach((u) => {
          u.start = Math.floor(u.start * scaleFactor);
          u.end = Math.floor(u.end * scaleFactor);
        });
      }
    }

    return utterances;
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
        timestamp: segment.time * 1000,
        score,
        text: segment.text.slice(0, 100),
        speaker: segment.speaker || "Unknown",
      });
    }

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

    const allSegments = utterances.map((u, i) => ({
      text: u.text || "",
      speaker: u.speaker || "Unknown",
      startTime: u.start / 1000,
      endTime: u.end / 1000,
      sentiment: undefined as any,
    }));

    for (const segment of allSegments) {
      const sentimentResult = await this.getRawSentimentScore(segment.text);
      const score = this.convertToScore(sentimentResult);
      segment.sentiment = {
        score,
        magnitude: Math.abs(score),
        label: this.getLabel(score),
      };
    }

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
    const utterancesPerSegment = Math.max(1, Math.floor(utterances.length / numSegments));

    for (let i = 0; i < numSegments; i++) {
      const startIdx = i * utterancesPerSegment;
      const endIdx = Math.min(startIdx + utterancesPerSegment, utterances.length);

      if (startIdx >= utterances.length) break;

      const segmentUtterances = utterances.slice(startIdx, endIdx);
      const segmentText = segmentUtterances.map((u) => u.text || "").join(" ");
      const avgTime = segmentUtterances.reduce((sum, u) => sum + (u.start || 0), 0) / segmentUtterances.length / 1000;

      segments.push({
        time: avgTime,
        text: segmentText,
        speaker: segmentUtterances[0].speaker,
      });
    }

    return segments;
  }

  private async getRawSentimentScore(text: string): Promise<SentimentResult[]> {
    try {
      const response = await withRetry(
        async () => {
          const res = await fetch(this.sentimentApiUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: text }),
          });

          if (!res.ok) {
            throw new Error(`HuggingFace API error: ${res.status}`);
          }

          return res.json();
        },
        { maxRetries: 3, initialDelay: 1000 }
      );

      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error("Sentiment analysis error:", error);
      return [];
    }
  }

  private convertToScore(results: SentimentResult[]): number {
    if (!results || results.length === 0) return 0;

    const sentiment = results.reduce(
      (acc, result) => {
        if (result.label === "POSITIVE") {
          acc.positive += result.score;
        } else if (result.label === "NEGATIVE") {
          acc.negative += result.score;
        }
        return acc;
      },
      { positive: 0, negative: 0 }
    );

    return sentiment.positive - sentiment.negative;
  }

  private getLabel(score: number): "very_positive" | "positive" | "neutral" | "negative" | "very_negative" {
    if (score >= 0.5) return "very_positive";
    if (score >= 0.1) return "positive";
    if (score >= -0.1) return "neutral";
    if (score >= -0.5) return "negative";
    return "very_negative";
  }

  private async getSentimentScoreWithLabel(
    text: string
  ): Promise<{ score: number; magnitude: number; label: SentimentData["overall"]["label"] }> {
    const results = await this.getRawSentimentScore(text);
    const score = this.convertToScore(results);
    const magnitude = Math.abs(score);
    const label = this.getLabel(score);

    return { score, magnitude, label };
  }

  private calculateEngagementScore(
    speakerMetrics: SpeakerMetric[],
    dynamics: ConversationDynamics,
    sentiment: SentimentData
  ): number {
    let score = 50;

    if (speakerMetrics.length > 1) {
      const balance = 100 - Math.abs(50 - speakerMetrics[0].speakingPercentage);
      score += balance * 0.2;
    }

    if (dynamics.turnTaking.frequent) {
      score += 10;
    }

    score -= dynamics.interruptions * 2;

    const sentimentBonus = sentiment.overall.score * 20;
    score += sentimentBonus;

    return Math.max(0, Math.min(100, score));
  }
}
