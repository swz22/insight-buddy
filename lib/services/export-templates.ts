import { Database } from "@/types/supabase";
import { ExportSections, ExportMetadata } from "@/types/export";
import { format } from "date-fns";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

export function generateTextContent(meeting: Meeting, sections: ExportSections, userEmail: string): string {
  const parts: string[] = [];
  const metadata = createExportMetadata(meeting, userEmail);

  if (sections.metadata) {
    parts.push("=".repeat(60));
    parts.push("MEETING REPORT");
    parts.push("=".repeat(60));
    parts.push(`Title: ${metadata.title}`);
    parts.push(`Date: ${metadata.date}`);
    parts.push(`Duration: ${metadata.duration}`);
    parts.push(`Participants: ${metadata.participants.join(", ")}`);
    parts.push(`Exported: ${metadata.exportedAt}`);
    parts.push("=".repeat(60));
    parts.push("");
  }

  if (sections.transcript && meeting.transcript) {
    parts.push("TRANSCRIPT");
    parts.push("-".repeat(40));
    parts.push(meeting.transcript);
    parts.push("");
  }

  if (sections.summary && meeting.summary) {
    parts.push("SUMMARY");
    parts.push("-".repeat(40));

    if (typeof meeting.summary === "string") {
      parts.push(meeting.summary);
    } else if (meeting.summary && typeof meeting.summary === "object") {
      const summaryObj = meeting.summary as any;

      if (summaryObj.overview) {
        parts.push(`Overview: ${summaryObj.overview}`);
        parts.push("");
      }

      if (summaryObj.key_points && Array.isArray(summaryObj.key_points)) {
        parts.push("Key Points:");
        summaryObj.key_points.forEach((point: string, i: number) => {
          parts.push(`${i + 1}. ${point}`);
        });
        parts.push("");
      }

      if (summaryObj.decisions && Array.isArray(summaryObj.decisions)) {
        parts.push("Decisions:");
        summaryObj.decisions.forEach((decision: string, i: number) => {
          parts.push(`${i + 1}. ${decision}`);
        });
        parts.push("");
      }

      if (summaryObj.next_steps && Array.isArray(summaryObj.next_steps)) {
        parts.push("Next Steps:");
        summaryObj.next_steps.forEach((step: string, i: number) => {
          parts.push(`${i + 1}. ${step}`);
        });
        parts.push("");
      }
    }
    parts.push("");
  }

  if (sections.actionItems && meeting.action_items && Array.isArray(meeting.action_items)) {
    parts.push("ACTION ITEMS");
    parts.push("-".repeat(40));
    meeting.action_items.forEach((item: any, i: number) => {
      parts.push(`${i + 1}. ${item.task || item}`);
      if (item.assignee) parts.push(`   Assignee: ${item.assignee}`);
      if (item.due_date) parts.push(`   Due: ${format(new Date(item.due_date), "PPP")}`);
      if (item.priority) parts.push(`   Priority: ${item.priority}`);
      if (typeof item.completed !== "undefined") {
        parts.push(`   Status: ${item.completed ? "Completed" : "Pending"}`);
      }
      parts.push("");
    });
  }

  return parts.join("\n");
}

export function createExportMetadata(meeting: Meeting, userEmail: string): ExportMetadata {
  return {
    title: meeting.title,
    date: meeting.recorded_at
      ? format(new Date(meeting.recorded_at), "PPP")
      : format(new Date(meeting.created_at), "PPP"),
    duration: formatDuration(meeting.duration),
    participants: meeting.participants || [],
    exportedAt: format(new Date(), "PPP 'at' p"),
    exportedBy: userEmail,
  };
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "N/A";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}
