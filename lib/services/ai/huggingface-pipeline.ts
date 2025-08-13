import { MeetingSummary, ActionItem } from "@/types/supabase";

interface ProcessedTranscript {
  speakers: string[];
  segments: TranscriptSegment[];
  wordCount: number;
  duration: number;
}

interface TranscriptSegment {
  speaker: string;
  text: string;
  start: number;
  end: number;
}

interface HFResponse {
  generated_text?: string;
  summary_text?: string;
  error?: string;
  message?: string;
}

class ApiUsageTracker {
  private static instance: ApiUsageTracker;
  private count: number = 0;
  private month: number = new Date().getMonth();
  private readonly limit = 30000;

  static getInstance(): ApiUsageTracker {
    if (!ApiUsageTracker.instance) {
      ApiUsageTracker.instance = new ApiUsageTracker();
    }
    return ApiUsageTracker.instance;
  }

  canMakeRequest(): boolean {
    const currentMonth = new Date().getMonth();
    if (currentMonth !== this.month) {
      this.count = 0;
      this.month = currentMonth;
    }
    return this.count < this.limit;
  }

  incrementCount(): void {
    this.count++;
  }

  getUsage(): { count: number; limit: number; month: number } {
    return { count: this.count, limit: this.limit, month: this.month };
  }
}

export class HuggingFacePipeline {
  private apiKey: string;
  private usageTracker: ApiUsageTracker;

