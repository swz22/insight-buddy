"use client";

import { useMemo } from "react";
import type { TopicFrequency } from "@/lib/services/analytics";
import { cn } from "@/lib/utils";

interface TopicCloudProps {
  topics: TopicFrequency[];
}

export function TopicCloud({ topics }: TopicCloudProps) {
  const sortedTopics = useMemo(() => {
    const sorted = [...topics].sort((a, b) => b.weight - a.weight);
    const mixed: TopicFrequency[] = [];
    const half = Math.ceil(sorted.length / 2);

    for (let i = 0; i < half; i++) {
      mixed.push(sorted[i]);
      if (i + half < sorted.length) {
        mixed.push(sorted[i + half]);
      }
    }

    return mixed;
  }, [topics]);

  if (topics.length === 0) {
    return <div className="flex items-center justify-center h-48 text-white/40">No topics extracted yet</div>;
  }

  const getFontSize = (weight: number) => {
    const minSize = 0.75;
    const maxSize = 2.5;
    return `${minSize + (maxSize - minSize) * weight}rem`;
  };

  const getOpacity = (weight: number) => {
    return 0.4 + 0.6 * weight;
  };

  const getColor = (index: number, weight: number) => {
    const colors = [
      "text-purple-400",
      "text-cyan-400",
      "text-blue-400",
      "text-green-400",
      "text-yellow-400",
      "text-pink-400",
    ];

    if (weight > 0.7) {
      return colors[index % colors.length];
    }
    return "text-white";
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 p-8 min-h-[12rem]">
      {sortedTopics.map((topic, index) => (
        <span
          key={topic.topic}
          className={cn(
            "inline-block transition-all duration-300 hover:scale-110 cursor-default",
            getColor(index, topic.weight)
          )}
          style={{
            fontSize: getFontSize(topic.weight),
            opacity: getOpacity(topic.weight),
          }}
          title={`Mentioned ${topic.count} times`}
        >
          {topic.topic}
        </span>
      ))}
    </div>
  );
}
