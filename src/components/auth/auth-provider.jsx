"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

const AuthContext = createContext({
    user: null,
    profile: null,
    loading: true,
});

// Fetch profile via server-side API (bypasses RLS on profiles table)
async function fetchProfileFromAPI() {
    try {
        const res = await fetch("/api/profile");
        if (!res.ok) return null;
        const json = await res.json();
        return json.success ? json.data : null;
    } catch {
        return null;
    }
}

function clearStaleAuthStorage() {
    if (typeof window === "undefined") return;
    try {
        const keys = Object.keys(window.localStorage || {});
        keys
            .filter((key) => key.startsWith("sb-") && key.endsWith("-auth-token"))
            .forEach((key) => window.localStorage.removeItem(key));
    } catch {
        // Ignore storage errors in private/restricted environments.
    }
}

function isRecoverableAuthError(error) {
    const message = (error?.message || "").toLowerCase();
    return (
        message.includes("invalid refresh token") ||
        message.includes("refresh token not found") ||
        message.includes("jwt") ||
        message.includes("invalid_grant")
    );
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = getSupabaseClient();
        if (!supabase) {
            Promise.resolve().then(() => setLoading(false));
            return;
        }

        let active = true;

        const initializeAuth = async () => {
            try {
                const { data: { user: u }, error } = await supabase.auth.getUser();

                if (error) {
                    if (isRecoverableAuthError(error)) {
                        try {
                            await supabase.auth.signOut({ scope: "local" });
                        } catch {
                            // Ignore signout failure and clear stale token directly.
                        }
                        clearStaleAuthStorage();
                        if (active) {
                            setUser(null);
                            setProfile(null);
                            setLoading(false);
                        }
                        return;
                    }
                    throw error;
                }

                if (!active) return;
                setUser(u ?? null);
                if (u) {
                    const p = await fetchProfileFromAPI();
                    if (active) setProfile(p);
                } else {
                    setProfile(null);
                }
            } catch {
                if (active) {
                    setUser(null);
                    setProfile(null);
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        initializeAuth();

        // Listen for auth state changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!active) return;
            const u = session?.user ?? null;
            setUser(u);
            if (u) {
                const p = await fetchProfileFromAPI();
                if (active) setProfile(p);
            } else {
                setProfile(null);
            }
        });

        return () => {
            active = false;
            subscription.unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, profile, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
