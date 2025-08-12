import { z } from "zod";

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY!;
const HUGGINGFACE_API_URL = "https://api-inference.huggingface.co/models";

export const summaryResponseSchema = z.object({
  summary_text: z.string(),
});

export const actionItemSchema = z.object({
  task: z.string(),
  assignee: z.string().nullable(),
  priority: z.enum(["low", "medium", "high"]),
});

export class HuggingFaceService {
  private headers: Record<string, string>;

  constructor(apiKey: string = HUGGINGFACE_API_KEY) {
    if (!apiKey) {
      throw new Error("Hugging Face API key is required");
    }
    this.headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
  }

  async summarizeText(text: string, maxLength: number = 250): Promise<string> {
    if (!text || text.trim().length < 10) {
      throw new Error("Text too short for summarization");
    }

    const model = "facebook/bart-large-cnn";

    const cleanedText = text
      .replace(/\s+/g, " ")
      .replace(/\[[\d:]+\]\s*/g, "")
      .trim();

    if (cleanedText.length < 50) {
      return cleanedText;
    }

    // Truncate text if too long
    const maxInputLength = 1024;
    const truncatedText =
      cleanedText.length > maxInputLength ? cleanedText.substring(0, maxInputLength) + "..." : cleanedText;

    try {
      const response = await fetch(`${HUGGINGFACE_API_URL}/${model}`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          inputs: truncatedText,
          parameters: {
            max_length: maxLength,
            min_length: 30,
            do_sample: false,
            truncation: true,
          },
          options: {
            wait_for_model: true,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Hugging Face API error:", errorText);

        // Handle rate limiting
        if (response.status === 503) {
          throw new Error("Model is loading, please try again in a few seconds");
        }

        throw new Error(`Summarization failed: ${errorText}`);
      }

      const data = await response.json();

      // Handle array response
      if (Array.isArray(data) && data.length > 0 && data[0].summary_text) {
        return data[0].summary_text;
      }

      // Handle single object response
      if (data.summary_text) {
        return data.summary_text;
      }

      // Handle unexpected response format
      if (Array.isArray(data) && data.length > 0) {
        return JSON.stringify(data[0]);
      }

      throw new Error("Unexpected response format from Hugging Face API");
    } catch (error) {
      console.error("Summarization error:", error);
      throw error;
    }
  }

  async extractKeyPoints(text: string): Promise<string[]> {
    try {
      const sentences = text.replace(/\[[\d:]+\]\s*/g, "").match(/[^.!?]+[.!?]+/g) || [];

      if (sentences.length === 0) {
        return [];
      }

      const keyPoints = sentences
        .map((s) => s.trim())
        .filter((s) => s.length > 20)
        .filter((s) => {
          const lower = s.toLowerCase();
          return (
            lower.includes("important") ||
            lower.includes("key") ||
            lower.includes("main") ||
            lower.includes("critical") ||
            lower.includes("essential") ||
            lower.includes("decided") ||
            lower.includes("agreed") ||
            lower.includes("will") ||
            lower.includes("should") ||
            lower.includes("must")
          );
        })
        .slice(0, 5);

      if (keyPoints.length === 0 && sentences.length > 0) {
        return sentences
          .filter((s) => s.trim().length > 20)
          .slice(0, 3)
          .map((s) => s.trim());
      }

      return keyPoints;
    } catch (error) {
      console.error("Key points extraction error:", error);
      return [];
    }
  }

  parseActionItems(
    text: string
  ): Array<{ task: string; assignee: string | null; priority: "low" | "medium" | "high" }> {
    const actionItems: Array<{ task: string; assignee: string | null; priority: "low" | "medium" | "high" }> = [];

    const cleanText = text.replace(/\[[\d:]+\]\s*/g, "");
    const actionPatterns = [
      /(?:will|should|must|need to|needs to|has to|have to)\s+(.+?)(?:\.|$)/gi,
      /(?:action item|task|todo|to-do):\s*(.+?)(?:\.|$)/gi,
      /(?:assigned to|owner:)\s*(\w+)\s*-\s*(.+?)(?:\.|$)/gi,
      /(?:by|before|deadline:)\s*(.+?)\s*-\s*(.+?)(?:\.|$)/gi,
    ];

    const highPriorityWords = ["urgent", "asap", "immediately", "critical", "important"];
    const mediumPriorityWords = ["soon", "this week", "next week", "priority"];

    actionPatterns.forEach((pattern) => {
      const matches = cleanText.matchAll(pattern);
      for (const match of matches) {
        const taskText = match[2] || match[1];
        const assignee = match[1] && match[2] ? match[1] : null;

        if (taskText && taskText.length > 10 && taskText.length < 200) {
          let priority: "low" | "medium" | "high" = "low";
          const lowerText = taskText.toLowerCase();

          if (highPriorityWords.some((word) => lowerText.includes(word))) {
            priority = "high";
          } else if (mediumPriorityWords.some((word) => lowerText.includes(word))) {
            priority = "medium";
          }

          actionItems.push({
            task: taskText.trim(),
            assignee: assignee ? assignee.trim() : null,
            priority,
          });
        }
      }
    });

    // Remove duplicates
    const uniqueItems = actionItems.reduce((acc, item) => {
      const exists = acc.some((i) => i.task.toLowerCase() === item.task.toLowerCase());
      if (!exists) acc.push(item);
      return acc;
    }, [] as typeof actionItems);

    return uniqueItems.slice(0, 10);
  }

  extractDecisions(text: string): string[] {
    const decisions: string[] = [];
    const cleanText = text.replace(/\[[\d:]+\]\s*/g, "");

    const decisionPatterns = [
      /(?:decided|agreed|concluded|determined|resolved) (?:that|to)\s+(.+?)(?:\.|$)/gi,
      /(?:decision|agreement|conclusion):\s*(.+?)(?:\.|$)/gi,
      /(?:we|they|the team) (?:will|are going to|have decided to)\s+(.+?)(?:\.|$)/gi,
    ];

    decisionPatterns.forEach((pattern) => {
      const matches = cleanText.matchAll(pattern);
      for (const match of matches) {
        const decision = match[1];
        if (decision && decision.length > 10 && decision.length < 200) {
          decisions.push(decision.trim());
        }
      }
    });

    return [...new Set(decisions)].slice(0, 5);
  }

  extractNextSteps(text: string): string[] {
    const nextSteps: string[] = [];
    const cleanText = text.replace(/\[[\d:]+\]\s*/g, "");

    const nextStepPatterns = [
      /(?:next steps?|going forward|follow up):\s*(.+?)(?:\.|$)/gi,
      /(?:next|then|afterwards|following this),?\s*(?:we|they|I)\s*(?:will|need to|should)\s+(.+?)(?:\.|$)/gi,
      /(?:by next|for next|before next)\s+(?:week|month|meeting)\s*(?:we|they|I)?\s*(?:will|need to|should)?\s*(.+?)(?:\.|$)/gi,
    ];

    nextStepPatterns.forEach((pattern) => {
      const matches = cleanText.matchAll(pattern);
      for (const match of matches) {
        const step = match[1] || match[2];
        if (step && step.length > 10 && step.length < 200) {
          nextSteps.push(step.trim());
        }
      }
    });

    return [...new Set(nextSteps)].slice(0, 5);
  }
}
