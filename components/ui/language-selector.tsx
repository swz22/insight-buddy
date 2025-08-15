"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/services/translation";

interface LanguageSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  availableLanguages: string[];
  isLoading?: boolean;
  className?: string;
}

export function LanguageSelector({
  selectedLanguage,
  onLanguageChange,
  availableLanguages = [],
  isLoading = false,
  className,
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
    if (language === selectedLanguage) {
      setIsOpen(false);
      return;
    }

    onLanguageChange(language);
    setIsOpen(false);
  };

  const currentLanguageName = SUPPORTED_LANGUAGES[selectedLanguage as SupportedLanguage] || "Unknown";

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
          "bg-white/[0.02] hover:bg-white/[0.05] backdrop-blur-sm",
          "border border-white/10 hover:border-white/20",
          "text-white/90 hover:text-white",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
        <span className="text-sm font-medium">{currentLanguageName}</span>
        <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-56 rounded-lg bg-black/90 backdrop-blur-xl border border-white/10 shadow-xl overflow-hidden z-50"
          >
            <div className="py-1">
              {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => {
                const isSelected = code === selectedLanguage;
                const isAvailable = availableLanguages.includes(code);

                return (
                  <button
                    key={code}
                    onClick={() => handleLanguageSelect(code)}
                    disabled={isLoading}
                    className={cn(
                      "w-full px-4 py-2 text-left flex items-center justify-between",
                      "hover:bg-white/[0.05] transition-colors",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      isSelected && "bg-white/[0.05]"
                    )}
                  >
                    <span className="text-sm text-white/90">{name}</span>
                    {isSelected && <Check className="w-4 h-4 text-green-400" />}
                    {!isSelected && isAvailable && <span className="text-xs text-white/40">Available</span>}
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
