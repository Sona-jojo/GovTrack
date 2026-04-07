import { createServerClient } from "@supabase/ssr";
import { apiSuccess, apiError, handleApiError } from "@/lib/error-handler";
import { z } from "zod";

const findComplaintSchema = z.object({
    phone: z.string().trim().regex(/^\d{10}$/, "Phone number must be exactly 10 digits").optional(),
    email: z.string().trim().regex(/^[^\s@]+@gmail\.com$/i, "Email must be a valid @gmail.com address").optional(),
});

// POST — Find complaints by citizen contact info (public, no auth)
export async function POST(request) {
    try {
        const body = await request.json();
        const parsed = findComplaintSchema.safeParse(body);
        if (!parsed.success) {
            return apiError("Please provide a valid phone number or email address", 422);
        }

        const phone = (parsed.data.phone || "").trim();
        const email = (parsed.data.email || "").trim().toLowerCase();

        if (!phone && !email) {
            return apiError("Phone number or email is required", 422);
        }

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
                setAll() {
                },
            },
        });

        const baseFields = "tracking_id, category, status, created_at";
        let rows = [];

        if (phone && email) {
            const [phoneResult, emailResult] = await Promise.all([
                supabase
                    .from("complaints")
                    .select(baseFields)
                    .eq("reporter_phone", phone)
                    .order("created_at", { ascending: false })
                    .limit(25),
                supabase
                    .from("complaints")
                    .select(baseFields)
                    .eq("reporter_email", email)
                    .order("created_at", { ascending: false })
                    .limit(25),
            ]);

            if (phoneResult.error) throw phoneResult.error;
            if (emailResult.error) throw emailResult.error;

            const byTrackingId = new Map();
            [...(phoneResult.data || []), ...(emailResult.data || [])].forEach((item) => {
                if (!byTrackingId.has(item.tracking_id)) {
                    byTrackingId.set(item.tracking_id, item);
                }
            });

            rows = Array.from(byTrackingId.values())
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 25);
        } else if (phone) {
            const { data, error } = await supabase
                .from("complaints")
                .select(baseFields)
                .eq("reporter_phone", phone)
                .order("created_at", { ascending: false })
                .limit(25);
            if (error) throw error;
            rows = data || [];
        } else {
            const { data, error } = await supabase
                .from("complaints")
                .select(baseFields)
                .eq("reporter_email", email)
                .order("created_at", { ascending: false })
                .limit(25);
            if (error) throw error;
            rows = data || [];
        }

        const complaints = rows.map((item) => ({
            tracking_id: item.tracking_id,
            category: item.category,
            status: item.status,
            created_at: item.created_at,
        }));

        return apiSuccess({ complaints, count: complaints.length });
    } catch (err) {
        return handleApiError(err);
    }
}
