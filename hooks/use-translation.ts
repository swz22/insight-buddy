import { useState, useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { TranslatedContent } from "@/types/supabase";

interface UseTranslationOptions {
  meetingId: string;
  enabled?: boolean;
}

interface TranslationResponse {
  translation: TranslatedContent;
  cached: boolean;
  warning?: string;
}

export function useTranslation({ meetingId, enabled = true }: UseTranslationOptions) {
  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  const { data: availableTranslations, isLoading: isLoadingTranslations } = useQuery<Record<string, TranslatedContent>>(
    {
      queryKey: ["translations", meetingId],
      queryFn: async () => {
        const response = await fetch(`/api/meetings/${meetingId}/translate`);
        if (!response.ok) {
          throw new Error("Failed to fetch translations");
        }
        return response.json();
      },
      enabled,
    }
  );

  const translateMutation = useMutation<TranslationResponse, Error, string>({
    mutationFn: async (targetLanguage: string) => {
      const response = await fetch(`/api/meetings/${meetingId}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetLanguage }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Translation failed");
      }

      return response.json();
    },
    onSuccess: (data, targetLanguage) => {
      queryClient.setQueryData<Record<string, TranslatedContent>>(["translations", meetingId], (old) => ({
        ...old,
        [targetLanguage]: data.translation,
      }));

      if (data.cached) {
        toastSuccess("Translation loaded from cache");
      } else {
        toastSuccess(`Meeting translated to ${getLanguageName(targetLanguage)}`);
      }

      if (data.warning) {
        toastError(data.warning);
      }
    },
    onError: (error) => {
      toastError(error.message || "Translation failed");
    },
  });

  const translate = useCallback(
    async (targetLanguage: string) => {
      if (targetLanguage === "en") return;

      const existingTranslation = availableTranslations?.[targetLanguage];
      if (existingTranslation) {
        setSelectedLanguage(targetLanguage);
        return;
      }

      try {
        await translateMutation.mutateAsync(targetLanguage);
        setSelectedLanguage(targetLanguage);
      } catch (error) {
        console.error("Translation error:", error);
      }
    },
    [availableTranslations, translateMutation]
  );

  const currentTranslation = selectedLanguage === "en" ? null : availableTranslations?.[selectedLanguage];

  const availableLanguages = Object.keys(availableTranslations || {});

  return {
    selectedLanguage,
    setSelectedLanguage,
    translate,
    isTranslating: translateMutation.isPending,
    currentTranslation,
    availableTranslations,
    availableLanguages,
    isLoadingTranslations,
  };
}

function getLanguageName(code: string): string {
  const languages: Record<string, string> = {
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
  };

  return languages[code] || code.toUpperCase();
}
