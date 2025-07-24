import { apiSuccess } from "@/lib/api/response";

export async function GET() {
  return apiSuccess({
    transcriptionEnabled: !!process.env.ASSEMBLYAI_API_KEY,
    summarizationEnabled: !!process.env.HUGGINGFACE_API_KEY,
  });
}
