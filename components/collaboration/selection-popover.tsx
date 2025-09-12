"use client";

import { useEffect, useState, useRef } from "react";
import { MessageCircle, Highlighter, StickyNote } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface SelectionPopoverProps {
  onComment: (text: string, range: Range) => void;
  onHighlight: (text: string, range: Range) => void;
  onNote: (text: string, range: Range) => void;
  containerRef?: React.RefObject<HTMLElement>;
  disabled?: boolean;
}

export function SelectionPopover({ 
  onComment, 
  onHighlight, 
  onNote, 
  containerRef,
  disabled = false 
}: SelectionPopoverProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [selectedRange, setSelectedRange] = useState<Range | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        setPosition(null);
        setSelectedText("");
        setSelectedRange(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const text = selection.toString().trim();

      if (text.length === 0) {
        setPosition(null);
        setSelectedText("");
        setSelectedRange(null);
        return;
      }

      if (containerRef?.current) {
        const container = containerRef.current;
        if (!container.contains(range.commonAncestorContainer)) {
          setPosition(null);
          setSelectedText("");
          setSelectedRange(null);
          return;
        }
      }

      const rect = range.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + window.scrollY;

      setPosition({ x, y });
      setSelectedText(text);
      setSelectedRange(range.cloneRange());
    };

    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        const selection = window.getSelection();
        if (selection && selection.toString().trim() === "") {
          setPosition(null);
          setSelectedText("");
          setSelectedRange(null);
        }
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("mouseup", handleSelectionChange);
    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("mouseup", handleSelectionChange);
      document.removeEventListener("click", handleClick);
    };
  }, [containerRef]);

  const handleAction = (action: "comment" | "highlight" | "note") => {
    if (!selectedText || !selectedRange) return;

    switch (action) {
      case "comment":
        onComment(selectedText, selectedRange);
        break;
      case "highlight":
        onHighlight(selectedText, selectedRange);
        break;
      case "note":
        onNote(selectedText, selectedRange);
        break;
    }

    window.getSelection()?.removeAllRanges();
    setPosition(null);
    setSelectedText("");
    setSelectedRange(null);
  };

  if (disabled || !position || !selectedText) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={popoverRef}
        initial={{ opacity: 0, y: 5, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 5, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="fixed z-50"
        style={{
          left: `${position.x}px`,
          top: `${position.y - 48}px`,
          transform: "translateX(-50%)",
        }}
      >
        <div className="bg-black/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl overflow-hidden">
          <div className="flex items-center p-1">
            <button
              onClick={() => handleAction("comment")}
              className="flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-all group"
            >
              <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Comment</span>
            </button>
            
            <div className="w-px h-5 bg-white/20" />
            
            <button
              onClick={() => handleAction("highlight")}
              className="flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-all group"
            >
              <Highlighter className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Highlight</span>
            </button>
            
            <div className="w-px h-5 bg-white/20" />
            
            <button
              onClick={() => handleAction("note")}
              className="flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-all group"
            >
              <StickyNote className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Note</span>
            </button>
          </div>
        </div>
        
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-1">
          <div className="w-3 h-3 bg-black/95 border-b border-r border-white/20 rotate-45 transform origin-center" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}