  private readonly models = {
    summarization: "facebook/bart-large-cnn",
    zeroShot: "facebook/bart-large-mnli",
    textGeneration: "mistralai/Mistral-7B-Instruct-v0.1",
  };

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.usageTracker = ApiUsageTracker.getInstance();
  }

  async processTranscript(transcript: string): Promise<ProcessedTranscript> {
    const lines = transcript.split("\n").filter((line) => line.trim());
    const speakers = new Set<string>();
    const segments: TranscriptSegment[] = [];
    let totalWords = 0;

    lines.forEach((line, index) => {
      const speakerMatch = line.match(/^([^:]+):/);
      if (speakerMatch) {
        const speaker = speakerMatch[1].trim();
        const text = line.substring(speakerMatch[0].length).trim();
        speakers.add(speaker);
        segments.push({
          speaker,
          text,
          start: index * 10,
          end: (index + 1) * 10,
        });
        totalWords += text.split(/\s+/).length;
      } else if (line.trim() && segments.length > 0) {
        segments[segments.length - 1].text += " " + line.trim();
        totalWords += line.trim().split(/\s+/).length;
      }
    });

    return {
      speakers: Array.from(speakers),
      segments,
      wordCount: totalWords,
      duration: segments.length * 10,
    };
  }

  async generateStructuredSummary(
    transcript: string,
    processedTranscript: ProcessedTranscript
  ): Promise<MeetingSummary> {
    if (!this.usageTracker.canMakeRequest()) {
      console.log("Hugging Face API limit reached, using fallback summary");
      return this.generateFallbackSummary(transcript, processedTranscript);
    }

    try {
      const chunks = this.chunkTranscript(transcript, 800);
      const summaryPromises = chunks.map((chunk) => this.callHuggingFaceAPI(this.models.summarization, chunk));

      const summaries = await Promise.all(summaryPromises);
      const combinedSummary = summaries
        .filter((s) => s && typeof s === "string")
        .join(" ")
        .trim();

      if (!combinedSummary) {
        return this.generateFallbackSummary(transcript, processedTranscript);
      }

      const structuredSummary = await this.extractStructuredElements(combinedSummary, transcript);
      this.usageTracker.incrementCount();

      return structuredSummary;
    } catch (error) {
      console.error("Summary generation failed:", error);
      return this.generateFallbackSummary(transcript, processedTranscript);
    }
  }

  async generateActionItems(
    transcript: string,
    processedTranscript: ProcessedTranscript,
    summary: MeetingSummary
  ): Promise<ActionItem[]> {
    if (!this.usageTracker.canMakeRequest()) {
      return this.extractActionItemsFromText(transcript);
    }

    try {
      const prompt = `Extract action items from this meeting summary. For each action item, identify:
1. The specific task
2. Who it's assigned to (if mentioned)
3. Priority level (high/medium/low)

Meeting Summary:
${summary.overview}

Key Points:
${summary.key_points.join("\n")}

Next Steps:
${summary.next_steps.join("\n")}

Format: List each action item clearly.`;

      const response = await this.callHuggingFaceAPI(this.models.textGeneration, prompt, {
        max_new_tokens: 300,
        temperature: 0.3,
      });

      const actionItems = this.parseActionItemsResponse(response || "");
      this.usageTracker.incrementCount();

      return actionItems.length > 0 ? actionItems : this.extractActionItemsFromText(transcript);
    } catch (error) {
      console.error("Action items generation failed:", error);
      return this.extractActionItemsFromText(transcript);
    }
  }

  private async callHuggingFaceAPI(
    model: string,
    inputs: string,
    parameters: Record<string, any> = {}
  ): Promise<string | null> {
    try {
      const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs, parameters }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`HF API error (${response.status}):`, error);
        return null;
      }

      const data = (await response.json()) as HFResponse | HFResponse[];

      if (Array.isArray(data)) {
        return data[0]?.generated_text || data[0]?.summary_text || null;
      }

      return data.generated_text || data.summary_text || null;
    } catch (error) {
      console.error("HF API call failed:", error);
      return null;
    }
  }

  private chunkTranscript(transcript: string, maxChunkSize: number): string[] {
    const sentences = transcript.match(/[^.!?]+[.!?]+/g) || [transcript];
    const chunks: string[] = [];
    let currentChunk = "";

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxChunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += " " + sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  private async extractStructuredElements(summary: string, transcript: string): Promise<MeetingSummary> {
    const overview = summary.slice(0, 500).trim() || "Meeting summary could not be generated.";

    const keyPoints = this.extractKeyPoints(summary + "\n" + transcript);
    const decisions = this.extractDecisions(transcript);
    const nextSteps = this.extractNextSteps(transcript);

    return {
      overview,
      key_points: keyPoints.slice(0, 5),
      decisions: decisions.slice(0, 5),
      next_steps: nextSteps.slice(0, 5),
    };
  }

  private extractKeyPoints(text: string): string[] {
    const keyPhrases = [
      "important",
      "key point",
      "main",
      "critical",
      "essential",
      "significant",
      "notable",
      "highlight",
    ];

    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 20);
    const keyPoints: string[] = [];

    sentences.forEach((sentence) => {
      const lower = sentence.toLowerCase();
      if (keyPhrases.some((phrase) => lower.includes(phrase))) {
        keyPoints.push(sentence.trim());
      }
    });

    if (keyPoints.length === 0 && sentences.length > 0) {
      return sentences.slice(0, 3).map((s) => s.trim());
    }

    return keyPoints;
  }

  private extractDecisions(text: string): string[] {
    const decisionPhrases = [
      "decided",
      "agreed",
      "concluded",
      "resolved",
      "determined",
      "will proceed",
      "approved",
      "confirmed",
    ];

    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 20);
    const decisions: string[] = [];

    sentences.forEach((sentence) => {
      const lower = sentence.toLowerCase();
      if (decisionPhrases.some((phrase) => lower.includes(phrase))) {
        decisions.push(sentence.trim());
      }
    });

    return decisions;
  }

  private extractNextSteps(text: string): string[] {
    const nextStepPhrases = ["next step", "will", "plan to", "need to", "should", "must", "action item", "follow up"];

    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 20);
    const nextSteps: string[] = [];

    sentences.forEach((sentence) => {
      const lower = sentence.toLowerCase();
      if (nextStepPhrases.some((phrase) => lower.includes(phrase))) {
        nextSteps.push(sentence.trim());
      }
    });

    return nextSteps;
  }

  private parseActionItemsResponse(response: string): ActionItem[] {
    const lines = response.split("\n").filter((line) => line.trim());
    const actionItems: ActionItem[] = [];

    lines.forEach((line) => {
      const priorityMatch = line.match(/\b(high|medium|low)\b/i);
      const assigneeMatch = line.match(/assigned to:?\s*([^,\n]+)/i);

      const cleanedTask = line
        .replace(/^[-*•]\s*/, "")
        .replace(/\b(high|medium|low)\b/gi, "")
        .replace(/assigned to:?\s*[^,\n]+/gi, "")
        .trim();

      if (cleanedTask.length > 10) {
        actionItems.push({
          id: crypto.randomUUID(),
          task: cleanedTask,
          assignee: assigneeMatch ? assigneeMatch[1].trim() : null,
          due_date: null,
          priority: (priorityMatch ? priorityMatch[1].toLowerCase() : "medium") as "high" | "medium" | "low",
          completed: false,
        });
      }
    });

    return actionItems;
  }

  private extractActionItemsFromText(text: string): ActionItem[] {
    const actionPhrases = [
      /(?:will|should|must|need to|needs to|has to|have to)\s+(.+?)(?:\.|$)/gi,
      /(?:action item|task|todo|to-do):\s*(.+?)(?:\.|$)/gi,
    ];

    const actionItems: ActionItem[] = [];
    const seen = new Set<string>();

    actionPhrases.forEach((pattern) => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const task = match[1].trim();
        const taskLower = task.toLowerCase();

        if (task.length > 15 && task.length < 200 && !seen.has(taskLower)) {
          seen.add(taskLower);

          const priority =
            taskLower.includes("urgent") || taskLower.includes("asap")
              ? "high"
              : taskLower.includes("important") || taskLower.includes("priority")
              ? "medium"
              : "low";

          actionItems.push({
            id: crypto.randomUUID(),
            task,
            assignee: null,
            due_date: null,
            priority,
            completed: false,
          });
        }
      }
    });

    return actionItems.slice(0, 10);
  }

  private generateFallbackSummary(transcript: string, processedTranscript: ProcessedTranscript): MeetingSummary {
    const overview = `Meeting with ${
      processedTranscript.speakers.length
    } participant(s) discussing various topics. Total duration: approximately ${Math.round(
      processedTranscript.duration / 60
    )} minutes.`;

    const keyPoints = this.extractKeyPoints(transcript);
    const decisions = this.extractDecisions(transcript);
    const nextSteps = this.extractNextSteps(transcript);

    return {
      overview,
      key_points: keyPoints.slice(0, 5),
      decisions: decisions.slice(0, 5),
      next_steps: nextSteps.slice(0, 5),
    };
  }
}
