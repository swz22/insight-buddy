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
  private baseUrl = "https://api-inference.huggingface.co/models";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async detectLanguage(text: string): Promise<LanguageDetectionResult> {
    try {
      const response = await fetch(`${this.baseUrl}/facebook/xlm-roberta-base-language-detection`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: text.slice(0, 500) }),
      });

      if (!response.ok) {
        throw new Error(`Language detection failed: ${response.statusText}`);
      }

      const results = await response.json();
      const topResult = results[0][0];

      const languageMap: Record<string, SupportedLanguage> = {
        LABEL_0: "en",
        LABEL_1: "es",
        LABEL_2: "fr",
        LABEL_3: "de",
        LABEL_4: "it",
        LABEL_5: "pt",
        LABEL_6: "nl",
        LABEL_7: "pl",
        LABEL_8: "ru",
        LABEL_9: "ja",
        LABEL_10: "ko",
        LABEL_11: "zh",
        LABEL_12: "ar",
        LABEL_13: "hi",
      };

      return {
        language: languageMap[topResult.label] || "en",
        confidence: topResult.score,
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
      const modelId = this.getTranslationModel(request.sourceLanguage, request.targetLanguage);

      const response = await fetch(`${this.baseUrl}/${modelId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: request.text,
          parameters: {
            src_lang: request.sourceLanguage,
            tgt_lang: request.targetLanguage,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.statusText}`);
      }

      const result = await response.json();
      return Array.isArray(result) ? result[0].translation_text : result.translation_text;
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
    const translations: TranslatedContent = {
      title: await this.translateText({
        text: meeting.title,
        sourceLanguage,
        targetLanguage,
      }),
      transcript: "",
      translated_at: new Date().toISOString(),
      translator: "ai",
    };

    if (meeting.description) {
      translations.description = await this.translateText({
        text: meeting.description,
        sourceLanguage,
        targetLanguage,
      });
    }

    if (meeting.transcript) {
      const chunks = this.splitTextIntoChunks(meeting.transcript, 1000);
      const translatedChunks = await Promise.all(
        chunks.map((chunk) =>
          this.translateText({
            text: chunk,
            sourceLanguage,
            targetLanguage,
          })
        )
      );
      translations.transcript = translatedChunks.join(" ");
    }

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
          chunks.push(sentence.slice(0, maxLength));
          currentChunk = sentence.slice(maxLength);
        }
      } else {
        currentChunk += " " + sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  private getTranslationModel(source: string, target: string): string {
    const modelMap: Record<string, string> = {
      "en-es": "Helsinki-NLP/opus-mt-en-es",
      "es-en": "Helsinki-NLP/opus-mt-es-en",
      "en-fr": "Helsinki-NLP/opus-mt-en-fr",
      "fr-en": "Helsinki-NLP/opus-mt-fr-en",
      "en-de": "Helsinki-NLP/opus-mt-en-de",
      "de-en": "Helsinki-NLP/opus-mt-de-en",
      "en-zh": "Helsinki-NLP/opus-mt-en-zh",
      "zh-en": "Helsinki-NLP/opus-mt-zh-en",
    };

    return modelMap[`${source}-${target}`] || "facebook/mbart-large-50-many-to-many-mmt";
  }
}
