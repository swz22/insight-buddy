import { z } from "zod";
import {
  meetingSummarySchema,
  actionItemsResponseSchema,
  type MeetingSummary,
  type ActionItem,
  type ActionItemsResponse,
  type OpenAIResponse,
} from "@/lib/types/openai";

export class OpenAIService {
  private apiKey: string;
  private baseUrl = "https://api.openai.com/v1";
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error("OpenAI API key is required");
    }
    this.apiKey = key;
  }

  async generateSummary(transcript: string, participants: string[] = []): Promise<MeetingSummary> {
    const systemPrompt = `You are an expert meeting analyst specializing in extracting actionable insights from transcripts.

Your analysis should:
- Focus on concrete outcomes, decisions, and action items
- Capture the essence of discussions without being too verbose
- Identify key themes and important points raised
- Highlight any unresolved issues or open questions
- Be specific and avoid generic statements

Important guidelines:
- The overview should capture the meeting's purpose and main outcome in 2-5 sentences
- Key points should be specific topics discussed, not obvious statements
- Decisions should be concrete agreements or conclusions reached
- Next steps should be actionable items that emerged from the discussion

You MUST respond with a valid JSON object in this exact format:
{
  "overview": "string - A concise 2-3 sentence summary of the meeting",
  "key_points": ["string array - Main discussion points, MAXIMUM 10 items"],
  "decisions": ["string array - Key decisions made, MAXIMUM 10 items"],
  "next_steps": ["string array - Action items and follow-up tasks, MAXIMUM 10 items"]
}

CRITICAL: Each array MUST contain NO MORE THAN 10 items. If there are more than 10 points to include, select only the 10 most important ones.`;

    const userPrompt = `Analyze this meeting transcript and provide a structured summary.

Meeting Context:
- Participants: ${participants.length > 0 ? participants.join(", ") : "Not specified"}
- Total Speakers: ${this.countSpeakers(transcript)}

Transcript:
${transcript}

Focus on extracting specific, actionable content from what was actually discussed.
Remember to respond with valid JSON only.`;

    try {
      const response = await this.callOpenAI<MeetingSummary>({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      return meetingSummarySchema.parse(response);
    } catch (error) {
      console.error("Summary generation failed:", error);
      throw new Error("Failed to generate meeting summary");
    }
  }

  async extractActionItems(
    transcript: string,
    summary: MeetingSummary,
    participants: string[] = []
  ): Promise<ActionItem[]> {
    const systemPrompt = `You are an expert at extracting actionable tasks from meeting transcripts.

Extract clear, specific action items with:
- Task description
- Assignee (if mentioned)
- Due date (if mentioned)
- Priority level (high/medium/low based on context)

Respond with JSON in this format:
{
  "action_items": [
    {
      "task": "string",
      "assignee": "string or null",
      "due_date": "ISO date string or null",
      "priority": "high" | "medium" | "low",
      "context": "optional additional context"
    }
  ]
}

MAXIMUM 10 action items. Select the most important if there are more.`;

    const userPrompt = `Extract action items from this meeting.

Meeting Summary:
${JSON.stringify(summary, null, 2)}

Transcript:
${transcript}

Participants: ${participants.join(", ") || "Unknown"}`;

    try {
      const response = await this.callOpenAI<ActionItemsResponse>({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 1000,
      });

      const result = actionItemsResponseSchema.parse(response);
      return result.action_items.map((item, index) => ({
        id: `action-${Date.now()}-${index}`,
        task: item.task,
        assignee: item.assignee,
        due_date: item.due_date,
        priority: item.priority,
        completed: false,
        context: item.context,
      }));
    } catch (error) {
      console.error("Action items extraction failed:", error);
      return [];
    }
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

        const data = (await response.json()) as OpenAIResponse<T>;

        if (!data.choices || data.choices.length === 0) {
          throw new Error("No response from OpenAI");
        }

        const content = data.choices[0].message.content;

        try {
          return JSON.parse(content) as T;
        } catch (parseError) {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
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

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private countSpeakers(transcript: string): number {
    const speakerPattern = /Speaker\s+([A-Z])/g;
    const speakers = new Set<string>();
    let match;

    while ((match = speakerPattern.exec(transcript)) !== null) {
      speakers.add(match[1]);
    }

    return speakers.size || 1;
  }
}
