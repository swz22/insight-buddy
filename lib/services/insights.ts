import { z } from "zod";
import { withRetry } from "@/lib/utils/retry";
import type {
  MeetingInsights,
  SpeakerMetrics,
  ConversationDynamics,
  InterruptionEvent,
  SentimentAnalysis,
  SentimentScore,
  TranscriptSegment,
} from "@/types/meeting-insights";

interface SentimentResult {
  label: string;
  score: number;
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
      const dynamics = this.analyzeConversationDynamics(utterances, speakerMetrics, totalDuration);
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

    const timestampPattern = /^\[(\d{2}):(\d{2})\]\s*Speaker\s*([A-Za-z])[:\s]+(.*)$/i;
    const speakerOnlyPattern = /^Speaker\s*([A-Za-z])[:\s]+(.*)$/i;
    const colonPattern = /^([A-Za-z]):\s*(.*)$/;

    let currentTime = 0;
    const averageUtteranceDuration = totalDuration > 0 && lines.length > 0 ? totalDuration / lines.length : 10;

    const speakersFound = new Set<string>();

    lines.forEach((line, index) => {
      let speaker = "";
      let text = "";
      let hasTimestamp = false;

      const timestampMatch = line.match(timestampPattern);
      if (timestampMatch) {
        const minutes = parseInt(timestampMatch[1], 10);
        const seconds = parseInt(timestampMatch[2], 10);
        const speakerLetter = timestampMatch[3].toUpperCase();
        speaker = `Speaker ${speakerLetter}`;
        text = timestampMatch[4].trim();
        currentTime = (minutes * 60 + seconds) * 1000;
        hasTimestamp = true;
        speakersFound.add(speakerLetter);
      } else {
        const speakerMatch = line.match(speakerOnlyPattern);
        if (speakerMatch) {
          const speakerLetter = speakerMatch[1].toUpperCase();
          speaker = `Speaker ${speakerLetter}`;
          text = speakerMatch[2].trim();
          speakersFound.add(speakerLetter);
        } else {
          const colonMatch = line.match(colonPattern);
          if (colonMatch && colonMatch[1].length === 1) {
            const speakerLetter = colonMatch[1].toUpperCase();
            speaker = `Speaker ${speakerLetter}`;
            text = colonMatch[2].trim();
            speakersFound.add(speakerLetter);
          } else if (utterances.length > 0) {
            utterances[utterances.length - 1].text += " " + line.trim();
            return;
          }
        }
      }

      if (speaker && text) {
        const startTime = currentTime;
        const endTime = startTime + averageUtteranceDuration * 1000;

        if (!hasTimestamp) {
          currentTime = endTime;
        }

        utterances.push({
          speaker,
          text,
          start: startTime,
          end: endTime,
        });
      }
    });

    if (utterances.length > 0 && totalDuration > 0) {
      const totalUtteranceTime = utterances.reduce((sum, u) => sum + (u.end - u.start), 0) / 1000;
      if (totalUtteranceTime !== totalDuration) {
        const scaleFactor = totalDuration / totalUtteranceTime;
        utterances.forEach((u) => {
          u.start = Math.floor(u.start * scaleFactor);
          u.end = Math.floor(u.end * scaleFactor);
        });
      }
    }

    console.log(
      `Parsed ${utterances.length} utterances from ${speakersFound.size} speakers:`,
      Array.from(speakersFound)
    );

