import { Transcript } from "@/lib/services/assemblyai";
import {
  MeetingInsights,
  SpeakerMetrics,
  SentimentAnalysis,
  ConversationDynamics,
  InterruptionEvent,
  KeyMoment,
  SentimentScore,
  TranscriptSegment,
} from "@/types/meeting-insights";

export class InsightsService {
  private apiKey: string;
  private sentimentApiUrl =
    "https://api-inference.huggingface.co/models/nlptown/bert-base-multilingual-uncased-sentiment";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeMeeting(meetingId: string, transcript: Transcript): Promise<MeetingInsights> {
    if (!transcript.utterances || transcript.utterances.length === 0) {
      throw new Error("No utterances found in transcript");
    }

    const speakerMetrics = this.calculateSpeakerMetrics(transcript);
    const sentiment = await this.analyzeSentiment(transcript);
    const dynamics = this.analyzeConversationDynamics(transcript, speakerMetrics);
    const keyMoments = this.identifyKeyMoments(transcript, sentiment);
    const engagementScore = this.calculateEngagementScore(speakerMetrics, sentiment, dynamics);

    return {
      id: crypto.randomUUID(),
      meetingId,
      speakerMetrics,
      sentiment,
      dynamics,
      keyMoments,
      engagementScore,
      generatedAt: new Date().toISOString(),
    };
  }

  private calculateSpeakerMetrics(transcript: Transcript): SpeakerMetrics[] {
    const speakerMap = new Map<string, SpeakerMetrics>();
    const interruptions = this.detectInterruptions(transcript);

    transcript.utterances?.forEach((utterance) => {
      const speaker = `Speaker ${utterance.speaker}`;
      const duration = (utterance.end - utterance.start) / 1000;

      if (!speakerMap.has(speaker)) {
        speakerMap.set(speaker, {
          speaker,
          totalDuration: 0,
          speakingPercentage: 0,
          turnCount: 0,
          averageTurnDuration: 0,
          longestTurn: 0,
          interruptions: 0,
          wasInterrupted: 0,
        });
      }

      const metrics = speakerMap.get(speaker)!;
      metrics.totalDuration += duration;
      metrics.turnCount += 1;
      metrics.longestTurn = Math.max(metrics.longestTurn, duration);
    });

    interruptions.forEach((event) => {
      const interrupterMetrics = speakerMap.get(event.interrupter);
      const interruptedMetrics = speakerMap.get(event.interrupted);

      if (interrupterMetrics) interrupterMetrics.interruptions += 1;
      if (interruptedMetrics) interruptedMetrics.wasInterrupted += 1;
    });

    const totalDuration = Array.from(speakerMap.values()).reduce((sum, m) => sum + m.totalDuration, 0);

    const metricsArray = Array.from(speakerMap.values()).map((metrics) => ({
      ...metrics,
      speakingPercentage: (metrics.totalDuration / totalDuration) * 100,
      averageTurnDuration: metrics.totalDuration / metrics.turnCount,
    }));

    return metricsArray.sort((a, b) => b.totalDuration - a.totalDuration);
  }

  private async analyzeSentiment(transcript: Transcript): Promise<SentimentAnalysis> {
    const timeline = [];
    const bySpeaker: Record<string, SentimentScore> = {};
    const segments: TranscriptSegment[] = [];

    for (const utterance of transcript.utterances || []) {
      const speaker = `Speaker ${utterance.speaker}`;
      const sentiment = await this.getSentimentScore(utterance.text);

      const segment: TranscriptSegment = {
        text: utterance.text,
        speaker,
        startTime: utterance.start,
        endTime: utterance.end,
        sentiment,
      };

      segments.push(segment);

      timeline.push({
        timestamp: utterance.start,
        score: sentiment.score,
        text: utterance.text.slice(0, 100),
        speaker,
      });

      if (!bySpeaker[speaker]) {
        bySpeaker[speaker] = { score: 0, magnitude: 0, label: "neutral" as const };
      }

      const currentSpeaker = bySpeaker[speaker];
      currentSpeaker.score = (currentSpeaker.score + sentiment.score) / 2;
      currentSpeaker.magnitude = (currentSpeaker.magnitude + sentiment.magnitude) / 2;
      currentSpeaker.label = this.getScoreLabel(currentSpeaker.score);
    }

    const overallScore = timeline.reduce((sum, t) => sum + t.score, 0) / timeline.length;
    const overallMagnitude = segments.reduce((sum, s) => sum + (s.sentiment?.magnitude || 0), 0) / segments.length;

    const sortedSegments = [...segments].sort((a, b) => (b.sentiment?.score || 0) - (a.sentiment?.score || 0));
    const topPositiveSegments = sortedSegments.slice(0, 5);
    const topNegativeSegments = sortedSegments.slice(-5).reverse();

    return {
      overall: {
        score: overallScore,
        magnitude: overallMagnitude,
        label: this.getScoreLabel(overallScore),
      },
      timeline,
      bySpeaker,
      topPositiveSegments,
      topNegativeSegments,
    };
  }

