import React from "react";
import { Database } from "@/types/supabase";
import { ExportSections } from "@/types/export";
import { format } from "date-fns";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface PDFTemplateProps {
  meeting: Meeting;
  sections: ExportSections;
  userEmail: string;
}

export const PDFTemplate: React.FC<PDFTemplateProps> = ({ meeting, sections, userEmail }) => {
  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "N/A";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        color: "#1a1a1a",
        padding: "40px",
        maxWidth: "800px",
        margin: "0 auto",
      }}
    >
      {sections.metadata && (
        <div style={{ marginBottom: "40px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "8px", color: "#111" }}>{meeting.title}</h1>
          <div style={{ fontSize: "14px", color: "#666", marginBottom: "20px" }}>
            <p>Date: {meeting.recorded_at ? format(new Date(meeting.recorded_at), "PPP") : "N/A"}</p>
            <p>Duration: {formatDuration(meeting.duration)}</p>
            <p>Participants: {meeting.participants?.join(", ") || "N/A"}</p>
            <p style={{ marginTop: "10px", fontSize: "12px" }}>
              Exported on {format(new Date(), "PPP 'at' p")} by {userEmail}
            </p>
          </div>
        </div>
      )}

      {sections.summary && meeting.summary && (
        <div style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "16px", color: "#111" }}>Summary</h2>
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>Overview</h3>
            <p style={{ lineHeight: "1.6" }}>{meeting.summary.overview}</p>
          </div>

          {meeting.summary.key_points.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>Key Points</h3>
              <ul style={{ paddingLeft: "20px" }}>
                {meeting.summary.key_points.map((point: string, i: number) => (
                  <li key={i} style={{ marginBottom: "4px", lineHeight: "1.6" }}>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {meeting.summary.decisions.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>Decisions</h3>
              <ul style={{ paddingLeft: "20px" }}>
                {meeting.summary.decisions.map((decision: string, i: number) => (
                  <li key={i} style={{ marginBottom: "4px", lineHeight: "1.6" }}>
                    {decision}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {meeting.summary.next_steps.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>Next Steps</h3>
              <ul style={{ paddingLeft: "20px" }}>
                {meeting.summary.next_steps.map((step: string, i: number) => (
                  <li key={i} style={{ marginBottom: "4px", lineHeight: "1.6" }}>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {sections.actionItems && meeting.action_items && meeting.action_items.length > 0 && (
        <div style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "16px", color: "#111" }}>Action Items</h2>
          {meeting.action_items.map((item: any, i: number) => (
            <div
              key={i}
              style={{ marginBottom: "16px", padding: "12px", backgroundColor: "#f5f5f5", borderRadius: "8px" }}
            >
              <p style={{ fontWeight: "600", marginBottom: "4px" }}>{item.task}</p>
              <div style={{ fontSize: "14px", color: "#666" }}>
                {item.assignee && <p>Assignee: {item.assignee}</p>}
                {item.due_date && <p>Due: {format(new Date(item.due_date), "PPP")}</p>}
                <p>
                  Priority: <span style={{ textTransform: "capitalize" }}>{item.priority}</span>
                </p>
                <p>Status: {item.completed ? "✓ Completed" : "⏳ Pending"}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {sections.transcript && meeting.transcript && (
        <div style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "16px", color: "#111" }}>Transcript</h2>
          <div style={{ lineHeight: "1.8", whiteSpace: "pre-wrap" }}>{meeting.transcript}</div>
        </div>
      )}
    </div>
  );
};
