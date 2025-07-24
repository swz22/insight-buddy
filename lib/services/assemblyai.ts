import { z } from "zod";

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY!;
const ASSEMBLYAI_BASE_URL = "https://api.assemblyai.com/v2";

export const transcriptSchema = z.object({
  id: z.string(),
  status: z.enum(["queued", "processing", "completed", "error"]),
  text: z.string().nullable(),
  error: z.string().optional(),
  audio_duration: z.number().nullable(),
  words: z
    .array(
      z.object({
        text: z.string(),
        start: z.number(),
        end: z.number(),
        confidence: z.number(),
      })
    )
    .nullable()
    .optional(),
  utterances: z
    .array(
      z.object({
        text: z.string(),
        start: z.number(),
        end: z.number(),
        speaker: z.string(),
      })
    )
    .nullable()
    .optional(),
});

export type TranscriptResponse = z.infer<typeof transcriptSchema>;

interface TranscriptionOptions {
  speaker_labels?: boolean;
  speakers_expected?: number;
  punctuate?: boolean;
  format_text?: boolean;
  disfluencies?: boolean;
  webhook_url?: string;
  webhook_auth_header_name?: string;
  webhook_auth_header_value?: string;
}

export class AssemblyAIService {
  private headers: Record<string, string>;

  constructor(apiKey: string = ASSEMBLYAI_API_KEY) {
    if (!apiKey) {
      throw new Error("AssemblyAI API key is required");
    }
    this.headers = {
      Authorization: apiKey,
      "Content-Type": "application/json",
    };
  }

  async uploadAudio(audioUrl: string): Promise<string> {
    const response = await fetch(`${ASSEMBLYAI_BASE_URL}/upload`, {
      method: "POST",
      headers: {
        Authorization: this.headers.Authorization,
        "Transfer-Encoding": "chunked",
      },
      body: audioUrl,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload audio: ${response.statusText}`);
    }

    const data = await response.json();
    return data.upload_url;
  }

  async createTranscript(audioUrl: string, options: TranscriptionOptions = {}): Promise<TranscriptResponse> {
    const webhookUrl = options.webhook_url || `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/assemblyai`;

    const body = {
      audio_url: audioUrl,
      speaker_labels: options.speaker_labels ?? true,
      punctuate: options.punctuate ?? true,
      format_text: options.format_text ?? true,
      disfluencies: options.disfluencies ?? false,
      webhook_url: webhookUrl,
      ...options,
    };

    const response = await fetch(`${ASSEMBLYAI_BASE_URL}/transcript`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AssemblyAI API error:", response.status, errorText);
      throw new Error(`Failed to create transcript: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("AssemblyAI response status:", data.status);

    // Check if we got an error response
    if (data.status === "error" && data.error) {
      throw new Error(`AssemblyAI error: ${data.error}`);
    }

    return transcriptSchema.parse(data);
  }

  async getTranscript(transcriptId: string): Promise<TranscriptResponse> {
    const response = await fetch(`${ASSEMBLYAI_BASE_URL}/transcript/${transcriptId}`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to get transcript: ${response.statusText}`);
    }

    const data = await response.json();
    return transcriptSchema.parse(data);
  }

  async deleteTranscript(transcriptId: string): Promise<void> {
    const response = await fetch(`${ASSEMBLYAI_BASE_URL}/transcript/${transcriptId}`, {
      method: "DELETE",
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to delete transcript: ${response.statusText}`);
    }
  }

  extractSpeakers(transcript: TranscriptResponse): string[] {
    if (!transcript.utterances) return [];

    const speakers = new Set<string>();
    transcript.utterances.forEach((utterance) => {
      speakers.add(utterance.speaker);
    });

    return Array.from(speakers).map((speaker) => `Speaker ${speaker}`);
  }

  formatTranscriptText(transcript: TranscriptResponse): string {
    if (!transcript.utterances || transcript.utterances.length === 0) {
      return transcript.text || "";
    }

    return transcript.utterances.map((utterance) => `Speaker ${utterance.speaker}: ${utterance.text}`).join("\n\n");
  }
}
