import { Database } from "@/types/supabase";
import { ExportSections } from "@/types/export";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

export async function renderPDFOnServer(
  meeting: Meeting,
  sections: ExportSections,
  userEmail: string,
  insights?: any
): Promise<Blob> {
  // For now, we'll use jsPDF which works both client and server side
  // This is a simpler approach that doesn't require puppeteer
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  let yPosition = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // Helper function to add text with word wrap
  const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
    doc.setFontSize(fontSize);
    if (isBold) {
      doc.setFont("helvetica", "bold");
    } else {
      doc.setFont("helvetica", "normal");
    }

    const lines = doc.splitTextToSize(text, contentWidth);

    for (const line of lines) {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, margin, yPosition);
      yPosition += fontSize * 0.4;
    }
    yPosition += 5;
  };

  // Title and metadata
  if (sections.metadata) {
    addText(meeting.title, 24, true);
    yPosition += 5;

    addText(`Date: ${meeting.recorded_at ? new Date(meeting.recorded_at).toLocaleDateString() : "N/A"}`);
    addText(`Duration: ${formatDuration(meeting.duration)}`);
    addText(`Participants: ${meeting.participants?.join(", ") || "N/A"}`);
    addText(`Exported by: ${userEmail} on ${new Date().toLocaleString()}`);
    yPosition += 10;
  }

  // Summary
  if (sections.summary && meeting.summary) {
    addText("SUMMARY", 18, true);
    yPosition += 5;

    addText("Overview", 14, true);
    addText(meeting.summary.overview);
    yPosition += 5;

    if (meeting.summary.key_points.length > 0) {
      addText("Key Points", 14, true);
      meeting.summary.key_points.forEach((point: string, i: number) => {
        addText(`${i + 1}. ${point}`);
      });
      yPosition += 5;
    }

    if (meeting.summary.decisions.length > 0) {
      addText("Decisions", 14, true);
      meeting.summary.decisions.forEach((decision: string, i: number) => {
        addText(`${i + 1}. ${decision}`);
      });
      yPosition += 5;
    }

    if (meeting.summary.next_steps.length > 0) {
      addText("Next Steps", 14, true);
      meeting.summary.next_steps.forEach((step: string, i: number) => {
        addText(`${i + 1}. ${step}`);
      });
      yPosition += 5;
    }
  }

  // Action Items
  if (sections.actionItems && meeting.action_items && meeting.action_items.length > 0) {
    addText("ACTION ITEMS", 18, true);
    yPosition += 5;

    meeting.action_items.forEach((item: any, i: number) => {
      addText(`${i + 1}. ${item.task}`, 12, true);
      if (item.assignee) addText(`   Assignee: ${item.assignee}`);
      if (item.due_date) addText(`   Due: ${new Date(item.due_date).toLocaleDateString()}`);
      addText(`   Priority: ${item.priority} | Status: ${item.completed ? "Completed" : "Pending"}`);
      yPosition += 3;
    });
    yPosition += 5;
  }

  // Insights
  if (sections.insights && insights) {
    addText("INSIGHTS", 18, true);
    yPosition += 5;

    if (insights.speaker_metrics) {
      addText("Speaker Participation", 14, true);
      insights.speaker_metrics.forEach((speaker: any) => {
        addText(`${speaker.speaker}: ${speaker.speakingPercentage}% (${speaker.turnCount} turns)`);
      });
      yPosition += 5;
    }

    if (insights.engagement_score) {
      addText(`Engagement Score: ${insights.engagement_score}/100`);
      yPosition += 5;
    }
  }

  // Transcript
  if (sections.transcript && meeting.transcript) {
    addText("TRANSCRIPT", 18, true);
    yPosition += 5;
    addText(meeting.transcript);
  }

  const pdfBlob = doc.output("blob");
  return pdfBlob;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "N/A";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
