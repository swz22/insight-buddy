import { Database } from "@/types/supabase";
import { ExportFormat, ExportSections, EmailExportParams } from "@/types/export";
import { generateTextContent } from "./export-templates";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

export class ExportService {
  async generateExport(
    meeting: Meeting,
    format: ExportFormat,
    sections: ExportSections,
    userEmail: string,
    insights?: any
  ): Promise<Blob> {
    switch (format) {
      case "txt":
        return this.generateTextExport(meeting, sections, userEmail, insights);
      case "pdf":
        return this.generatePDFExport(meeting, sections, userEmail, insights);
      case "docx":
        return this.generateWordExport(meeting, sections, userEmail, insights);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private async generateTextExport(
    meeting: Meeting,
    sections: ExportSections,
    userEmail: string,
    insights?: any
  ): Promise<Blob> {
    let content = generateTextContent(meeting, sections, userEmail);

    if (sections.insights && insights) {
      content += "\n\nINSIGHTS\n" + "-".repeat(40) + "\n";
      content += this.formatInsightsAsText(insights);
    }

    return new Blob([content], { type: "text/plain;charset=utf-8" });
  }

  private async generatePDFExport(
    meeting: Meeting,
    sections: ExportSections,
    userEmail: string,
    insights?: any
  ): Promise<Blob> {
    if (typeof window === "undefined") {
      const { renderPDFOnServer } = await import("./pdf-server-renderer");
      return renderPDFOnServer(meeting, sections, userEmail, insights);
    }

    throw new Error("PDF generation must be done on the server");
  }

  private async generateWordExport(
    meeting: Meeting,
    sections: ExportSections,
    userEmail: string,
    insights?: any
  ): Promise<Blob> {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");

    const children: any[] = [];

    if (sections.metadata) {
      children.push(
        new Paragraph({
          text: meeting.title,
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 300 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Date: ", bold: true }),
            new TextRun(meeting.recorded_at ? new Date(meeting.recorded_at).toLocaleDateString() : "N/A"),
          ],
          spacing: { after: 120 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Duration: ", bold: true }),
            new TextRun(this.formatDuration(meeting.duration)),
          ],
          spacing: { after: 120 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Participants: ", bold: true }),
            new TextRun(meeting.participants?.join(", ") || "N/A"),
          ],
          spacing: { after: 300 },
        })
      );
    }

    if (sections.summary && meeting.summary) {
      children.push(
        new Paragraph({
          text: "Summary",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          text: meeting.summary.overview,
          spacing: { after: 300 },
        })
      );

      if (meeting.summary.key_points.length > 0) {
        children.push(
          new Paragraph({
            text: "Key Points",
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 300, after: 150 },
          })
        );
        meeting.summary.key_points.forEach((point: string) => {
          children.push(
            new Paragraph({
              text: `• ${point}`,
              spacing: { after: 120 },
            })
          );
        });
      }
    }

    if (sections.actionItems && meeting.action_items) {
      children.push(
        new Paragraph({
          text: "Action Items",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 },
        })
      );

      meeting.action_items.forEach((item: any, i: number) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `${i + 1}. ${item.task}`, bold: true })],
            spacing: { after: 60 },
          })
        );

        if (item.assignee || item.due_date || item.priority) {
          const details: any[] = [];
          if (item.assignee) details.push(new TextRun(`   Assignee: ${item.assignee}\n`));
          if (item.due_date) details.push(new TextRun(`   Due: ${new Date(item.due_date).toLocaleDateString()}\n`));
          details.push(
            new TextRun(`   Priority: ${item.priority} | Status: ${item.completed ? "Completed" : "Pending"}`)
          );

          children.push(
            new Paragraph({
              children: details,
              spacing: { after: 180 },
            })
          );
        }
      });
    }

    if (sections.transcript && meeting.transcript) {
      children.push(
        new Paragraph({
          text: "Transcript",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          text: meeting.transcript,
          spacing: { after: 300 },
        })
      );
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: children,
        },
      ],
    });

    const buffer = await Packer.toBlob(doc);
    return buffer;
  }

  private formatDuration(seconds: number | null): string {
    if (!seconds) return "N/A";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  private formatInsightsAsText(insights: any): string {
    let text = "";

    if (insights.speaker_metrics) {
      text += "\nSpeaker Participation:\n";
      insights.speaker_metrics.forEach((speaker: any) => {
        text += `- ${speaker.speaker}: ${speaker.speakingPercentage}% (${speaker.turnCount} turns)\n`;
      });
    }

    if (insights.engagement_score) {
      text += `\nEngagement Score: ${insights.engagement_score}/100\n`;
    }

    if (insights.key_moments && insights.key_moments.length > 0) {
      text += "\nKey Moments:\n";
      insights.key_moments.forEach((moment: any) => {
        text += `- ${moment.description} (${moment.type})\n`;
      });
    }

    return text;
  }

  async sendEmailExport(params: EmailExportParams, exportBlob: Blob, filename: string): Promise<void> {
    const formData = new FormData();
    formData.append("file", exportBlob, filename);
    formData.append("params", JSON.stringify(params));

    const response = await fetch("/api/meetings/export/email", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to send email");
    }
  }
}
