import { z } from "zod";
import type {
  MeetingInsights,
  SpeakerMetrics,
  ConversationDynamics,
  SentimentAnalysis,
  SentimentScore,
  KeyMoment,
  SentimentTimeline,
} from "@/types/meeting-insights";

interface ParsedUtterance {
  speaker: string;
  text: string;
  start: number;
  end: number;
}

export class InsightsService {
  private apiKey: string;
  private baseUrl = "https://api.openai.com/v1";
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeMeeting(
    meetingId: string,
    transcript: { utterances?: any[]; text: string; audio_duration?: number }
  ): Promise<MeetingInsights> {
    try {
      const utterances = this.parseTranscriptToUtterances(transcript.text);
      const totalDuration = transcript.audio_duration || this.estimateDuration(transcript.text);

      // Generate all insights components
      const [speakerMetrics, sentiment, keyMoments] = await Promise.all([
        this.analyzeSpeakerMetrics(utterances, totalDuration),
        this.analyzeSentiment(transcript.text, utterances),
        this.extractKeyMoments(utterances),
      ]);

      const dynamics = this.analyzeConversationDynamics(utterances, speakerMetrics, totalDuration);
      const engagementScore = this.calculateEngagementScore(speakerMetrics, dynamics, sentiment);

      return {
        meeting_id: meetingId,
        speakerMetrics,
        sentiment,
        dynamics,
        keyMoments,
        engagementScore,
        created_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Meeting analysis error:", error);
      throw error;
    }
  }

  private parseTranscriptToUtterances(transcriptText: string): ParsedUtterance[] {
    const utterances: ParsedUtterance[] = [];
    const lines = transcriptText.split("\n").filter((line) => line.trim());

    let currentTime = 0;
    const avgSecondsPerLine = 3; // Estimate if no timestamps

    for (const line of lines) {
      // Match patterns like "[00:23] Speaker A: ..." or "Speaker A: ..."
      const timestampMatch = line.match(/^\[(\d{2}):(\d{2})\]\s*Speaker\s*([A-Z]):\s*(.*)$/);
      const simpleMatch = line.match(/^Speaker\s*([A-Z]):\s*(.*)$/);

      if (timestampMatch) {
        const minutes = parseInt(timestampMatch[1]);
        const seconds = parseInt(timestampMatch[2]);
        currentTime = minutes * 60 + seconds;
        utterances.push({
          speaker: `Speaker ${timestampMatch[3]}`,
          text: timestampMatch[4],
          start: currentTime,
          end: currentTime + avgSecondsPerLine,
        });
      } else if (simpleMatch) {
        utterances.push({
          speaker: `Speaker ${simpleMatch[1]}`,
          text: simpleMatch[2],
          start: currentTime,
          end: currentTime + avgSecondsPerLine,
        });
        currentTime += avgSecondsPerLine;
      }
    }

    return utterances;
  }

  private async analyzeSpeakerMetrics(utterances: ParsedUtterance[], totalDuration: number): Promise<SpeakerMetrics[]> {
    const speakerData = new Map<string, SpeakerMetrics>();

    // Initialize metrics for each speaker
    const speakers = [...new Set(utterances.map((u) => u.speaker))];
    speakers.forEach((speaker) => {
      speakerData.set(speaker, {
        speaker,
        totalDuration: 0,
        speakingPercentage: 0,
        turnCount: 0,
        averageTurnDuration: 0,
        longestTurn: 0,
        interruptions: 0,
        wasInterrupted: 0,
      });
    });

    // Calculate metrics
    for (let i = 0; i < utterances.length; i++) {
      const utterance = utterances[i];
      const metrics = speakerData.get(utterance.speaker)!;
      const duration = utterance.end - utterance.start;

      metrics.totalDuration += duration;
      metrics.turnCount++;
      metrics.longestTurn = Math.max(metrics.longestTurn, duration);

      // Check for interruptions
      if (i > 0) {
        const prevUtterance = utterances[i - 1];
        if (utterance.start < prevUtterance.end && utterance.speaker !== prevUtterance.speaker) {
          metrics.interruptions++;
          const prevMetrics = speakerData.get(prevUtterance.speaker)!;
          prevMetrics.wasInterrupted++;
        }
      }
    }

    // Calculate final percentages and averages
    const metricsArray = Array.from(speakerData.values());
    metricsArray.forEach((metrics) => {
      metrics.speakingPercentage = (metrics.totalDuration / totalDuration) * 100;
      metrics.averageTurnDuration = metrics.turnCount > 0 ? metrics.totalDuration / metrics.turnCount : 0;
    });

    return metricsArray;
  }

  private async analyzeSentiment(text: string, utterances: ParsedUtterance[]): Promise<SentimentAnalysis> {
    const systemPrompt = `You are a sentiment analysis expert. Analyze the emotional tone of meeting conversations.

For each text segment, provide a sentiment score from -1 (very negative) to 1 (very positive).

Response format must be valid JSON:
{
  "segments": [
    {
      "text": "segment text",
      "score": 0.5,
      "label": "positive"
    }
  ],
  "overall_score": 0.3,
  "overall_label": "neutral"
}

Labels: very_negative (-1 to -0.6), negative (-0.6 to -0.2), neutral (-0.2 to 0.2), positive (0.2 to 0.6), very_positive (0.6 to 1)`;

    try {
      // Analyze in chunks to avoid token limits
      const chunks = this.chunkUtterances(utterances, 10);
      const sentimentResults = await Promise.all(
        chunks.map((chunk) => this.analyzeSentimentChunk(chunk, systemPrompt))
      );

      // Aggregate results
      const timeline: SentimentTimeline[] = [];
      const bySpeaker: Record<string, SentimentScore> = {};

      sentimentResults.forEach((result, chunkIndex) => {
        result.segments.forEach((segment, segmentIndex) => {
          const utterance = chunks[chunkIndex][segmentIndex];
          timeline.push({
            timestamp: utterance.start * 1000, // Convert to milliseconds
            score: segment.score,
            text: segment.text,
            speaker: utterance.speaker,
          });

          // Update speaker sentiment
          if (!bySpeaker[utterance.speaker]) {
            bySpeaker[utterance.speaker] = {
              score: 0,
              magnitude: 0,
              label: "neutral",
            };
          }
          const speakerScores = timeline.filter((t) => t.speaker === utterance.speaker).map((t) => t.score);
          bySpeaker[utterance.speaker].score = speakerScores.reduce((a, b) => a + b, 0) / speakerScores.length;
          bySpeaker[utterance.speaker].label = this.getScoreLabel(bySpeaker[utterance.speaker].score);
        });
      });

      // Calculate overall sentiment
      const allScores = timeline.map((t) => t.score);
      const overallScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;

      // Find top positive and negative segments
      const sortedTimeline = [...timeline].sort((a, b) => b.score - a.score);
      const topPositive = sortedTimeline.slice(0, 3);
      const topNegative = sortedTimeline.slice(-3).reverse();

      return {
        overall: {
          score: overallScore,
          magnitude: Math.abs(overallScore),
          label: this.getScoreLabel(overallScore),
        },
        timeline,
        bySpeaker,
        topPositiveSegments: topPositive.map((t) => ({
          text: t.text,
          speaker: t.speaker,
          startTime: t.timestamp / 1000,
          endTime: t.timestamp / 1000 + 3,
          sentiment: {
            score: t.score,
            magnitude: Math.abs(t.score),
            label: this.getScoreLabel(t.score),
          },
        })),
        topNegativeSegments: topNegative.map((t) => ({
          text: t.text,
          speaker: t.speaker,
          startTime: t.timestamp / 1000,
          endTime: t.timestamp / 1000 + 3,
          sentiment: {
            score: t.score,
            magnitude: Math.abs(t.score),
            label: this.getScoreLabel(t.score),
          },
        })),
      };
    } catch (error) {
      console.error("Sentiment analysis failed:", error);
      // Return neutral sentiment as fallback
      return {
        overall: { score: 0, magnitude: 0, label: "neutral" },
        timeline: [],
        bySpeaker: {},
        topPositiveSegments: [],
        topNegativeSegments: [],
      };
    }
  }

  private async analyzeSentimentChunk(
    utterances: ParsedUtterance[],
    systemPrompt: string
  ): Promise<{ segments: { text: string; score: number; label: string }[]; overall_score: number }> {
    const userPrompt = `Analyze the sentiment of these conversation segments:\n\n${utterances
      .map((u, i) => `${i + 1}. ${u.speaker}: "${u.text}"`)
      .join("\n")}`;

    const response = await this.callOpenAI<any>({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    return response;
  }

  private analyzeConversationDynamics(
    utterances: ParsedUtterance[],
    speakerMetrics: SpeakerMetrics[],
    totalDuration: number
  ): ConversationDynamics {
    const interruptions = speakerMetrics.reduce((sum, m) => sum + m.interruptions, 0);
    const avgTurnDuration = speakerMetrics.reduce((sum, m) => sum + m.averageTurnDuration, 0) / speakerMetrics.length;

    // Calculate speaker balance (0 = perfectly balanced, 1 = completely dominated)
    const percentages = speakerMetrics.map((m) => m.speakingPercentage);
    const maxPercentage = Math.max(...percentages);
    const minPercentage = Math.min(...percentages);
    const speakerBalance = (maxPercentage - minPercentage) / 100;

    // Find most and least active speakers
    const sortedBySpeaking = [...speakerMetrics].sort((a, b) => b.totalDuration - a.totalDuration);
    const mostDominant = sortedBySpeaking[0];
    const leastActive = sortedBySpeaking[sortedBySpeaking.length - 1];

    // Extract interruption events
    const interruptionEvents = [];
    for (let i = 1; i < utterances.length; i++) {
      const current = utterances[i];
      const previous = utterances[i - 1];

      if (current.start < previous.end && current.speaker !== previous.speaker) {
        interruptionEvents.push({
          interrupter: current.speaker,
          interrupted: previous.speaker,
          timestamp: current.start,
          duration: previous.end - current.start,
          context: current.text.slice(0, 50) + "...",
        });
      }
    }

    return {
      totalInterruptions: interruptions,
      interruptionRate: totalDuration > 0 ? (interruptions / totalDuration) * 60 : 0, // per minute
      averageTurnDuration: avgTurnDuration,
      speakerBalance,
      mostDominantSpeaker: mostDominant.speaker,
      leastActiveSpeaker: leastActive.speaker,
      interruptionEvents,
    };
  }

  private async extractKeyMoments(utterances: ParsedUtterance[]): Promise<KeyMoment[]> {
    const systemPrompt = `You are an expert at identifying key moments in meetings.

Identify important moments such as:
- Decisions made
- Action items assigned
- Concerns or risks raised
- Topic shifts
- High engagement discussions

Response must be valid JSON array:
[
  {
    "type": "decision_point",
    "description": "Team decided to...",
    "speaker": "Speaker A",
    "importance": 0.8
  }
]

Types: high_engagement, topic_shift, decision_point, action_item, concern_raised`;

    try {
      const chunks = this.chunkUtterances(utterances, 20);
      const allMoments: KeyMoment[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const userPrompt = `Identify key moments in this conversation:\n\n${chunk
          .map((u, idx) => `${u.speaker}: "${u.text}"`)
          .join("\n")}`;

        const response = await this.callOpenAI<any[]>({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.4,
          max_tokens: 800,
        });

        if (Array.isArray(response)) {
          response.forEach((moment) => {
            const utteranceIndex = chunk.findIndex((u) => u.speaker === moment.speaker);
            if (utteranceIndex >= 0) {
              allMoments.push({
                type: moment.type,
                timestamp: chunk[utteranceIndex].start * 1000,
                description: moment.description,
                participants: [moment.speaker],
                sentiment: {
                  score: 0,
                  magnitude: 0,
                  label: "neutral",
                },
              });
            }
          });
        }
      }

      // Sort by timestamp and return top moments
      return allMoments.sort((a, b) => a.timestamp - b.timestamp).slice(0, 10);
    } catch (error) {
      console.error("Key moments extraction failed:", error);
      return [];
    }
  }

  private calculateEngagementScore(
    speakerMetrics: SpeakerMetrics[],
    dynamics: ConversationDynamics,
    sentiment: SentimentAnalysis
  ): number {
    // Factors that contribute to engagement:
    // 1. Balanced participation (lower speaker balance = higher engagement)
    const balanceScore = 1 - dynamics.speakerBalance;

    // 2. Active conversation (more turns = higher engagement)
    const totalTurns = speakerMetrics.reduce((sum, m) => sum + m.turnCount, 0);
    const turnScore = Math.min(totalTurns / 50, 1); // Normalize to 0-1

    // 3. Positive sentiment
    const sentimentScore = (sentiment.overall.score + 1) / 2; // Convert -1 to 1 range to 0-1

    // 4. Reasonable interruption rate (some interruptions show engagement, too many show chaos)
    const interruptionScore = dynamics.interruptionRate < 0.5 ? 0.8 : dynamics.interruptionRate < 2 ? 0.6 : 0.3;

    // Weighted average
    const engagementScore = balanceScore * 0.3 + turnScore * 0.3 + sentimentScore * 0.2 + interruptionScore * 0.2;

    return Math.round(engagementScore * 100); // Return as percentage
  }

  private async callOpenAI<T>(params: {
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    max_tokens?: number;
  }): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: params.messages,
            temperature: params.temperature ?? 0.3,
            max_tokens: params.max_tokens ?? 1000,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`OpenAI API error (${response.status}): ${error}`);
        }

        const data = await response.json();

        if (!data.choices || data.choices.length === 0) {
          throw new Error("No response from OpenAI");
        }

        const content = data.choices[0].message.content;

        try {
          return JSON.parse(content) as T;
        } catch (parseError) {
          const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]) as T;
          }
          throw new Error("Failed to parse OpenAI response as JSON");
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown error");
        console.error(`OpenAI API attempt ${attempt + 1} failed:`, error);

        if (attempt < this.maxRetries - 1) {
          await this.delay(this.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError || new Error("Failed to call OpenAI API");
  }

  private chunkUtterances(utterances: ParsedUtterance[], chunkSize: number): ParsedUtterance[][] {
    const chunks: ParsedUtterance[][] = [];
    for (let i = 0; i < utterances.length; i += chunkSize) {
      chunks.push(utterances.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private getScoreLabel(score: number): SentimentScore["label"] {
    if (score >= 0.6) return "very_positive";
    if (score >= 0.2) return "positive";
    if (score >= -0.2) return "neutral";
    if (score >= -0.6) return "negative";
    return "very_negative";
  }

  private estimateDuration(text: string): number {
    // Estimate ~150 words per minute speaking rate
    const words = text.split(/\s+/).length;
    return (words / 150) * 60;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
