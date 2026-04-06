import { getSupabaseClient } from "@/lib/supabase/client";

/** Sign in with email + password via Supabase Auth. */
export async function signIn(email, password) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase not configured");
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    if (error) throw error;
    return data;
}

/** Sign out the current user. */
export async function signOut() {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
}

/** Get the current session (client-side). */
export async function getSession() {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    const {
        data: { session },
    } = await supabase.auth.getSession();
    return session;
}

/** Fetch the user's profile via API (bypasses RLS). */
export async function getProfile(userId) {
    try {
        const res = await fetch("/api/profile");
        const json = await res.json();
        if (!res.ok || !json.data) return null;
        return json.data;
    } catch {
        return null;
    }
}
