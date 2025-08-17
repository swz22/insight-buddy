import { z } from "zod";

export const meetingSummarySchema = z.object({
  overview: z.string().describe("A concise 2-3 sentence summary of the meeting"),
  key_points: z.array(z.string()).max(10).describe("Main discussion points and important topics"),
  decisions: z.array(z.string()).max(10).describe("Key decisions made during the meeting"),
  next_steps: z.array(z.string()).max(10).describe("Action items and follow-up tasks"),
});

export const actionItemSchema = z.object({
  task: z.string().describe("Clear description of the task to be completed"),
  assignee: z.string().nullable().describe("Person responsible for the task"),
  due_date: z.string().nullable().describe("ISO date string for when the task should be completed"),
  priority: z.enum(["high", "medium", "low"]).describe("Priority level of the task"),
  context: z.string().optional().describe("Additional context or notes about the task"),
});

export const actionItemsResponseSchema = z.object({
  action_items: z.array(actionItemSchema).max(10),
});

export type MeetingSummary = z.infer<typeof meetingSummarySchema>;
export type ActionItem = z.infer<typeof actionItemSchema>;
export type ActionItemsResponse = z.infer<typeof actionItemsResponseSchema>;

export interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenAIResponse<T> {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: OpenAIUsage;
}
