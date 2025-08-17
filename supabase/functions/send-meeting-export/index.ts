// @ts-nocheck
/* eslint-disable */

// Import using the import map defined in deno.json
import { createClient } from "@supabase/supabase-js";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

function generateEmailHTML(data) {
  const sectionsList = Object.entries(data.includedSections)
    .filter(([_, included]) => included)
    .map(([section]) => {
      const sectionNames = {
        metadata: "Meeting Details",
        transcript: "Full Transcript",
        summary: "AI Summary",
        actionItems: "Action Items",
        insights: "Analytics & Insights",
      };
      return sectionNames[section];
    })
    .join(", ");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meeting Export: ${data.meetingTitle}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="text-align: center; padding-bottom: 32px;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">
                Insight <span style="background: linear-gradient(to right, #a855f7, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Buddy</span>
              </h1>
            </td>
          </tr>
          
          <tr>
            <td style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 32px;">
              <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #ffffff;">
                Meeting Export Ready
              </h2>
              
              ${
                data.customMessage
                  ? `
              <div style="background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; color: #e9d5ff; font-size: 16px; line-height: 1.5;">
                  ${data.customMessage}
                </p>
              </div>
              `
                  : ""
              }
              
              <div style="margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                  <strong>Meeting:</strong> ${data.meetingTitle}
                </p>
                <p style="margin: 0 0 8px 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                  <strong>Format:</strong> ${data.format}
                </p>
                <p style="margin: 0 0 8px 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                  <strong>Exported by:</strong> ${data.exportedBy}
                </p>
                <p style="margin: 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                  <strong>Includes:</strong> ${sectionsList}
                </p>
              </div>
              
              <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; text-align: center;">
                <p style="margin: 0 0 12px 0; color: rgba(255, 255, 255, 0.7); font-size: 14px;">
                  Your meeting export is attached to this email.
                </p>
                <p style="margin: 0; color: rgba(255, 255, 255, 0.7); font-size: 14px;">
                  <strong>Attachment:</strong> ${data.fileName}
                </p>
              </div>
            </td>
          </tr>
          
          <tr>
            <td style="text-align: center; padding-top: 32px;">
              <p style="margin: 0 0 8px 0; color: rgba(255, 255, 255, 0.5); font-size: 14px;">
                Powered by Insight Buddy - AI Meeting Intelligence
              </p>
              <p style="margin: 0; color: rgba(255, 255, 255, 0.3); font-size: 12px;">
                This email was sent because someone exported a meeting from Insight Buddy.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();

    const fileResponse = await fetch(body.fileUrl, {
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    if (!fileResponse.ok) {
      throw new Error("Failed to fetch export file");
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const fileBase64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));

    const formatNames = {
      pdf: "PDF",
      docx: "Word Document",
      txt: "Text File",
    };

    for (const recipientEmail of body.recipientEmails) {
      const emailHtml = generateEmailHTML({
        meetingTitle: body.meeting.title,
        exportedBy: body.exportedBy.name || body.exportedBy.email,
        customMessage: body.customMessage,
        format: formatNames[body.format],
        fileName: body.fileName,
        includedSections: body.sections,
      });

      const emailData = {
        from: "Insight Buddy <noreply@insightbuddy.app>",
        to: [recipientEmail],
        subject: `Meeting Export: ${body.meeting.title}`,
        html: emailHtml,
        attachments: [
          {
            filename: body.fileName,
            content: fileBase64,
            content_type:
              body.format === "pdf"
                ? "application/pdf"
                : body.format === "docx"
                ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                : "text/plain",
          },
        ],
      };

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify(emailData),
      });

      if (!resendResponse.ok) {
        const error = await resendResponse.text();
        console.error("Resend API error:", error);
        throw new Error(`Failed to send email to ${recipientEmail}`);
      }

      const result = await resendResponse.json();
      console.log(`Email sent successfully to ${recipientEmail}:`, result.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Export sent to ${body.recipientEmails.length} recipient(s)`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Edge Function error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to send email",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
