"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import jsPDF from "jspdf";
import { useAuth } from "@/components/auth/auth-provider";
import { AppShell } from "@/components/dashboard/app-shell";

const PIE_COLORS = ["#10b981", "#f59e0b", "#ef4444"];

function GlassCard({ title, value, note, tone = "slate", loading = false }) {
  const toneClass = {
    slate: "border-slate-200/70",
    emerald: "border-emerald-200/70",
    amber: "border-amber-200/70",
    red: "border-red-200/70",
    blue: "border-blue-200/70",
  }[tone] || "border-slate-200/70";

  return (
    <div className={`rounded-2xl border bg-white/55 p-4 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.65)] backdrop-blur-xl transition duration-500 hover:-translate-y-0.5 ${toneClass}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
      {loading ? (
        <div className="mt-3 h-8 w-24 animate-pulse rounded bg-slate-200" />
      ) : (
        <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
      )}
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-200" />
      ))}
    </div>
  );
}

function formatDateLabel(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function roleBadge(role) {
  if (role === "engineer") return "bg-blue-100 text-blue-700 border-blue-200";
  if (role === "clerk") return "bg-indigo-100 text-indigo-700 border-indigo-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export default function SecretaryPerformanceReportPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const lang = typeof window !== "undefined" ? (document.cookie.match(/site_lang=(\w+)/)?.[1] || "en") : "en";

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    role: "all",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    startDate: "",
    endDate: "",
    role: "all",
  });

  const [summary, setSummary] = useState({ totalComplaints: 0, resolved: 0, pending: 0, overdue: 0, resolutionRate: 0 });
  const [staffRows, setStaffRows] = useState([]);
  const [charts, setCharts] = useState({ staffBar: [], distribution: [], trends: [] });
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!profile || profile.role !== "secretary")) {
      router.replace("/login");
    }
  }, [authLoading, profile, router]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (appliedFilters.startDate) params.set("startDate", appliedFilters.startDate);
    if (appliedFilters.endDate) params.set("endDate", appliedFilters.endDate);
    if (appliedFilters.role && appliedFilters.role !== "all") params.set("role", appliedFilters.role);
    return params.toString();
  }, [appliedFilters]);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const suffix = queryString ? `?${queryString}` : "";
      const [summaryRes, staffRes, trendsRes, insightsRes] = await Promise.all([
        fetch(`/api/secretary/report/summary${suffix}`),
        fetch(`/api/secretary/report/staff-performance${suffix}`),
        fetch(`/api/secretary/report/trends${suffix}`),
        fetch(`/api/secretary/report/insights${suffix}`),
      ]);

      const [summaryJson, staffJson, trendsJson, insightsJson] = await Promise.all([
        summaryRes.json(),
        staffRes.json(),
        trendsRes.json(),
        insightsRes.json(),
      ]);

      if (summaryJson?.success) setSummary(summaryJson.data || {});
      else setSummary({ totalComplaints: 0, resolved: 0, pending: 0, overdue: 0, resolutionRate: 0 });

      if (staffJson?.success && Array.isArray(staffJson.data)) setStaffRows(staffJson.data);
      else setStaffRows([]);

      if (trendsJson?.success && trendsJson.data) setCharts(trendsJson.data);
      else setCharts({ staffBar: [], distribution: [], trends: [] });

      if (insightsJson?.success && Array.isArray(insightsJson.data)) setInsights(insightsJson.data);
      else setInsights([]);
    } catch {
      setSummary({ totalComplaints: 0, resolved: 0, pending: 0, overdue: 0, resolutionRate: 0 });
      setStaffRows([]);
      setCharts({ staffBar: [], distribution: [], trends: [] });
      setInsights([]);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const applyFilters = () => {
    setAppliedFilters(filters);
  };

  const downloadPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Staff Performance Report", 14, 18);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);

    doc.text(`Total: ${summary.totalComplaints}`, 14, 36);
    doc.text(`Resolved: ${summary.resolved}`, 14, 43);
    doc.text(`Pending: ${summary.pending}`, 14, 50);
    doc.text(`Overdue: ${summary.overdue}`, 14, 57);
    doc.text(`Resolution Rate: ${summary.resolutionRate}%`, 14, 64);

    let y = 76;
    doc.setFontSize(12);
    doc.text("Staff Snapshot", 14, y);
    y += 8;

    doc.setFontSize(10);
    for (const row of staffRows.slice(0, 18)) {
      const line = `${row.staffName} (${row.role}) | Assigned: ${row.assigned}, Resolved: ${row.resolved}, Pending: ${row.pending}, Overdue: ${row.overdue}, Avg: ${row.avgResolutionTime}`;
      doc.text(line, 14, y);
      y += 6;
      if (y > 280) {
        doc.addPage();
        y = 16;
      }
    }

    doc.save(`staff-performance-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (authLoading) {
    return <main className="ui-bg flex min-h-screen items-center justify-center"><div className="h-8 w-52 animate-pulse rounded bg-slate-200" /></main>;
  }

  return (
    <AppShell role="secretary" pageTitle="Performance Report" profileName={profile?.name || "Secretary"}>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e0f2fe_0%,#eef2ff_35%,#f8fafc_70%,#ffffff_100%)] rounded-2xl px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-3xl border border-white/50 bg-white/45 p-5 shadow-[0_20px_60px_-35px_rgba(30,64,175,0.65)] backdrop-blur-2xl transition duration-700 animate-in fade-in slide-in-from-top-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Staff Performance Report</h1>
              <p className="mt-1 text-sm text-slate-600">Monitor engineer and clerk accountability with actionable analytics.</p>
            </div>
            <button onClick={() => router.push("/dashboard/secretary")} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
              ← Secretary Dashboard
            </button>
          </div>

          <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200/70 bg-white/55 p-3 backdrop-blur-md sm:grid-cols-2 lg:grid-cols-5">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-600">Start Date (From)</span>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-600">End Date (To)</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <select
              value={filters.role}
              onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value }))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All Roles</option>
              <option value="engineer">Engineer</option>
              <option value="clerk">Clerk</option>
            </select>
            <button
              type="button"
              onClick={applyFilters}
              className="rounded-lg bg-gradient-to-r from-sky-600 to-blue-700 px-3 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_-14px_rgba(30,64,175,0.85)] transition hover:brightness-105"
            >
              Apply Filters
            </button>
            <button
              type="button"
              onClick={downloadPdf}
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
            >
              Download PDF
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">The report uses both dates as a range filter: Start Date to End Date.</p>
        </header>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <GlassCard title="Total Complaints" value={summary.totalComplaints} note="Within selected date range" tone="blue" loading={loading} />
          <GlassCard title="Resolved" value={summary.resolved} note="Closed or resolved" tone="emerald" loading={loading} />
          <GlassCard title="Pending" value={summary.pending} note="In-progress workload" tone="amber" loading={loading} />
          <GlassCard title="Overdue" value={summary.overdue} note="Past deadline" tone="red" loading={loading} />
          <GlassCard title="Resolution Rate" value={`${summary.resolutionRate || 0}%`} note="Resolved / Assigned" tone="slate" loading={loading} />
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr,0.9fr]">
          <div className="rounded-3xl border border-white/50 bg-white/50 p-4 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.75)] backdrop-blur-xl">
            <h2 className="text-lg font-black text-slate-900">Staff Performance</h2>
            <p className="mb-3 text-xs text-slate-500">Assigned, resolved, pending, overdue and average resolution time.</p>

            {loading ? (
              <TableSkeleton />
            ) : staffRows.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">No staff data found for selected filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-3">Staff</th>
                      <th className="px-3 py-3">Role</th>
                      <th className="px-3 py-3">Assigned</th>
                      <th className="px-3 py-3">Resolved</th>
                      <th className="px-3 py-3">Pending</th>
                      <th className="px-3 py-3">Overdue</th>
                      <th className="px-3 py-3">Avg Resolution</th>
                      <th className="px-3 py-3">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffRows.map((row, idx) => (
                      <tr key={row.staffId} className={idx % 2 === 0 ? "bg-white/70" : "bg-slate-50/70"}>
                        <td className="px-3 py-3 font-semibold text-slate-800">{row.staffName}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${roleBadge(row.role)}`}>
                            {row.role}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-slate-700">{row.assigned}</td>
                        <td className="px-3 py-3 text-emerald-700 font-semibold">{row.resolved}</td>
                        <td className="px-3 py-3 text-amber-700 font-semibold">{row.pending}</td>
                        <td className="px-3 py-3 text-red-700 font-semibold">{row.overdue}</td>
                        <td className="px-3 py-3 text-slate-700">{row.avgResolutionTime}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${row.resolutionRate >= 70 ? "bg-emerald-100 text-emerald-800" : row.resolutionRate >= 40 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>
                            {row.resolutionRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <aside className="space-y-3">
            <div className="rounded-3xl border border-white/50 bg-white/50 p-4 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.75)] backdrop-blur-xl">
              <h2 className="text-lg font-black text-slate-900">Smart Insights</h2>
              <div className="mt-3 space-y-2">
                {loading ? (
                  <TableSkeleton />
                ) : (
                  insights.map((insight, idx) => (
                    <div
                      key={`${insight.title}-${idx}`}
                      className={`rounded-xl border p-3 ${insight.type === "warning" ? "border-red-200 bg-red-50" : insight.type === "success" ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                    >
                      <p className="text-sm font-bold text-slate-800">{insight.title}</p>
                      <p className="mt-1 text-xs text-slate-600">{insight.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/50 bg-white/50 p-4 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.75)] backdrop-blur-xl lg:col-span-2">
            <h3 className="text-base font-black text-slate-900">Complaints Handled per Staff</h3>
            <div className="mt-3 h-72 w-full">
              {loading ? (
                <div className="h-full animate-pulse rounded-xl bg-slate-200" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.staffBar || []} margin={{ top: 10, right: 20, left: 0, bottom: 45 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
                    <XAxis dataKey="name" angle={-22} textAnchor="end" interval={0} height={58} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="assigned" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="resolved" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/50 bg-white/50 p-4 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.75)] backdrop-blur-xl">
            <h3 className="text-base font-black text-slate-900">Resolution Distribution</h3>
            <div className="mt-3 h-72 w-full">
              {loading ? (
                <div className="h-full animate-pulse rounded-xl bg-slate-200" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={charts.distribution || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={86} innerRadius={52}>
                      {(charts.distribution || []).map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/50 bg-white/50 p-4 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.75)] backdrop-blur-xl">
          <h3 className="text-base font-black text-slate-900">Complaint Trend</h3>
          <p className="text-xs text-slate-500">Daily trend for total, resolved and pending complaints in selected period.</p>
          <div className="mt-3 h-72 w-full">
            {loading ? (
              <div className="h-full animate-pulse rounded-xl bg-slate-200" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={(charts.trends || []).map((x) => ({ ...x, label: formatDateLabel(x.date) }))} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="resolved" stroke="#059669" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>
      </div>
    </AppShell>
  );
}
