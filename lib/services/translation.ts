import { TranslatedContent } from "@/types/supabase";

export interface TranslationRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface LanguageDetectionResult {
  language: string;
  confidence: number;
}

export const SUPPORTED_LANGUAGES = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  pl: "Polish",
  ru: "Russian",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  ar: "Arabic",
  hi: "Hindi",
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

export class TranslationService {
  private apiKey: string;
  private baseUrl = "https://api.openai.com/v1";
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async detectLanguage(text: string): Promise<LanguageDetectionResult> {
    try {
      const systemPrompt = `You are a language detection expert. Analyze the given text and identify its language.
      
Respond with a JSON object in this exact format:
{
  "language": "language_code",
  "confidence": 0.95
}

Use these language codes: en, es, fr, de, it, pt, nl, pl, ru, ja, ko, zh, ar, hi`;

      const response = await this.callOpenAI<{ language: string; confidence: number }>({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Detect the language of this text: "${text.slice(0, 500)}"` },
        ],
        temperature: 0.1,
        max_tokens: 100,
      });

      return {
        language: response.language as SupportedLanguage,
        confidence: response.confidence,
      };
    } catch (error) {
      console.error("Language detection error:", error);
      return { language: "en", confidence: 0 };
    }
  }

  async translateText(request: TranslationRequest): Promise<string> {
    if (request.sourceLanguage === request.targetLanguage) {
      return request.text;
    }

    try {
      const sourceLang = SUPPORTED_LANGUAGES[request.sourceLanguage as SupportedLanguage] || request.sourceLanguage;
      const targetLang = SUPPORTED_LANGUAGES[request.targetLanguage as SupportedLanguage] || request.targetLanguage;

      const systemPrompt = `You are a professional translator. Translate the given text from ${sourceLang} to ${targetLang}.

Important guidelines:
- Maintain the original tone and style
- Preserve formatting (line breaks, punctuation)
- Keep speaker labels (e.g., "Speaker A:", "[00:23]") unchanged
- Translate only the actual spoken content
- Be accurate and natural in the target language`;

      const response = await this.callOpenAI<string>({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: request.text },
        ],
        temperature: 0.3,
        max_tokens: Math.min(4000, request.text.length * 2),
        responseType: "text",
      });

      return response;
    } catch (error) {
      console.error("Translation error:", error);
      throw new Error("Translation service unavailable");
    }
  }

  async translateMeetingContent(
    meeting: {
      title: string;
      description?: string | null;
      transcript?: string | null;
      summary?: any;
    },
    targetLanguage: string,
    sourceLanguage: string = "en"
  ): Promise<TranslatedContent> {
    // Start with required fields
    const translations: TranslatedContent = {
      title: await this.translateText({
        text: meeting.title,
        sourceLanguage,
        targetLanguage,
      }),
      transcript: "", // Required non-nullable string
      translated_at: new Date().toISOString(),
      translator: "ai" as const,
    };

    // Handle optional description
    if (meeting.description) {
      translations.description = await this.translateText({
        text: meeting.description,
        sourceLanguage,
        targetLanguage,
      });
    }

    // Translate transcript if available
    if (meeting.transcript) {
      const chunks = this.splitTextIntoChunks(meeting.transcript, 2000);
      const translatedChunks = await Promise.all(
        chunks.map((chunk) =>
          this.translateText({
            text: chunk,
            sourceLanguage,
            targetLanguage,
          })
        )
      );
      translations.transcript = translatedChunks.join("\n");
    }

    // Translate summary if available
    if (meeting.summary) {
      translations.summary = {
        overview: await this.translateText({
          text: meeting.summary.overview,
          sourceLanguage,
          targetLanguage,
        }),
        key_points: await Promise.all(
          meeting.summary.key_points.map((point: string) =>
            this.translateText({
              text: point,
              sourceLanguage,
              targetLanguage,
            })
          )
        ),
        decisions: await Promise.all(
          meeting.summary.decisions.map((decision: string) =>
            this.translateText({
              text: decision,
              sourceLanguage,
              targetLanguage,
            })
          )
        ),
        next_steps: await Promise.all(
          meeting.summary.next_steps.map((step: string) =>
            this.translateText({
              text: step,
              sourceLanguage,
              targetLanguage,
            })
          )
        ),
      };
    }

    return translations;
  }

  private async callOpenAI<T>(params: {
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    max_tokens?: number;
    responseType?: "json" | "text";
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

        if (params.responseType === "text") {
          return content as T;
        }

        // Try to parse JSON response
        try {
          return JSON.parse(content) as T;
        } catch (parseError) {
          // If parsing fails, try to extract JSON from the response
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

  private splitTextIntoChunks(text: string, maxLength: number): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks: string[] = [];
    let currentChunk = "";

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxLength) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = sentence;
        } else {
          // If a single sentence is too long, split it
          chunks.push(sentence.slice(0, maxLength));
          currentChunk = sentence.slice(maxLength);
        }
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}