  private async getSentimentScore(text: string): Promise<SentimentScore> {
    try {
      const response = await fetch(this.sentimentApiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: text }),
      });

      if (!response.ok) {
        throw new Error("Sentiment analysis failed");
      }

      const results = await response.json();
      const scores = results[0];

      const weightedScore = scores.reduce((sum: number, item: any) => {
        const stars = parseInt(item.label.split(" ")[0]);
        return sum + stars * item.score;
      }, 0);

      const normalizedScore = (weightedScore - 3) / 2;
      const magnitude = Math.abs(normalizedScore);

      return {
        score: normalizedScore,
        magnitude,
        label: this.getScoreLabel(normalizedScore),
      };
    } catch (error) {
      console.error("Sentiment analysis error:", error);
      return { score: 0, magnitude: 0, label: "neutral" };
    }
  }

  private getScoreLabel(score: number): SentimentScore["label"] {
    if (score >= 0.5) return "very_positive";
    if (score >= 0.1) return "positive";
    if (score >= -0.1) return "neutral";
    if (score >= -0.5) return "negative";
    return "very_negative";
  }

  private detectInterruptions(transcript: Transcript): InterruptionEvent[] {
    const interruptions: InterruptionEvent[] = [];
    const utterances = transcript.utterances || [];

    for (let i = 1; i < utterances.length; i++) {
      const current = utterances[i];
      const previous = utterances[i - 1];

      const overlap = previous.end - current.start;
      if (overlap > 500 && current.speaker !== previous.speaker) {
        interruptions.push({
          interrupter: `Speaker ${current.speaker}`,
          interrupted: `Speaker ${previous.speaker}`,
          timestamp: current.start,
          duration: overlap,
          context: current.text.slice(0, 50) + "...",
        });
      }
    }

    return interruptions;
  }

  private analyzeConversationDynamics(transcript: Transcript, speakerMetrics: SpeakerMetrics[]): ConversationDynamics {
    const interruptions = this.detectInterruptions(transcript);
    const totalDuration = (transcript.audio_duration || 0) * 1000;
    const interruptionRate = interruptions.length / (totalDuration / 60000) || 0;

    const durations = speakerMetrics.map((m) => m.totalDuration);
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);
    const speakerBalance = minDuration / maxDuration;

    const averageTurnDuration =
      speakerMetrics.reduce((sum, m) => sum + m.averageTurnDuration, 0) / speakerMetrics.length;

    const mostDominantSpeaker = speakerMetrics[0]?.speaker || "Unknown";
    const leastActiveSpeaker = speakerMetrics[speakerMetrics.length - 1]?.speaker || "Unknown";

    return {
      totalInterruptions: interruptions.length,
      interruptionRate,
      averageTurnDuration,
      speakerBalance,
      mostDominantSpeaker,
      leastActiveSpeaker,
      interruptionEvents: interruptions,
    };
  }

  private identifyKeyMoments(transcript: Transcript, sentiment: SentimentAnalysis): KeyMoment[] {
    const keyMoments: KeyMoment[] = [];
    const utterances = transcript.utterances || [];

    sentiment.timeline.forEach((point, index) => {
      if (index > 0) {
        const prevPoint = sentiment.timeline[index - 1];
        const sentimentShift = Math.abs(point.score - prevPoint.score);

        if (sentimentShift > 0.5) {
          keyMoments.push({
            type: "topic_shift",
            timestamp: point.timestamp,
            description: "Significant sentiment shift detected",
            participants: [point.speaker],
            sentiment: {
              score: point.score,
              magnitude: sentimentShift,
              label: this.getScoreLabel(point.score),
            },
          });
        }
      }

      if (point.score < -0.5) {
        keyMoments.push({
          type: "concern_raised",
          timestamp: point.timestamp,
          description: "Negative sentiment detected",
          participants: [point.speaker],
          sentiment: {
            score: point.score,
            magnitude: Math.abs(point.score),
            label: this.getScoreLabel(point.score),
          },
        });
      }
    });

    return keyMoments.sort((a, b) => a.timestamp - b.timestamp);
  }

  private calculateEngagementScore(
    speakerMetrics: SpeakerMetrics[],
    sentiment: SentimentAnalysis,
    dynamics: ConversationDynamics
  ): number {
    const balanceScore = dynamics.speakerBalance * 30;
    const sentimentScore = ((sentiment.overall.score + 1) / 2) * 30;
    const participationScore = Math.min(speakerMetrics.length / 5, 1) * 20;
    const interruptionPenalty = Math.max(0, 20 - dynamics.interruptionRate * 2);

    return Math.round(balanceScore + sentimentScore + participationScore + interruptionPenalty);
  }
}
