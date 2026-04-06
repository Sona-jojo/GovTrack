"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { ROLE_LABELS } from "@/lib/constants";
import { pick } from "@/lib/language-utils";

export function LoginForm({ lang = "en" }) {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const supabase = getSupabaseClient();
            if (!supabase) throw new Error("Supabase not configured");

            const { data, error: authError } =
                await supabase.auth.signInWithPassword({ email, password });
            if (authError) throw authError;

            // Fetch profile to get role (via API to bypass RLS)
            const profileRes = await fetch("/api/profile");
            const profileJson = await profileRes.json();

            if (!profileRes.ok || !profileJson.data) {
                throw new Error("No profile found. Contact your administrator.");
            }
            const profile = profileJson.data;

            // Route based on role
            const redirectMap = {
                secretary: "/dashboard/secretary",
                engineer: "/dashboard/engineer",
                clerk: "/dashboard/clerk",
            };
            router.push(redirectMap[profile.role] || "/dashboard");
        } catch (err) {
            setError(err.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label
                    htmlFor="login-email"
                    className="block text-sm font-semibold text-slate-700"
                >
                    {pick(lang, "Email Address", "ഇമെയിൽ വിലാസം")}
                </label>
                <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={pick(lang, "Enter your email", "ഇമെയിൽ നൽകുക")}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-600"
                />
            </div>

            <div>
                <label
                    htmlFor="login-password"
                    className="block text-sm font-semibold text-slate-700"
                >
                    {pick(lang, "Password", "പാസ്‌വേഡ്")}
                </label>
                <input
                    id="login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={pick(lang, "Enter password", "പാസ്‌വേഡ് നൽകുക")}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-600"
                />
            </div>

            {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                    {error}
                </p>
            )}

            <button
                type="submit"
                disabled={loading}
                className="ui-button-primary w-full rounded-xl px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-70"
            >
                {loading
                    ? pick(lang, "Signing in…", "പ്രവേശിക്കുന്നു…")
                    : pick(lang, "Sign In", "പ്രവേശിക്കുക")}
            </button>

            <p className="text-center text-xs text-slate-500">
                {pick(
                    lang,
                    "For Panchayath Officials only (Secretary, Engineer, Clerk)",
                    "പഞ്ചായത്ത് ഉദ്യോഗസ്ഥർക്ക് മാത്രം (സെക്രട്ടറി, എൻജിനീയർ, ക്ലർക്ക്)",
                )}
            </p>
        </form>
    );
}
