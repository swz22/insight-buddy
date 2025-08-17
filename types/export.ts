export type ExportFormat = "pdf" | "docx" | "txt";
export type DeliveryMethod = "download" | "email";

export interface ExportSections {
  metadata: boolean;
  transcript: boolean;
  summary: boolean;
  actionItems: boolean;
  insights: boolean;
}

export interface ExportOptions {
  format: ExportFormat;
  sections: ExportSections;
  delivery: DeliveryMethod;
  recipients?: string[];
  message?: string;
}

export interface ExportMetadata {
  title: string;
  date: string;
  duration: string;
  participants: string[];
  exportedAt: string;
  exportedBy: string;
}

export interface EmailExportParams {
  meetingId: string;
  recipientEmails: string[];
  format: ExportFormat;
  sections: ExportSections;
  customMessage?: string;
  exportedBy: {
    email: string;
    name?: string;
  };
}
