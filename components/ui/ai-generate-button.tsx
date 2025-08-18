"use client";

import { Button } from "@/components/ui/button";
import { Loader2, Bot, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AIGenerateButtonProps {
  hasData: boolean;
  isLoading: boolean;
  onGenerate: () => void;
  onRegenerate: () => void;
  feature: "summary" | "insights" | "transcript" | "actions";
  disabled?: boolean;
  variant?: "glass" | "glow";
  size?: "sm" | "default";
  className?: string;
}

const featureDescriptions = {
  summary: {
    generate: "AI analyzes the transcript to extract key points, decisions, and next steps",
    regenerate: "Generate a fresh summary with updated AI analysis",
  },
  insights: {
    generate: "Deep analytics including speaker metrics, sentiment analysis, and key moments",
    regenerate: "Re-analyze the meeting for updated insights and metrics",
  },
  transcript: {
    generate: "Convert audio to text with speaker identification",
    regenerate: "Re-process the audio file for improved accuracy",
  },
  actions: {
    generate: "Extract actionable tasks from the meeting summary",
    regenerate: "Re-extract action items with updated context",
  },
};

export function AIGenerateButton({
  hasData,
  isLoading,
  onGenerate,
  onRegenerate,
  feature,
  disabled = false,
  variant = "glass",
  size = "sm",
  className,
}: AIGenerateButtonProps) {
  const isFirstTime = !hasData;
  const description = isFirstTime ? featureDescriptions[feature].generate : featureDescriptions[feature].regenerate;

  const handleClick = () => {
    if (isFirstTime) {
      onGenerate();
    } else {
      onRegenerate();
    }
  };

  const getButtonText = () => {
    if (isLoading) {
      return isFirstTime ? "Generating..." : "Regenerating...";
    }

    const featureName = feature.charAt(0).toUpperCase() + feature.slice(1);
    return isFirstTime ? `Generate ${featureName}` : "Regenerate";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleClick}
            disabled={disabled || isLoading}
            className={cn("hover:border-green-400/60 transition-all", className)}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {getButtonText()}
              </>
            ) : isFirstTime ? (
              <>
                <Bot className="w-4 h-4 mr-2" />
                {getButtonText()}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {getButtonText()}
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs bg-black/90 border-white/10 text-white/90">
          <p className="text-sm">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
