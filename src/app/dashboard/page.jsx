"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";

export default function DashboardRouter() {
    const { profile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;
        if (!profile) {
            router.replace("/login");
            return;
        }
        const routeMap = {
            admin: "/dashboard/admin",
            secretary: "/dashboard/secretary",
            engineer: "/dashboard/engineer",
            clerk: "/dashboard/clerk",
        };
        router.replace(routeMap[profile.role] || "/login");
    }, [profile, loading, router]);

    return (
        <main className="ui-bg flex min-h-screen items-center justify-center">
            <div className="animate-pulse text-slate-500">Redirecting…</div>
        </main>
    );
}
