import { z } from "zod";
import {
  meetingSummarySchema,
  actionItemsResponseSchema,
  type MeetingSummary,
  type ActionItem,
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
    const systemPrompt = `You are an expert meeting analyst. Analyze the provided meeting transcript and generate a structured summary.
Focus on extracting actionable insights, key decisions, and next steps.
Be concise but comprehensive. Extract actual content from the meeting, not generic observations.`;

    const userPrompt = `Meeting Participants: ${participants.join(", ") || "Unknown"}

Transcript:
${transcript}

Generate a structured summary following the exact JSON schema provided.`;

    try {
      const response = await this.callOpenAI<MeetingSummary>({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "meeting_summary",
            strict: true,
            schema: {
              type: "object",
              properties: {
                overview: {
                  type: "string",
                  description: "A concise 2-3 sentence summary of the meeting",
                },
                key_points: {
                  type: "array",
                  items: { type: "string" },
                  maxItems: 5,
                  description: "Main discussion points and important topics",
                },
                decisions: {
                  type: "array",
                  items: { type: "string" },
                  maxItems: 5,
                  description: "Key decisions made during the meeting",
                },
                next_steps: {
                  type: "array",
                  items: { type: "string" },
                  maxItems: 5,
                  description: "Action items and follow-up tasks",
                },
              },
              required: ["overview", "key_points", "decisions", "next_steps"],
              additionalProperties: false,
            },
          },
        },
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
Extract specific, clear action items with assignees when mentioned.
Prioritize tasks based on urgency and importance discussed in the meeting.
If a due date is mentioned or implied, include it in ISO format.`;

    const userPrompt = `Meeting Participants: ${participants.join(", ") || "Unknown"}

Meeting Summary:
${summary.overview}

Key Decisions:
${summary.decisions.join("\n")}

Next Steps:
${summary.next_steps.join("\n")}

Transcript:
${transcript}

Extract all action items from this meeting. For each action item, identify:
1. The specific task
2. Who it's assigned to (if mentioned)
3. Priority level based on context
4. Due date if mentioned (in ISO format)
5. Any additional context

Return as a JSON array of action items.`;

    try {
      const response = await this.callOpenAI<{ action_items: ActionItem[] }>({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "action_items",
            strict: true,
            schema: {
              type: "object",
              properties: {
                action_items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      task: {
                        type: "string",
                        description: "Clear description of the task",
                      },
                      assignee: {
                        type: ["string", "null"],
                        description: "Person responsible for the task",
                      },
                      due_date: {
                        type: ["string", "null"],
                        description: "ISO date string for when the task should be completed",
                      },
                      priority: {
                        type: "string",
                        enum: ["high", "medium", "low"],
                        description: "Priority level of the task",
                      },
                      context: {
                        type: "string",
                        description: "Additional context about the task",
                      },
                    },
                    required: ["task", "assignee", "due_date", "priority"],
                    additionalProperties: false,
                  },
                  maxItems: 10,
                },
              },
              required: ["action_items"],
              additionalProperties: false,
            },
          },
        },
        temperature: 0.2,
        max_tokens: 1500,
      });

      const result = actionItemsResponseSchema.parse(response);
      return result.action_items.map((item) => ({
        id: crypto.randomUUID(),
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
    response_format?: any;
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
            response_format: params.response_format,
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
        return JSON.parse(content) as T;
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
}
