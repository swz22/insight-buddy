"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/services/translation";

interface LanguageSelectorProps {
  value: string;
  onChange: (language: string) => void;
  onTranslate?: (language: string) => void;
  availableTranslations?: string[];
  isTranslating?: boolean;
  className?: string;
  showTranslateButton?: boolean;
}

export function LanguageSelector({
  value,
  onChange,
  onTranslate,
  availableTranslations = [],
  isTranslating = false,
  className,
  showTranslateButton = true,
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLanguageSelect = (language: string) => {
    if (language === value) {
      setIsOpen(false);
      return;
    }

    onChange(language);
    setIsOpen(false);

    if (showTranslateButton && onTranslate && !availableTranslations.includes(language)) {
      onTranslate(language);
    }
  };

  const currentLanguageName = SUPPORTED_LANGUAGES[value as SupportedLanguage] || "Unknown";

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isTranslating}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
          "bg-white/[0.02] hover:bg-white/[0.05] backdrop-blur-sm",
          "border border-white/10 hover:border-white/20",
          "text-white/90 hover:text-white",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {isTranslating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
        <span className="text-sm font-medium">{currentLanguageName}</span>
        <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute right-0 mt-2 w-56 z-50",
              "bg-black/90 backdrop-blur-xl rounded-xl",
              "border border-white/10 shadow-2xl",
              "overflow-hidden"
            )}
          >
            <div className="p-2 max-h-96 overflow-y-auto custom-scrollbar">
              {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => {
                const isSelected = code === value;
                const isTranslated = availableTranslations.includes(code);

                return (
                  <button
                    key={code}
                    onClick={() => handleLanguageSelect(code)}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg",
                      "text-sm transition-all",
                      isSelected
                        ? "bg-purple-500/20 text-purple-400"
                        : "hover:bg-white/[0.05] text-white/80 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{getFlagEmoji(code)}</span>
                      <span>{name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isTranslated && !isSelected && <span className="text-xs text-white/40">Translated</span>}
                      {isSelected && <Check className="w-4 h-4" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getFlagEmoji(languageCode: string): string {
  const flagMap: Record<string, string> = {
    en: "🇺🇸",
    es: "🇪🇸",
    fr: "🇫🇷",
    de: "🇩🇪",
    it: "🇮🇹",
    pt: "🇧🇷",
    nl: "🇳🇱",
    pl: "🇵🇱",
    ru: "🇷🇺",
    ja: "🇯🇵",
    ko: "🇰🇷",
    zh: "🇨🇳",
    ar: "🇸🇦",
    hi: "🇮🇳",
  };

  return flagMap[languageCode] || "🌐";
}
