import { z } from "zod";

export const transcriptSchema = z.object({
  id: z.string(),
  status: z.enum(["queued", "processing", "completed", "error"]),
  text: z.string().nullable(),
  error: z.string().optional(),
  audio_duration: z.number().optional(),
  confidence: z.number().optional(),
  language_code: z.string().optional(),
  language_confidence: z.number().optional(),
  utterances: z
    .array(
      z.object({
        speaker: z.string(),
        text: z.string(),
        start: z.number(),
        end: z.number(),
        confidence: z.number(),
      })
    )
    .optional(),
  words: z
    .array(
      z.object({
        text: z.string(),
        start: z.number(),
        end: z.number(),
        confidence: z.number(),
        speaker: z.string().nullable(),
      })
    )
    .optional(),
});

export type Transcript = z.infer<typeof transcriptSchema>;

export interface TranscriptionOptions {
  audio_url: string;
  webhook_url?: string;
  speaker_labels?: boolean;
  language_detection?: boolean;
  language_code?: string;
}

export class AssemblyAIService {
  private apiKey: string;
  private baseUrl = "https://api.assemblyai.com/v2";

  constructor(apiKey?: string) {
    const key = apiKey || process.env.ASSEMBLYAI_API_KEY;
    if (!key) {
      throw new Error("AssemblyAI API key is required");
    }
    this.apiKey = key;
  }

  async createTranscription(options: TranscriptionOptions): Promise<{ id: string }> {
    const response = await fetch(`${this.baseUrl}/transcript`, {
      method: "POST",
      headers: {
        authorization: this.apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        audio_url: options.audio_url,
        webhook_url: options.webhook_url,
        speaker_labels: options.speaker_labels ?? true,
        language_detection: options.language_detection ?? true,
        language_code: options.language_code,
        auto_chapters: true,
        entity_detection: true,
        sentiment_analysis: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create transcription: ${error}`);
    }

    const data = await response.json();
    return { id: data.id };
  }

  async getTranscription(id: string): Promise<Transcript> {
    const response = await fetch(`${this.baseUrl}/transcript/${id}`, {
      headers: {
        authorization: this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get transcription: ${response.statusText}`);
    }

    const data = await response.json();
    return transcriptSchema.parse(data);
  }

  async waitForTranscription(id: string, maxAttempts = 60, intervalMs = 5000): Promise<Transcript> {
    for (let i = 0; i < maxAttempts; i++) {
      const transcript = await this.getTranscription(id);

      if (transcript.status === "completed" || transcript.status === "error") {
        return transcript;
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error("Transcription timeout");
  }

  extractSpeakers(transcript: Transcript): string[] {
    if (!transcript.utterances) return ["Unknown Speaker"];

    const speakers = new Set<string>();
    transcript.utterances.forEach((utterance) => {
      speakers.add(utterance.speaker);
    });

    return Array.from(speakers).map((speaker) => `Speaker ${speaker}`);
  }

  formatTranscriptText(transcript: Transcript): string {
    if (!transcript.text) return "";

    if (!transcript.utterances || transcript.utterances.length === 0) {
      return transcript.text;
    }

    return transcript.utterances
      .map((utterance) => {
        const speaker = `Speaker ${utterance.speaker}`;
        const timestamp = this.formatTimestamp(utterance.start);
        return `[${timestamp}] ${speaker}: ${utterance.text}`;
      })
      .join("\n\n");
  }

  extractLanguageInfo(transcript: Transcript): { code: string; confidence: number } | null {
    if (!transcript.language_code) return null;

    return {
      code: transcript.language_code,
      confidence: transcript.language_confidence || 0,
    };
  }

  private formatTimestamp(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
}
