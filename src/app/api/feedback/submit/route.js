import { createServerClient } from "@supabase/ssr";
import { apiSuccess, apiError, handleApiError } from "@/lib/error-handler";
import { z } from "zod";

const submitFeedbackSchema = z.object({
  complaintId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().trim().max(300).optional().nullable(),
});

export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = submitFeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Please provide valid feedback details", 422);
    }

    const complaintId = parsed.data.complaintId;
    const rating = parsed.data.rating;
    const feedback = String(parsed.data.feedback || "").trim() || null;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const key = serviceKey || anonKey;

    if (!url || !key) {
      return apiError("Supabase is not configured", 500);
    }

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    });

    const { data: complaint, error: complaintError } = await supabase
      .from("complaints")
      .select("id, status")
      .eq("id", complaintId)
      .maybeSingle();

    if (complaintError) throw complaintError;
    if (!complaint) {
      return apiError("Complaint not found", 404);
    }

    const status = String(complaint.status || "").toLowerCase();
    if (!status || (status !== "resolved" && status !== "closed")) {
      return apiError("Feedback can be submitted only after resolution", 422);
    }

    const { data: existing, error: existingError } = await supabase
      .from("complaint_feedback")
      .select("id")
      .eq("complaint_id", complaintId)
      .maybeSingle();

    if (existingError) {
      if (existingError.code === "42P01" || existingError.code === "PGRST205") {
        return apiError("Feedback system is not initialized. Run sql/complaint-feedback.sql first.", 500);
      }
      throw existingError;
    }
    if (existing) {
      return apiError("Feedback already submitted for this complaint", 409);
    }

    const { data, error } = await supabase
      .from("complaint_feedback")
      .insert({
        complaint_id: complaintId,
        rating,
        feedback,
      })
      .select("id, complaint_id, rating, feedback, created_at")
      .single();

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        return apiError("Feedback system is not initialized. Run sql/complaint-feedback.sql first.", 500);
      }
      throw error;
    }

    return apiSuccess(data, "Feedback submitted successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
