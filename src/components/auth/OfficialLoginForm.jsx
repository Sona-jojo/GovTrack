"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "./auth-provider";

const LOCAL_BODY_TYPE_LABELS = {
    grama_panchayat: "Grama Panchayat",
    block_panchayat: "Block Panchayat",
    municipality: "Municipality",
    corporation: "Corporation",
};

const OFFICIAL_ROLES = [
    { value: "secretary", label: "Secretary" },
    { value: "engineer", label: "Engineer" },
    { value: "clerk", label: "Clerk" },
];

const ROLE_REDIRECT = {
    secretary: "/dashboard/secretary",
    engineer: "/dashboard/engineer",
    clerk: "/dashboard/clerk",
    admin: "/dashboard/admin",
};

async function submitServerLogin({ email, password, role, localBodyId = null }) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase not configured");

    const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role, localBodyId }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Login failed");
    }

    const session = json.data?.session;
    if (session?.access_token && session?.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
        });
        if (sessionError) throw sessionError;
    }

    return json.data?.profile || null;
}

function Spinner() {
    return (
        <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
            aria-hidden="true"
        />
    );
}

function Input({ id, label, icon, ...props }) {
    return (
        <div>
            <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wide text-slate-700">
                {label}
            </label>
            <div className="relative mt-2 flex items-center">
                {icon && (
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-slate-400">
                        {icon}
                    </span>
                )}
                <input
                    id={id}
                    className={`w-full rounded-xl border-2 border-slate-200 bg-white/95 px-4 py-2.5 text-sm font-medium outline-none transition duration-300 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 ${icon ? "pl-10" : ""}`}
                    {...props}
                />
            </div>
        </div>
    );
}

function Select({ id, label, icon, disabled, children, ...props }) {
    return (
        <div>
            <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wide text-slate-700">
                {label}
            </label>
            <div className="relative mt-2 flex items-center">
                {icon && (
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-slate-400">
                        {icon}
                    </span>
                )}
                <select
                    id={id}
                    disabled={disabled}
                    className={`w-full appearance-none rounded-xl border-2 border-slate-200 bg-white/95 px-4 py-2.5 text-sm font-medium outline-none transition duration-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 ${icon ? "pl-10" : ""}`}
                    {...props}
                >
                    {children}
                </select>
                <svg className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
            </div>
        </div>
    );
}

function ErrorBox({ message }) {
    if (!message) return null;
    return (
        <div className="overflow-hidden rounded-xl bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 border-l-4 border-l-red-600 px-4 py-3 text-sm font-medium text-red-800 shadow-sm animate-fade-in">
            <div className="flex items-start gap-2.5">
                <span className="text-lg flex-shrink-0">⚠️</span>
                <span>{message}</span>
            </div>
        </div>
    );
}

// ─── ADMIN MODE ──────────────────────────────────────────────────────────────

function AdminForm() {
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
            const profile = await submitServerLogin({ email, password, role: "admin" });
            if (!profile) throw new Error("No profile found. Contact your administrator.");
            if (profile.role !== "admin") throw new Error("Access denied: Admin role required.");

            router.push("/dashboard/admin");
        } catch (err) {
            setError(err.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="rounded-xl border-2 border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50 px-4 py-3 text-xs font-semibold text-yellow-900 shadow-sm">
                <span className="inline-flex items-center gap-2">
                    <span>⚙️</span>
                    Admin Console Access
                </span>
            </div>

            <Input
                id="admin-email"
                label="Admin Email Address"
                type="email"
                icon="✉️"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                disabled={loading}
            />
            <Input
                id="admin-password"
                label="Admin Password"
                type="password"
                icon="🔐"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                disabled={loading}
            />
            <ErrorBox message={error} />
            <button
                type="submit"
                disabled={loading}
                className="ui-button-modern flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-lg transition duration-300 disabled:cursor-not-allowed disabled:opacity-50 hover:shadow-xl hover:scale-105 active:scale-95"
            >
                {loading ? (
                    <>
                        <Spinner />
                        <span>Signing in…</span>
                    </>
                ) : (
                    <>
                        <span>🔐 Sign In as Admin</span>
                        <span aria-hidden="true">→</span>
                    </>
                )}
            </button>
        </form>
    );
}

// ─── OFFICIAL MODE (4 steps) ──────────────────────────────────────────────────

