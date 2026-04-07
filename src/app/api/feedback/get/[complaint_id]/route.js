import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { apiSuccess, apiError, handleApiError } from "@/lib/error-handler";
import { z } from "zod";

const idSchema = z.string().uuid();

export async function GET(_request, { params }) {
  try {
    const resolvedParams = params?.then ? await params : params;
    const complaintId = String(resolvedParams?.complaint_id || "").trim();
    const parsedComplaintId = idSchema.safeParse(complaintId);

    if (!parsedComplaintId.success) {
      return apiError("Invalid complaint ID", 422);
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !anonKey) {
      return apiError("Supabase is not configured", 500);
    }

    const cookieStore = await cookies();

    const authSupabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    });

    const dataSupabase = createServerClient(url, serviceKey || anonKey, {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    });

    const { data: complaint, error: complaintError } = await dataSupabase
      .from("complaints")
      .select("id, assigned_to")
      .eq("id", complaintId)
      .maybeSingle();

    if (complaintError) throw complaintError;
    if (!complaint) {
      return apiError("Complaint not found", 404);
    }

    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (user) {
      const { data: profile, error: profileError } = await dataSupabase
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const role = String(profile?.role || "").toLowerCase();
      const isAdminOrSecretary = role === "admin" || role === "secretary";
      const isAssignedEngineerOrClerk =
        (role === "engineer" || role === "clerk") &&
        complaint.assigned_to &&
        complaint.assigned_to === user.id;

      if (!isAdminOrSecretary && !isAssignedEngineerOrClerk) {
        return apiError("Forbidden", 403);
      }
    }

    const { data, error } = await dataSupabase
      .from("complaint_feedback")
      .select("id, complaint_id, rating, feedback, created_at")
      .eq("complaint_id", complaintId)
      .maybeSingle();

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        return apiSuccess(null, "Feedback system is not initialized yet");
      }
      throw error;
    }

    return apiSuccess(data || null);
  } catch (err) {
    return handleApiError(err);
  }
}
