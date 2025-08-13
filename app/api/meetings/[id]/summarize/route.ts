import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { apiError, apiSuccess } from "@/lib/api/response";
import { HuggingFacePipeline } from "@/lib/services/ai/huggingface-pipeline";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: Request, { params: paramsPromise }: RouteParams) {
  const params = await paramsPromise;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError("Unauthorized", 401, "AUTH_REQUIRED");
    }

    const serviceSupabase = createServiceRoleClient();

    const { data: meeting, error: fetchError } = await serviceSupabase
      .from("meetings")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !meeting) {
      return apiError("Meeting not found", 404, "NOT_FOUND");
    }

    if (!meeting.transcript) {
      return apiError("No transcript available for summarization", 400, "NO_TRANSCRIPT");
    }

    const huggingfaceKey = process.env.HUGGINGFACE_API_KEY || process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY;

    if (!huggingfaceKey) {
      console.log("No Hugging Face API key found, using fallback summarization");
      return generateFallbackSummary(params.id, meeting, serviceSupabase);
    }

    try {
      const pipeline = new HuggingFacePipeline(huggingfaceKey);

      const processedTranscript = await pipeline.processTranscript(meeting.transcript);

      const summary = await pipeline.generateStructuredSummary(meeting.transcript, processedTranscript);

      const actionItems = await pipeline.generateActionItems(meeting.transcript, processedTranscript, summary);

      const { error: updateError } = await serviceSupabase
        .from("meetings")
        .update({
          summary,
          action_items: actionItems,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id);

      if (updateError) throw updateError;

      return apiSuccess({
        summary,
        action_items: actionItems,
        message: "AI-powered summary generated successfully",
      });
    } catch (hfError) {
      console.error("Hugging Face processing failed:", hfError);
      return generateFallbackSummary(params.id, meeting, serviceSupabase);
    }
  } catch (error) {
    console.error("Summarization error:", error);
    return apiError(
      "Failed to generate summary",
      500,
      "SUMMARIZATION_ERROR",
      error instanceof Error ? error.message : undefined
    );
  }
}

async function generateFallbackSummary(meetingId: string, meeting: any, serviceSupabase: any) {
  const lines: string[] = meeting.transcript.split("\n").filter((line: string) => line.trim());
  const totalLines = lines.length;

  const sentenceEndPattern = /[.!?]$/;
  const speakerPattern = /\[(\d{2}:\d{2})\]\s*Speaker\s*[A-Z]:\s*(.*)/;

  const keyPoints: string[] = [];
  const decisions: string[] = [];
  const participants = new Set<string>();
  const topics = new Set<string>();

  const importantPhrases = [
    "decision",
    "decided",
    "agree",
    "proposal",
    "propose",
    "will",
    "action",
    "problem",
    "issue",
    "concern",
    "solution",
    "plan",
    "next steps",
  ];

  const topicIndicators: Record<string, string> = {
    meeting: "Meeting structure",
    metric: "Metrics and KPIs",
    bug: "Bug tracking",
    security: "Security concerns",
    infrastructure: "Infrastructure",
    community: "Community engagement",
    slo: "SLO compliance",
    rate: "Performance metrics",
  };

  lines.forEach((line: string, index: number) => {
    const speakerMatch = line.match(speakerPattern);
    if (speakerMatch) {
      participants.add(speakerMatch[0].split("Speaker")[1].split(":")[0].trim());
      const content = speakerMatch[2];

      const lowerContent = content.toLowerCase();
      Object.entries(topicIndicators).forEach(([key, topic]) => {
        if (lowerContent.includes(key)) {
          topics.add(topic);
        }
      });

      const hasImportantPhrase = importantPhrases.some((phrase: string) => lowerContent.includes(phrase));

      if (hasImportantPhrase && sentenceEndPattern.test(content.trim())) {
        if (
          lowerContent.includes("decision") ||
          lowerContent.includes("decided") ||
          lowerContent.includes("agree") ||
          lowerContent.includes("will")
        ) {
          decisions.push(content.trim());
        } else if (keyPoints.length < 10) {
          keyPoints.push(content.trim());
        }
      }
    }
  });

  const firstSentences = lines
    .slice(0, Math.min(10, totalLines))
    .filter((line: string) => line.match(speakerPattern))
    .map((line: string) => {
      const match = line.match(speakerPattern);
      return match ? match[2] : "";
    })
    .filter((text: string) => text && sentenceEndPattern.test(text.trim()))
    .slice(0, 3);

  const overview =
    firstSentences.length > 0
      ? firstSentences.join(" ").substring(0, 500) + "..."
      : `Meeting with ${participants.size} participants discussing ${Array.from(topics).slice(0, 3).join(", ")}.`;

  const summary = {
    overview: overview.replace(/\s+/g, " ").trim(),
    key_points: [
      ...Array.from(topics)
        .slice(0, 3)
        .map((topic: string) => `Discussion about ${topic}`),
      ...keyPoints.slice(0, 5).map((point: string) => point.substring(0, 200)),
      `${participants.size} participants in the meeting`,
    ].filter((point: string) => point.length > 10),
    decisions: decisions.slice(0, 5).map((d: string) => d.substring(0, 200)),
    next_steps: keyPoints
      .filter((point: string) => {
        const lower = point.toLowerCase();
        return (
          lower.includes("will") || lower.includes("next") || lower.includes("action") || lower.includes("follow up")
        );
      })
      .slice(0, 5)
      .map((step: string) => step.substring(0, 200)),
  };

  const actionItems = decisions.slice(0, 5).map((decision, index) => ({
    id: `${meetingId}_action_${index}`,
    task: decision.substring(0, 200),
    assignee: null,
    due_date: null,
    priority: "medium" as const,
    completed: false,
  }));

  const { error: updateError } = await serviceSupabase
    .from("meetings")
    .update({
      summary,
      action_items: actionItems,
      updated_at: new Date().toISOString(),
    })
    .eq("id", meetingId);

  if (updateError) throw updateError;

  return apiSuccess({
    summary,
    action_items: actionItems,
    message: "Basic summary generated (Hugging Face unavailable)",
    fallback: true,
  });
}
