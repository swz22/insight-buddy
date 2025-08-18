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
            new TextRun((meeting.participants || []).join(", ") || "N/A"),
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
        })
      );

      if (typeof meeting.summary === "string") {
        children.push(
          new Paragraph({
            text: meeting.summary,
            spacing: { after: 300 },
          })
        );
      } else if (meeting.summary && typeof meeting.summary === "object") {
        const summaryObj = meeting.summary as any;

        if (summaryObj.overview) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: "Overview: ", bold: true }), new TextRun(summaryObj.overview)],
              spacing: { after: 120 },
            })
          );
        }

        if (summaryObj.key_points && Array.isArray(summaryObj.key_points)) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: "Key Points:", bold: true })],
              spacing: { after: 60 },
            })
          );
          summaryObj.key_points.forEach((point: string, i: number) => {
            children.push(
              new Paragraph({
                text: `${i + 1}. ${point}`,
                spacing: { after: 60 },
              })
            );
          });
        }

        if (summaryObj.decisions && Array.isArray(summaryObj.decisions)) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: "Decisions:", bold: true })],
              spacing: { before: 120, after: 60 },
            })
          );
          summaryObj.decisions.forEach((decision: string, i: number) => {
            children.push(
              new Paragraph({
                text: `${i + 1}. ${decision}`,
                spacing: { after: 60 },
              })
            );
          });
        }

        if (summaryObj.next_steps && Array.isArray(summaryObj.next_steps)) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: "Next Steps:", bold: true })],
              spacing: { before: 120, after: 60 },
            })
          );
          summaryObj.next_steps.forEach((step: string, i: number) => {
            children.push(
              new Paragraph({
                text: `${i + 1}. ${step}`,
                spacing: { after: 60 },
              })
            );
          });
        }
      }
    }

    if (sections.actionItems && meeting.action_items && meeting.action_items.length > 0) {
      children.push(
        new Paragraph({
          text: "Action Items",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 },
        })
      );

      meeting.action_items.forEach((item: any) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `• ${item.task}`, bold: true })],
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
          text: meeting.transcript || "",
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

  async sendEmailExport(params: EmailExportParams, exportBlob: Blob, filename: string, userId: string): Promise<void> {
    const { createServiceRoleClient } = await import("@/lib/supabase/service");
    const supabase = createServiceRoleClient();

    const fileExt = filename.split(".").pop() || "pdf";
    const filePath = `${userId}/exports/${params.meetingId}/${Date.now()}-${filename}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("meeting-recordings")
      .upload(filePath, exportBlob, {
        contentType: exportBlob.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("meeting-recordings")
      .createSignedUrl(filePath, 3600);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      await supabase.storage.from("meeting-recordings").remove([filePath]);
      throw new Error(`Failed to create signed URL: ${signedUrlError?.message || "Unknown error"}`);
    }

    const { data: meeting } = await supabase
      .from("meetings")
      .select("title, recorded_at, duration, participants")
      .eq("id", params.meetingId)
      .single();

    if (!meeting) {
      await supabase.storage.from("meeting-recordings").remove([filePath]);
      throw new Error("Meeting not found");
    }

    const { data, error } = await supabase.functions.invoke("send-meeting-export", {
      body: {
        ...params,
        fileUrl: signedUrlData.signedUrl,
        fileName: filename,
        meeting: {
          title: meeting.title || "Untitled Meeting",
          recorded_at: meeting.recorded_at || new Date().toISOString(),
          duration: meeting.duration || 0,
          participants: meeting.participants || [],
        },
      },
    });

    if (error) {
      await supabase.storage.from("meeting-recordings").remove([filePath]);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    setTimeout(async () => {
      try {
        await supabase.storage.from("meeting-recordings").remove([filePath]);
      } catch (cleanupError) {
        console.error("Failed to clean up export file:", cleanupError);
      }
    }, 60000);
  }
}
