"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useAuth } from "@/components/auth/auth-provider";
import { AppShell } from "@/components/dashboard/app-shell";
import { formatExactDateTime, getIndiaDateStamp, getIndiaMonthStamp } from "@/lib/date-time";

const CHART_COLORS = ["#2563eb", "#0d9488", "#7c3aed", "#f59e0b", "#ef4444", "#14b8a6", "#334155"];

function GlassCard({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-white/40 bg-white/65 p-4 shadow-[0_24px_48px_-28px_rgba(37,99,235,0.5)] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}

function SkeletonBlock({ className = "h-56" }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`} />;
}

function SummaryCard({ label, value, icon, accentClass }) {
  return (
    <div className={`rounded-2xl border p-4 transition duration-300 hover:-translate-y-[2px] hover:shadow-[0_18px_36px_-20px_rgba(30,64,175,0.7)] ${accentClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function toCsv(rows) {
  if (!rows?.length) return "Department,Total,Resolved,Pending,ResolutionRate\n";
  const header = "Department,Total,Resolved,Pending,ResolutionRate\n";
  const body = rows
    .map((row) => {
      const department = String(row.department || "").replaceAll('"', '""');
      return `"${department}",${row.total || 0},${row.resolved || 0},${row.pending || 0},${row.resolutionRate || 0}`;
    })
    .join("\n");
  return header + body;
}

function downloadBlob(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function logSystemEvent(type, detail = "") {
  try {
    await fetch("/api/notifications/system", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, detail }),
    });
  } catch {
    // Non-blocking logging action.
  }
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();

  const [localBodies, setLocalBodies] = useState([]);
  const [filters, setFilters] = useState({
    dateRange: "all_time",
    selectedMonth: getIndiaMonthStamp(),
    startDate: "",
    endDate: "",
    localBodyId: "",
    department: "",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    dateRange: "all_time",
    selectedMonth: getIndiaMonthStamp(),
    startDate: "",
    endDate: "",
    localBodyId: "",
    department: "",
  });

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [loadError, setLoadError] = useState("");

  const [sortBy, setSortBy] = useState("total");
  const [sortOrder, setSortOrder] = useState("desc");
  const [tableOpen, setTableOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && (!profile || profile.role !== "admin")) {
      router.replace("/login");
    }
  }, [authLoading, profile, router]);

  useEffect(() => {
    let active = true;

    const loadLocalBodies = async () => {
      try {
        const res = await fetch("/api/local-bodies");
        const json = await res.json();
        if (active && res.ok && json.success) {
          setLocalBodies(json.data || []);
        }
      } catch {
        if (active) setLocalBodies([]);
      }
    };

    loadLocalBodies();

    return () => {
      active = false;
    };
  }, []);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      dateRange: appliedFilters.dateRange,
    });

    if (appliedFilters.localBodyId) params.set("localBodyId", appliedFilters.localBodyId);
    if (appliedFilters.department) params.set("department", appliedFilters.department);
    if (appliedFilters.dateRange === "selected_month" && appliedFilters.selectedMonth) {
      params.set("selectedMonth", appliedFilters.selectedMonth);
    }
    if (appliedFilters.dateRange === "custom") {
      if (appliedFilters.startDate) params.set("startDate", appliedFilters.startDate);
      if (appliedFilters.endDate) params.set("endDate", appliedFilters.endDate);
    }

    return params.toString();
  }, [appliedFilters]);

  useEffect(() => {
    let active = true;

    const loadAnalytics = async () => {
      if (authLoading || profile?.role !== "admin") return;
      setLoading(true);
      setLoadError("");

      try {
        const [summaryRes, trendsRes, departmentsRes, monthlyRes] = await Promise.all([
          fetch(`/api/analytics/summary?${queryString}`),
          fetch(`/api/analytics/trends?${queryString}`),
          fetch(`/api/analytics/departments?${queryString}`),
          fetch(`/api/analytics/monthly-report?${queryString}`),
        ]);

        const [summaryJson, trendsJson, departmentsJson, monthlyJson] = await Promise.all([
          summaryRes.json(),
          trendsRes.json(),
          departmentsRes.json(),
          monthlyRes.json(),
        ]);

        if (!active) return;

        const apiFailures = [
          !summaryRes.ok || !summaryJson.success ? summaryJson?.message || "Summary API failed" : "",
          !trendsRes.ok || !trendsJson.success ? trendsJson?.message || "Trends API failed" : "",
          !departmentsRes.ok || !departmentsJson.success ? departmentsJson?.message || "Departments API failed" : "",
          !monthlyRes.ok || !monthlyJson.success ? monthlyJson?.message || "Monthly report API failed" : "",
        ].filter(Boolean);

        if (apiFailures.length) {
          setLoadError(apiFailures[0]);
        }

        setSummary(summaryRes.ok && summaryJson.success ? summaryJson.data : null);
        setTrends(trendsRes.ok && trendsJson.success ? trendsJson.data?.points || [] : []);
        setDepartments(departmentsRes.ok && departmentsJson.success ? departmentsJson.data?.rows || [] : []);
        setMonthlyReport(monthlyRes.ok && monthlyJson.success ? monthlyJson.data : null);
      } catch {
        if (!active) return;
        setLoadError("Unable to load analytics data right now. Please try again.");
        setSummary(null);
        setTrends([]);
        setDepartments([]);
        setMonthlyReport(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadAnalytics();

    return () => {
      active = false;
    };
  }, [authLoading, profile?.role, queryString]);

  const departmentOptions = useMemo(() => departments.map((row) => row.department), [departments]);

  const sortedDepartmentRows = useMemo(() => {
    const rows = [...(monthlyReport?.departmentTable || departments)];
    const direction = sortOrder === "asc" ? 1 : -1;

    rows.sort((a, b) => {
      const aVal = a?.[sortBy];
      const bVal = b?.[sortBy];

      if (sortBy === "department") {
        return String(aVal || "").localeCompare(String(bVal || "")) * direction;
      }

      return ((Number(aVal) || 0) - (Number(bVal) || 0)) * direction;
    });

    return rows;
  }, [departments, monthlyReport?.departmentTable, sortBy, sortOrder]);

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(key);
    setSortOrder(key === "department" ? "asc" : "desc");
  };

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  const exportCsv = () => {
    const csv = toCsv(sortedDepartmentRows);
    const date = getIndiaDateStamp();
    downloadBlob(`analytics-report-${date}.csv`, csv, "text/csv;charset=utf-8;");
    logSystemEvent("data_export_completed", "CSV export");
  };

  const exportPdf = () => {
    const date = getIndiaDateStamp();
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    doc.setFontSize(18);
    doc.text("Reporting & Analytics", 40, 46);

    doc.setFontSize(11);
    doc.text(`Generated: ${formatExactDateTime(new Date())}`, 40, 66);

    const totals = summary?.totals;
    const lines = [
      `Total Complaints: ${totals?.total ?? 0}`,
      `Resolved: ${totals?.resolved ?? 0}`,
      `Pending: ${totals?.pending ?? 0}`,
      `Overdue: ${totals?.overdue ?? 0}`,
      `Resolution Rate: ${formatPercent(totals?.resolutionRate ?? 0)}`,
      `Most Frequent Issue Category: ${monthlyReport?.mostFrequentIssueCategory || "N/A"}`,
      `Worst-performing Department: ${monthlyReport?.worstPerformingDepartment || "N/A"}`,
      `Avg Resolution Time: ${monthlyReport?.avgResolutionDays ?? 0} days`,
    ];

    let y = 92;
    for (const line of lines) {
      doc.text(line, 40, y);
      y += 18;
    }

    y += 8;
    doc.setFontSize(13);
    doc.text("Department Breakdown", 40, y);
    y += 20;

    doc.setFontSize(10);
    for (const row of sortedDepartmentRows.slice(0, 16)) {
      const rowText = `${row.department}: Total ${row.total}, Resolved ${row.resolved}, Pending ${row.pending}, Rate ${row.resolutionRate}%`;
      doc.text(rowText, 40, y);
      y += 15;
      if (y > 780) {
        doc.addPage();
        y = 40;
      }
    }

    doc.save(`analytics-report-${date}.pdf`);
    logSystemEvent("data_export_completed", "PDF export");
  };

  const downloadMonthlyPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const date = getIndiaDateStamp();

    doc.setFontSize(20);
    doc.text("Monthly Transparency Report", 40, 50);
    doc.setFontSize(11);
    doc.text(`Period: ${monthlyReport?.month || "Current Month"}`, 40, 70);
    doc.text(`Generated: ${formatExactDateTime(new Date())}`, 40, 88);

    doc.setFontSize(12);
    doc.text(`Total complaints this month: ${monthlyReport?.totalComplaints ?? 0}`, 40, 120);
    doc.text(`Avg resolution time: ${monthlyReport?.avgResolutionDays ?? 0} days`, 40, 140);
    doc.text(`Most frequent issue category: ${monthlyReport?.mostFrequentIssueCategory || "N/A"}`, 40, 160);
    doc.text(`Worst-performing department: ${monthlyReport?.worstPerformingDepartment || "N/A"}`, 40, 180);

    let y = 220;
    doc.setFontSize(13);
    doc.text("Insights", 40, y);
    y += 18;

    doc.setFontSize(11);
    for (const insight of monthlyReport?.insights || []) {
      doc.text(`- ${insight.message}`, 40, y);
      y += 16;
    }

    doc.save(`monthly-transparency-report-${date}.pdf`);
    logSystemEvent("monthly_report_generated", monthlyReport?.month || "current month");
  };

  if (authLoading || (!profile && !authLoading)) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-teal-50 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <SkeletonBlock className="h-12" />
        </div>
      </main>
    );
  }

  return (
    <AppShell role="admin" pageTitle="Reporting & Analytics" profileName={profile?.name || "Admin"}>
      <div className="mx-auto max-w-7xl space-y-6 [font-family:'Poppins','Inter',var(--font-space-grotesk),'Segoe_UI',sans-serif]">
        <GlassCard className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Reporting &amp; Analytics</h1>
              <p className="mt-1 text-sm text-slate-600">
                Analyze complaint trends and system performance
              </p>
            </div>
            <button
              onClick={() => router.push("/dashboard/admin")}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition duration-300 hover:bg-slate-50"
            >
              ← Back to Admin Dashboard
            </button>
          </div>
        </GlassCard>

        <div className="sticky top-2 z-20">
          <GlassCard className="p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateRange: e.target.value }))}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="all_time">All Time</option>
                <option value="custom">Custom</option>
              </select>

              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                disabled={filters.dateRange !== "custom"}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-40"
              />

              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                disabled={filters.dateRange !== "custom"}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-40"
              />

              <select
                value={filters.localBodyId}
                onChange={(e) => setFilters((prev) => ({ ...prev, localBodyId: e.target.value }))}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">All Panchayaths</option>
                {localBodies.map((body) => (
                  <option key={body.id} value={body.id}>
                    {body.name}
                  </option>
                ))}
              </select>

              <select
                value={filters.department}
                onChange={(e) => setFilters((prev) => ({ ...prev, department: e.target.value }))}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">All Departments</option>
                {departmentOptions.map((dep) => (
                  <option key={dep} value={dep}>
                    {dep}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <button
                  onClick={applyFilters}
                  className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-2 text-sm font-semibold text-white transition duration-300 hover:-translate-y-[1px]"
                >
                  Apply Filters
                </button>
                <button
                  onClick={exportPdf}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition duration-300 hover:bg-slate-50"
                >
                  Export PDF
                </button>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={exportCsv}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition duration-300 hover:bg-slate-50"
              >
                Export CSV
              </button>
            </div>
          </GlassCard>
        </div>

        {loadError && (
          <GlassCard className="border-red-200 bg-red-50/80">
            <p className="text-sm font-semibold text-red-700">{loadError}</p>
          </GlassCard>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {loading ? (
            Array.from({ length: 5 }).map((_, idx) => <SkeletonBlock key={idx} className="h-28" />)
          ) : (
            <>
              <SummaryCard label="Total Complaints" value={summary?.totals?.total ?? 0} icon="📨" accentClass="border-blue-200 bg-blue-50/75" />
              <SummaryCard label="Resolved" value={summary?.totals?.resolved ?? 0} icon="✅" accentClass="border-emerald-200 bg-emerald-50/80" />
              <SummaryCard label="Pending" value={summary?.totals?.pending ?? 0} icon="⏳" accentClass="border-amber-200 bg-amber-50/80" />
              <SummaryCard label="Overdue" value={summary?.totals?.overdue ?? 0} icon="⚠" accentClass="border-red-200 bg-red-50/80" />
              <SummaryCard label="Resolution Rate" value={formatPercent(summary?.totals?.resolutionRate)} icon="📈" accentClass="border-purple-200 bg-purple-50/80" />
            </>
          )}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <GlassCard className="h-80">
            <h2 className="mb-3 text-base font-bold text-slate-800">Complaints Trend</h2>
            {loading ? (
              <SkeletonBlock className="h-64" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#475569" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="resolved" stroke="#059669" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </GlassCard>

          <GlassCard className="h-80">
            <h2 className="mb-3 text-base font-bold text-slate-800">Department-wise Complaints</h2>
            {loading ? (
              <SkeletonBlock className="h-64" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departments.slice(0, 8)} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis dataKey="department" stroke="#475569" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={52} />
                  <YAxis stroke="#475569" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#2563eb" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </GlassCard>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <GlassCard className="h-80">
            <h2 className="mb-3 text-base font-bold text-slate-800">Resolution Rate</h2>
            {loading ? (
              <SkeletonBlock className="h-64" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary?.resolutionDistribution || []}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={2}
                    animationDuration={300}
                  >
                    {(summary?.resolutionDistribution || []).map((entry, index) => (
                      <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </GlassCard>

          <GlassCard className="h-80">
            <h2 className="mb-3 text-base font-bold text-slate-800">Status Distribution</h2>
            {loading ? (
              <SkeletonBlock className="h-64" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary?.statusDistribution || []}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={110}
                    paddingAngle={1}
                    animationDuration={300}
                  >
                    {(summary?.statusDistribution || []).map((entry, index) => (
                      <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </GlassCard>
        </section>

        <GlassCard className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Monthly Transparency Report</h2>
              <p className="text-sm text-slate-600">{monthlyReport?.month || "Current Month"}</p>
            </div>
            <button
              onClick={downloadMonthlyPdf}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white transition duration-300 hover:-translate-y-[1px]"
            >
              Download Monthly Report
            </button>
          </div>

          {loading ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <SkeletonBlock key={idx} className="h-24" />
              ))}
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
                <p className="text-xs font-semibold uppercase text-slate-600">Total Complaints</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{monthlyReport?.totalComplaints ?? 0}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
                <p className="text-xs font-semibold uppercase text-slate-600">Avg Resolution Time</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{monthlyReport?.avgResolutionDays ?? 0}d</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
                <p className="text-xs font-semibold uppercase text-slate-600">Frequent Issue</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{monthlyReport?.mostFrequentIssueCategory || "N/A"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
                <p className="text-xs font-semibold uppercase text-slate-600">Worst-performing Dept.</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{monthlyReport?.worstPerformingDepartment || "N/A"}</p>
              </div>
            </div>
          )}
        </GlassCard>

        <section className="grid gap-3 lg:grid-cols-2">
          {(monthlyReport?.insights || []).map((insight, idx) => (
            <GlassCard
              key={`${insight.message}-${idx}`}
              className={
                insight.type === "warning"
                  ? "border-amber-200 bg-amber-50/80"
                  : "border-blue-200 bg-blue-50/80"
              }
            >
              <p className="text-sm font-semibold text-slate-800">
                {insight.type === "warning" ? "⚠" : "ℹ"} {insight.message}
              </p>
            </GlassCard>
          ))}
        </section>

        <GlassCard className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">Department Performance Table</h2>
            <button
              onClick={() => setTableOpen((prev) => !prev)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              {tableOpen ? "Hide Table" : "Show Table"}
            </button>
          </div>

          {tableOpen && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white/90">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-3 py-3">
                      <button onClick={() => handleSort("department")} className="font-semibold hover:text-slate-900">
                        Department {sortBy === "department" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                      </button>
                    </th>
                    <th className="px-3 py-3">
                      <button onClick={() => handleSort("total")} className="font-semibold hover:text-slate-900">
                        Total {sortBy === "total" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                      </button>
                    </th>
                    <th className="px-3 py-3">
                      <button onClick={() => handleSort("resolved")} className="font-semibold hover:text-slate-900">
                        Resolved {sortBy === "resolved" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                      </button>
                    </th>
                    <th className="px-3 py-3">
                      <button onClick={() => handleSort("pending")} className="font-semibold hover:text-slate-900">
                        Pending {sortBy === "pending" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                      </button>
                    </th>
                    <th className="px-3 py-3">
                      <button onClick={() => handleSort("resolutionRate")} className="font-semibold hover:text-slate-900">
                        % {sortBy === "resolutionRate" ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDepartmentRows.length ? (
                    sortedDepartmentRows.map((row) => (
                      <tr key={row.department} className="border-b border-slate-100 text-slate-700">
                        <td className="px-3 py-3 font-medium text-slate-800">{row.department}</td>
                        <td className="px-3 py-3">{row.total}</td>
                        <td className="px-3 py-3">{row.resolved}</td>
                        <td className="px-3 py-3">{row.pending}</td>
                        <td className="px-3 py-3">{row.resolutionRate}%</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-500">
                        No department data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </div>
    </AppShell>
  );
}
