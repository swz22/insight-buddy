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
    const model = "facebook/bart-large-cnn";

    // Truncate text if too long
    const maxInputLength = 1024;
    const truncatedText = text.length > maxInputLength ? text.substring(0, maxInputLength) + "..." : text;

    const response = await fetch(`${HUGGINGFACE_API_URL}/${model}`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        inputs: truncatedText,
        parameters: {
          max_length: maxLength,
          min_length: 50,
          do_sample: false,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Summarization failed: ${error}`);
    }

    const data = await response.json();

    // Handle array response
    if (Array.isArray(data) && data.length > 0) {
      return summaryResponseSchema.parse(data[0]).summary_text;
    }

    return summaryResponseSchema.parse(data).summary_text;
  }

  async extractKeyPoints(text: string): Promise<string[]> {
    const model = "facebook/bart-large-mnli";
    const candidateLabels = [
      "decision",
      "action item",
      "important point",
      "deadline",
      "milestone",
      "problem",
      "solution",
    ];

    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const keyPoints: string[] = [];

    // Process in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < Math.min(sentences.length, 20); i += batchSize) {
      const batch = sentences.slice(i, i + batchSize);

      const promises = batch.map(async (sentence) => {
        try {
          const response = await fetch(`${HUGGINGFACE_API_URL}/${model}`, {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify({
              inputs: sentence.trim(),
              parameters: {
                candidate_labels: candidateLabels,
                multi_label: true,
              },
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.scores && data.scores[0] > 0.5) {
              return sentence.trim();
            }
          }
        } catch (error) {
          console.error("Classification error:", error);
        }
        return null;
      });

      const results = await Promise.all(promises);
      keyPoints.push(...(results.filter(Boolean) as string[]));
    }

    // If no key points found, extract first few sentences
    if (keyPoints.length === 0 && sentences.length > 0) {
      return sentences.slice(0, 3).map((s) => s.trim());
    }

    return keyPoints.slice(0, 5);
  }

  parseActionItems(
    text: string
  ): Array<{ task: string; assignee: string | null; priority: "low" | "medium" | "high" }> {
    const actionItems: Array<{ task: string; assignee: string | null; priority: "low" | "medium" | "high" }> = [];
    const actionPatterns = [
      /(?:will|should|must|need to|needs to|has to|have to)\s+(.+?)(?:\.|$)/gi,
      /(?:action item|task|todo|to-do):\s*(.+?)(?:\.|$)/gi,
      /(?:assigned to|owner:)\s*(\w+)\s*-\s*(.+?)(?:\.|$)/gi,
      /(?:by|before|deadline:)\s*(.+?)\s*-\s*(.+?)(?:\.|$)/gi,
    ];

    const highPriorityWords = ["urgent", "asap", "immediately", "critical", "important"];
    const mediumPriorityWords = ["soon", "this week", "next week", "priority"];

    actionPatterns.forEach((pattern) => {
      const matches = text.matchAll(pattern);
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
    const decisionPatterns = [
      /(?:decided|agreed|concluded|determined|resolved) (?:that|to)\s+(.+?)(?:\.|$)/gi,
      /(?:decision|agreement|conclusion):\s*(.+?)(?:\.|$)/gi,
      /(?:we|they|the team) (?:will|are going to|have decided to)\s+(.+?)(?:\.|$)/gi,
    ];

    decisionPatterns.forEach((pattern) => {
      const matches = text.matchAll(pattern);
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
    const nextStepPatterns = [
      /(?:next steps?|going forward|follow up):\s*(.+?)(?:\.|$)/gi,
      /(?:next|then|afterwards|following this),?\s*(?:we|they|I)\s*(?:will|need to|should)\s+(.+?)(?:\.|$)/gi,
      /(?:by next|for next|before next)\s+(?:week|month|meeting)\s*(?:we|they|I)?\s*(?:will|need to|should)?\s*(.+?)(?:\.|$)/gi,
    ];

    nextStepPatterns.forEach((pattern) => {
      const matches = text.matchAll(pattern);
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