    return utterances;
  }

  private calculateSpeakerMetrics(utterances: any[], totalDuration: number): SpeakerMetrics[] {
    const speakerStats = new Map<
      string,
      {
        totalDuration: number;
        turns: number[];
        interruptions: number;
        wasInterrupted: number;
      }
    >();

    utterances.forEach((utterance) => {
      const speaker = utterance.speaker || "Unknown";
      if (!speakerStats.has(speaker)) {
        speakerStats.set(speaker, {
          totalDuration: 0,
          turns: [],
          interruptions: 0,
          wasInterrupted: 0,
        });
      }

      const duration = (utterance.end - utterance.start) / 1000;
      const stats = speakerStats.get(speaker)!;
      stats.totalDuration += duration;
      stats.turns.push(duration);
    });

    for (let i = 1; i < utterances.length; i++) {
      const prev = utterances[i - 1];
      const curr = utterances[i];

      if (curr.start < prev.end) {
        const currSpeaker = curr.speaker || "Unknown";
        const prevSpeaker = prev.speaker || "Unknown";

        if (currSpeaker !== prevSpeaker) {
          speakerStats.get(currSpeaker)!.interruptions++;
          speakerStats.get(prevSpeaker)!.wasInterrupted++;
        }
      }
    }

    const metrics: SpeakerMetrics[] = [];
    speakerStats.forEach((stats, speaker) => {
      const avgTurnDuration = stats.turns.length > 0 ? stats.totalDuration / stats.turns.length : 0;
      const longestTurn = stats.turns.length > 0 ? Math.max(...stats.turns) : 0;

      metrics.push({
        speaker,
        totalDuration: Math.round(stats.totalDuration),
        speakingPercentage: totalDuration > 0 ? Math.round((stats.totalDuration / totalDuration) * 100) : 0,
        turnCount: stats.turns.length,
        averageTurnDuration: Math.round(avgTurnDuration),
        longestTurn: Math.round(longestTurn),
        interruptions: stats.interruptions,
        wasInterrupted: stats.wasInterrupted,
      });
    });

    return metrics.sort((a, b) => b.totalDuration - a.totalDuration);
  }

  private analyzeConversationDynamics(
    utterances: any[],
    speakerMetrics: SpeakerMetrics[],
    totalDuration: number
  ): ConversationDynamics {
    if (utterances.length === 0 || speakerMetrics.length === 0) {
      return {
        totalInterruptions: 0,
        interruptionRate: 0,
        averageTurnDuration: 0,
        speakerBalance: 0,
        mostDominantSpeaker: "Unknown",
        leastActiveSpeaker: "Unknown",
        interruptionEvents: [],
      };
    }

    const interruptionEvents: InterruptionEvent[] = [];
    let totalInterruptions = 0;

    for (let i = 1; i < utterances.length; i++) {
      const prev = utterances[i - 1];
      const curr = utterances[i];

      if (curr.start < prev.end && curr.speaker !== prev.speaker) {
        totalInterruptions++;
        const overlapDuration = (prev.end - curr.start) / 1000;

        interruptionEvents.push({
          interrupter: curr.speaker || "Unknown",
          interrupted: prev.speaker || "Unknown",
          timestamp: curr.start,
          duration: overlapDuration,
          context: curr.text ? curr.text.substring(0, 50) + "..." : "",
        });
      }
    }

    const totalMinutes = totalDuration / 60;
    const interruptionRate = totalMinutes > 0 ? totalInterruptions / totalMinutes : 0;

    const totalTurns = utterances.length;
    const averageTurnDuration = totalTurns > 0 ? totalDuration / totalTurns : 0;

    const sortedPercentages = speakerMetrics.map((m) => m.speakingPercentage).sort((a, b) => a - b);
    let cumulativeSum = 0;
    let giniSum = 0;

    sortedPercentages.forEach((percentage, i) => {
      cumulativeSum += percentage;
      giniSum += cumulativeSum;
    });

    const speakerBalance =
      speakerMetrics.length > 1
        ? 1 - (2 * giniSum) / (speakerMetrics.length * sortedPercentages.reduce((a, b) => a + b, 0))
        : 1;

    const mostDominantSpeaker = speakerMetrics[0]?.speaker || "Unknown";
    const leastActiveSpeaker = speakerMetrics[speakerMetrics.length - 1]?.speaker || "Unknown";

    return {
      totalInterruptions,
      interruptionRate: Math.round(interruptionRate * 10) / 10,
      averageTurnDuration: Math.round(averageTurnDuration),
      speakerBalance: Math.max(0, Math.min(1, speakerBalance)),
      mostDominantSpeaker,
      leastActiveSpeaker,
      interruptionEvents,
    };
  }

  private async analyzeSentiment(text: string, utterances: any[]): Promise<SentimentAnalysis> {
    const overall = await this.getSentimentScoreWithLabel(text);

    const timeline: SentimentAnalysis["timeline"] = [];
    const segments = this.createTextSegments(utterances, Math.min(10, utterances.length));

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

    const bySpeaker: SentimentAnalysis["bySpeaker"] = {};
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
      if (speakerText.trim()) {
        bySpeaker[speaker] = await this.getSentimentScoreWithLabel(speakerText);
      }
    }

    const allSegments = utterances.map((u, i) => ({
      text: u.text || "",
      speaker: u.speaker || "Unknown",
      startTime: u.start / 1000,
      endTime: u.end / 1000,
      sentiment: undefined as any,
    }));

    for (const segment of allSegments) {
      if (segment.text.trim()) {
        const sentimentResult = await this.getRawSentimentScore(segment.text);
        const score = this.convertToScore(sentimentResult);
        segment.sentiment = {
          score,
          magnitude: Math.abs(score),
          label: this.getLabel(score),
        };
      }
    }

    const sortedSegments = [...allSegments].sort((a, b) => (b.sentiment?.score || 0) - (a.sentiment?.score || 0));

    const topPositiveSegments = sortedSegments.filter((s) => s.sentiment && s.sentiment.score > 0).slice(0, 3);
    const topNegativeSegments = sortedSegments.filter((s) => s.sentiment && s.sentiment.score < 0).slice(0, 3);

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
    const segmentSize = Math.max(1, Math.floor(utterances.length / numSegments));

    for (let i = 0; i < utterances.length; i += segmentSize) {
      const end = Math.min(i + segmentSize, utterances.length);
      const segmentUtterances = utterances.slice(i, end);

      if (segmentUtterances.length > 0) {
        const avgTime = segmentUtterances.reduce((sum, u) => sum + u.start, 0) / segmentUtterances.length / 1000;
        const text = segmentUtterances.map((u) => u.text || "").join(" ");
        const speakers = [...new Set(segmentUtterances.map((u) => u.speaker))];
        const speaker = speakers.length === 1 ? speakers[0] : "Multiple";

        segments.push({ time: avgTime, text, speaker });
      }
    }

    return segments;
  }

  private async getRawSentimentScore(text: string): Promise<SentimentResult[]> {
    if (!text || text.trim().length < 3) {
      return [{ label: "NEUTRAL", score: 0.5 }];
    }

    try {
      const response = await withRetry(
        async () => {
          const res = await fetch(this.sentimentApiUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: text.slice(0, 512) }),
          });

          if (!res.ok && (res.status === 503 || res.status === 429)) {
            throw new Error(`API returned ${res.status}`);
          }

          return res;
        },
        {
          maxRetries: 2,
          initialDelay: 1000,
        }
      );

      if (!response.ok) {
        console.error("Sentiment API error:", response.status);
        return [{ label: "NEUTRAL", score: 0.5 }];
      }

      const results = await response.json();
      return Array.isArray(results) && results.length > 0 && Array.isArray(results[0]) ? results[0] : results;
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
  ): Promise<{ score: number; magnitude: number; label: SentimentAnalysis["overall"]["label"] }> {
    const results = await this.getRawSentimentScore(text);
    const score = this.convertToScore(results);
    const magnitude = Math.abs(score);
    const label = this.getLabel(score);

    return { score, magnitude, label };
  }

  private calculateEngagementScore(
    speakerMetrics: SpeakerMetrics[],
    dynamics: ConversationDynamics,
    sentiment: SentimentAnalysis
  ): number {
    let score = 50;

    score += dynamics.speakerBalance * 20;

    if (dynamics.averageTurnDuration > 10 && dynamics.averageTurnDuration < 60) {
      score += 10;
    } else if (dynamics.averageTurnDuration >= 5 && dynamics.averageTurnDuration <= 90) {
      score += 5;
    }

    score -= Math.min(20, dynamics.interruptionRate * 4);

    const sentimentBonus = sentiment.overall.score * 20;
    score += sentimentBonus;

    return Math.max(0, Math.min(100, Math.round(score)));
  }
}