function OfficialFormInner() {
    const router = useRouter();

    // Step state
    const [step, setStep] = useState(1); // 1–4

    // Selections
    const [selectedType, setSelectedType] = useState("");
    const [localBodies, setLocalBodies] = useState([]);
    const [selectedLocalBodyId, setSelectedLocalBodyId] = useState("");
    const [selectedRole, setSelectedRole] = useState("");
    const [officialOptions, setOfficialOptions] = useState([]);
    const [selectedOfficialId, setSelectedOfficialId] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // UI
    const [loadingBodies, setLoadingBodies] = useState(false);
    const [loadingOfficials, setLoadingOfficials] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Fetch local bodies when type changes
    useEffect(() => {
        if (!selectedType) return;
        setSelectedLocalBodyId("");
        setLocalBodies([]);
        setLoadingBodies(true);
        const supabase = getSupabaseClient();
        if (!supabase) { setLoadingBodies(false); return; }
        supabase
            .from("local_bodies")
            .select("id, name")
            .eq("type", selectedType)
            .order("name")
            .then(({ data, error: err }) => {
                if (!err) setLocalBodies(data || []);
                setLoadingBodies(false);
            });
    }, [selectedType]);

    const handleTypeChange = (e) => {
        setSelectedType(e.target.value);
        setError("");
    };

    const handleLocalBodyChange = (e) => {
        setSelectedLocalBodyId(e.target.value);
        setOfficialOptions([]);
        setSelectedOfficialId("");
        setEmail("");
        setError("");
    };

    const handleRoleChange = (e) => {
        setSelectedRole(e.target.value);
        setOfficialOptions([]);
        setSelectedOfficialId("");
        setEmail("");
        setError("");
    };

    useEffect(() => {
        if (!selectedLocalBodyId || !selectedRole) {
            setOfficialOptions([]);
            setSelectedOfficialId("");
            return;
        }

        let active = true;
        const loadOfficials = async () => {
            setLoadingOfficials(true);
            try {
                const params = new URLSearchParams({
                    localBodyId: selectedLocalBodyId,
                    role: selectedRole,
                });
                const res = await fetch(`/api/login/officials?${params.toString()}`, { cache: "no-store" });
                const json = await res.json();

                if (!res.ok || !json?.success) {
                    throw new Error(json?.message || "Failed to load official accounts");
                }

                if (!active) return;
                const rows = Array.isArray(json.data) ? json.data : [];
                setOfficialOptions(rows);
                if (rows.length === 1) {
                    setSelectedOfficialId(rows[0].id);
                    setEmail(rows[0].email || "");
                }
            } catch (err) {
                if (!active) return;
                setOfficialOptions([]);
                setSelectedOfficialId("");
                setError(err?.message || "Unable to load official accounts");
            } finally {
                if (active) setLoadingOfficials(false);
            }
        };

        loadOfficials();
        return () => {
            active = false;
        };
    }, [selectedLocalBodyId, selectedRole]);

    const handleOfficialAccountChange = (e) => {
        const id = e.target.value;
        setSelectedOfficialId(id);
        const picked = officialOptions.find((item) => item.id === id);
        if (picked?.email) {
            setEmail(picked.email);
        }
        setError("");
    };

    const goToStep = (n) => {
        setError("");
        setStep(n);
    };

    const handleStep1Next = () => {
        if (!selectedType) { setError("Please select a local body type."); return; }
        goToStep(2);
    };

    const handleStep2Next = () => {
        if (!selectedLocalBodyId) { setError("Please select a local body."); return; }
        goToStep(3);
    };

    const handleStep3Next = () => {
        if (!selectedRole) { setError("Please select your role."); return; }
        goToStep(4);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const profile = await submitServerLogin({
                email,
                password,
                role: selectedRole,
                localBodyId: selectedLocalBodyId,
            });

            if (!profile) throw new Error("No profile found. Contact your administrator.");

            router.push(ROLE_REDIRECT[profile.role] || "/dashboard");
        } catch (err) {
            setError(err.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    // Step indicator
    const steps = [
        { label: "Type", icon: "🏛️" },
        { label: "Body", icon: "📍" },
        { label: "Role", icon: "⚙️" },
        { label: "Access", icon: "🔓" },
    ];

    return (
        <div>
            {/* Enhanced Step progress indicator */}
            <div className="mb-7 px-1">
                {/* Row: circles and connector lines */}
                <div className="flex items-center gap-1 sm:gap-2">
                    {steps.map((s, i) => (
                        <div key={s.label} className="flex flex-1 items-center">
                            {/* Circle */}
                            <div className="flex flex-col items-center" style={{ minWidth: 36 }}>
                                <div
                                    className={`flex h-9 w-9 items-center justify-center rounded-full text-base font-bold transition-all duration-300 shadow-md ${step > i + 1
                                        ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-300"
                                        : step === i + 1
                                            ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-blue-300 ring-2 ring-white ring-offset-2 ring-offset-blue-200 scale-110"
                                            : "bg-gradient-to-br from-slate-200 to-slate-300 text-slate-500"
                                        }`}
                                >
                                    {step > i + 1 ? "✓" : s.icon}
                                </div>
                            </div>
                            {/* Connector line (not for last step) */}
                            {i < steps.length - 1 && (
                                <div className="relative mx-1.5 h-1 flex-1 rounded-full bg-gradient-to-r from-slate-200 to-slate-300 sm:mx-2.5">
                                    <div
                                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 shadow-sm transition-all duration-500"
                                        style={{ width: step > i + 1 ? "100%" : "0%" }}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                {/* Row: labels below circles */}
                <div className="mt-2.5 flex items-start gap-1 sm:gap-2">
                    {steps.map((s, i) => (
                        <div key={s.label} className="flex flex-1 flex-col items-center">
                            <span
                                className={`text-center text-[11px] font-bold leading-tight transition-colors duration-300 ${step === i + 1
                                    ? "text-blue-700"
                                    : step > i + 1
                                        ? "text-emerald-600"
                                        : "text-slate-400"
                                    }`}
                            >
                                {s.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <ErrorBox message={error} />

            {/* STEP 1 */}
            {step === 1 && (
                <div className="mt-6 space-y-5 animate-fadeIn">
                    <Select
                        id="local-body-type"
                        label="Local Body Type"
                        icon="🏛️"
                        value={selectedType}
                        onChange={handleTypeChange}
                    >
                        <option value="">Select your governing body type…</option>
                        {Object.entries(LOCAL_BODY_TYPE_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                        ))}
                    </Select>
                    <button
                        onClick={handleStep1Next}
                        disabled={!selectedType}
                        className="ui-button-modern w-full rounded-xl px-5 py-3 text-sm font-bold text-white shadow-lg transition duration-300 disabled:cursor-not-allowed disabled:opacity-50 hover:shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                    >
                        Continue
                        <span aria-hidden="true">→</span>
                    </button>
                </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
                <div className="mt-6 space-y-5 animate-fadeIn">
                    <Select
                        id="local-body"
                        label="Select Local Body"
                        icon="📍"
                        value={selectedLocalBodyId}
                        onChange={handleLocalBodyChange}
                        disabled={loadingBodies}
                    >
                        <option value="">
                            {loadingBodies ? "Loading local bodies…" : "Choose your local body…"}
                        </option>
                        {localBodies.map((lb) => (
                            <option key={lb.id} value={lb.id}>{lb.name}</option>
                        ))}
                    </Select>
                    <div className="flex gap-3">
                        <button
                            onClick={() => goToStep(1)}
                            className="ui-button-ghost flex-1 rounded-xl border-2 border-slate-300 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-700 transition duration-300 hover:bg-white hover:border-slate-400 hover:shadow-md"
                        >
                            ← Back
                        </button>
                        <button
                            onClick={handleStep2Next}
                            disabled={!selectedLocalBodyId || loadingBodies}
                            className="ui-button-modern flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-lg transition duration-300 disabled:cursor-not-allowed disabled:opacity-50 hover:shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                        >
                            Continue
                            <span aria-hidden="true">→</span>
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
                <div className="mt-6 space-y-5 animate-fadeIn">
                    <Select
                        id="official-role"
                        label="Your Role"
                        icon="⚙️"
                        value={selectedRole}
                        onChange={handleRoleChange}
                    >
                        <option value="">Select your official role…</option>
                        {OFFICIAL_ROLES.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                    </Select>
                    <div className="flex gap-3">
                        <button
                            onClick={() => goToStep(2)}
                            className="ui-button-ghost flex-1 rounded-xl border-2 border-slate-300 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-700 transition duration-300 hover:bg-white hover:border-slate-400 hover:shadow-md"
                        >
                            ← Back
                        </button>
                        <button
                            onClick={handleStep3Next}
                            disabled={!selectedRole}
                            className="ui-button-modern flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-lg transition duration-300 disabled:cursor-not-allowed disabled:opacity-50 hover:shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                        >
                            Continue
                            <span aria-hidden="true">→</span>
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 4 */}
            {step === 4 && (
                <form onSubmit={handleLogin} className="mt-6 space-y-5 animate-fadeIn">
                    {/* Context summary pill */}
                    <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 text-xs font-semibold text-blue-900 shadow-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-blue-700">
                                <span>🏛️</span>
                                {LOCAL_BODY_TYPE_LABELS[selectedType]}
                            </span>
                            <span className="text-blue-400">•</span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-blue-700">
                                <span>📍</span>
                                {localBodies.find((lb) => lb.id === selectedLocalBodyId)?.name || selectedLocalBodyId}
                            </span>
                            <span className="text-blue-400">•</span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-blue-700">
                                <span>⚙️</span>
                                <span className="capitalize">{selectedRole}</span>
                            </span>
                        </div>
                    </div>

                    <Select
                        id="official-account"
                        label="Official Account"
                        icon="👤"
                        value={selectedOfficialId}
                        onChange={handleOfficialAccountChange}
                        disabled={loadingOfficials || officialOptions.length === 0}
                    >
                        <option value="">
                            {loadingOfficials
                                ? "Loading officials..."
                                : officialOptions.length === 0
                                    ? "No active officials found for this role"
                                    : "Select your account..."}
                        </option>
                        {officialOptions.map((official) => (
                            <option key={official.id} value={official.id}>
                                {official.name}{official.email ? ` (${official.email})` : ""}
                            </option>
                        ))}
                    </Select>

                    <Input
                        id="official-email"
                        label="Email Address"
                        type="email"
                        icon="✉️"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your.email@example.com"
                        disabled={loading}
                    />
                    <Input
                        id="official-password"
                        label="Password"
                        type="password"
                        icon="🔐"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        disabled={loading}
                    />

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => goToStep(3)}
                            disabled={loading}
                            className="ui-button-ghost flex-1 rounded-xl border-2 border-slate-300 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-700 transition duration-300 hover:bg-white hover:border-slate-400 hover:shadow-md disabled:opacity-50"
                        >
                            ← Back
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="ui-button-modern flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-lg transition duration-300 disabled:cursor-not-allowed disabled:opacity-50 hover:shadow-xl hover:scale-105 active:scale-95"
                        >
                            {loading ? (
                                <>
                                    <Spinner />
                                    <span>Signing in…</span>
                                </>
                            ) : (
                                <>
                                    <span>🔓 Sign In Securely</span>
                                    <span aria-hidden="true">→</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────

function LoginFormContent() {
    const [loginMode, setLoginMode] = useState("official");

    return (
        <div>
            {/* Modern pill-style Mode Toggle */}
            <div className="mb-7 inline-flex w-full rounded-full border-2 border-slate-200 bg-gradient-to-r from-white/80 to-slate-50/80 p-1.5 shadow-md backdrop-blur-sm">
                {[
                    { value: "official", label: "🏛️ Official Access", icon: "🏛️" },
                    { value: "admin", label: "⚙️ Admin Access", icon: "⚙️" },
                ].map(({ value, label, icon }) => (
                    <button
                        key={value}
                        type="button"
                        onClick={() => setLoginMode(value)}
                        className={`relative flex-1 rounded-full px-4 py-2.5 text-xs font-bold tracking-wide transition-all duration-300 ${loginMode === value
                            ? "bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-300 scale-105"
                            : "text-slate-600 hover:text-slate-900"
                            }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Conditional form render with smooth transition */}
            <div className="transition-all duration-300">
                {loginMode === "admin" ? <AdminForm /> : <OfficialFormInner />}
            </div>
        </div>
    );
}

export function OfficialLoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, profile, loading } = useAuth();

    useEffect(() => {
        // If user is already logged in, redirect to their dashboard
        if (!loading && user && profile) {
            const redirectUrl = searchParams.get("redirect") || ROLE_REDIRECT[profile.role] || "/dashboard";
            router.replace(redirectUrl);
        }
    }, [user, profile, loading, router, searchParams]);

    // Show nothing while checking authentication
    if (loading || (user && profile)) {
        return (
            <div className="flex items-center justify-center gap-2 text-slate-600">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
                Redirecting…
            </div>
        );
    }

    // User is not authenticated, show login form
    return <LoginFormContent />;
}

