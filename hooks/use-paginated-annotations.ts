import { useState, useEffect, useCallback } from "react";
import { createPublicClient } from "@/lib/supabase/public-client";

interface Annotation {
  id: string;
  meeting_id: string;
  share_token: string;
  user_info: any;
  type: "highlight" | "comment" | "note";
  content: string;
  position?: any;
  parent_id?: string;
  created_at: string;
}

interface PaginatedAnnotations {
  annotations: Annotation[];
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  addOptimistic: (annotation: Annotation) => void;
  removeOptimistic: (id: string) => void;
  updateOptimistic: (id: string, content: string) => void;
}

const PAGE_SIZE = 50;

export function usePaginatedAnnotations(meetingId: string, shareToken: string): PaginatedAnnotations {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createPublicClient();

  const fetchAnnotations = useCallback(
    async (pageNum: number, append = true) => {
      if (!meetingId || !shareToken) return;

      setIsLoading(true);
      setError(null);

      try {
        const from = pageNum * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const {
          data,
          error: fetchError,
          count,
        } = await supabase
          .from("meeting_annotations")
          .select("*", { count: "exact" })
          .eq("meeting_id", meetingId)
          .eq("share_token", shareToken)
          .order("created_at", { ascending: true })
          .range(from, to);

        if (fetchError) throw fetchError;

        const newAnnotations = data || [];

        if (append) {
          setAnnotations((prev) => {
            const combined = [...prev, ...newAnnotations];
            const unique = Array.from(new Map(combined.map((a) => [a.id, a])).values());
            return unique;
          });
        } else {
          setAnnotations(newAnnotations);
        }

        const totalFetched = (pageNum + 1) * PAGE_SIZE;
        setHasMore(count ? totalFetched < count : false);
      } catch (err) {
        console.error("Failed to fetch annotations:", err);
        setError("Failed to load annotations");
      } finally {
        setIsLoading(false);
      }
    },
    [meetingId, shareToken, supabase]
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;

    const nextPage = page + 1;
    await fetchAnnotations(nextPage);
    setPage(nextPage);
  }, [page, hasMore, isLoading, fetchAnnotations]);

  const refresh = useCallback(async () => {
    setPage(0);
    setHasMore(true);
    await fetchAnnotations(0, false);
  }, [fetchAnnotations]);

  const addOptimistic = useCallback((annotation: Annotation) => {
    setAnnotations((prev) => [...prev, annotation]);
  }, []);

  const removeOptimistic = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const updateOptimistic = useCallback((id: string, content: string) => {
    setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, content } : a)));
  }, []);

  useEffect(() => {
    fetchAnnotations(0, false);
  }, [meetingId, shareToken]);

  return {
    annotations,
    hasMore,
    isLoading,
    error,
    loadMore,
    refresh,
    addOptimistic,
    removeOptimistic,
    updateOptimistic,
  };
}
