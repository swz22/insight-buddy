"use client";

import { useState, useRef, useEffect } from "react";
import { CommentHighlight as CommentHighlightType } from "@/types/comments";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface CommentHighlightProps {
  highlight: CommentHighlightType;
  text: string;
  onClick: (e: React.MouseEvent<HTMLSpanElement>) => void;
  onHover: (isHovered: boolean) => void;
  showTooltip?: boolean;
  tooltipContent?: React.ReactNode;
}

export function CommentHighlight({
  highlight,
  text,
  onClick,
  onHover,
  showTooltip = true,
  tooltipContent,
}: CommentHighlightProps) {
  const [localHover, setLocalHover] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (localHover && spanRef.current) {
      const rect = spanRef.current.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    }
  }, [localHover]);

  const handleMouseEnter = () => {
    setLocalHover(true);
    onHover(true);
  };

  const handleMouseLeave = () => {
    setLocalHover(false);
    onHover(false);
  };

  const primaryColor = highlight.userColors[0] || "#a855f7";
  const hasMultipleUsers = highlight.userColors.length > 1;

  return (
    <>
      <span
        ref={spanRef}
        className={cn(
          "relative inline cursor-pointer transition-all duration-200",
          "hover:bg-opacity-25"
        )}
        style={{
          background: localHover
            ? `linear-gradient(90deg, transparent, ${primaryColor}22, transparent)`
            : `linear-gradient(90deg, transparent, ${primaryColor}11, transparent)`,
          padding: "2px 0",
        }}
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {text}
        {highlight.commentCount > 0 && (
          <span
            className={cn(
              "inline-flex items-center justify-center ml-1",
              "w-1.5 h-1.5 rounded-full",
              "animate-pulse"
            )}
            style={{
              background: hasMultipleUsers
                ? `linear-gradient(135deg, ${highlight.userColors[0]}, ${highlight.userColors[1]})`
                : primaryColor,
            }}
          />
        )}
      </span>

      <AnimatePresence>
        {showTooltip && localHover && tooltipContent && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 pointer-events-none"
            style={{
              left: tooltipPosition.x,
              top: tooltipPosition.y - 36,
              transform: "translateX(-50%)",
            }}
          >
            <div className="bg-black/95 backdrop-blur-xl rounded-md px-3 py-1.5 shadow-xl border border-white/10">
              <div className="text-xs text-white/90 whitespace-nowrap">
                {tooltipContent}
              </div>
              <div
                className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-black/95 border-r border-b border-white/10"
                style={{ transform: "translateX(-50%) rotate(45deg)" }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}