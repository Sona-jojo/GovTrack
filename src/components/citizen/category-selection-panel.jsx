"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { pick } from "@/lib/language-utils";

const CARD_TONES = [
  "from-blue-50 to-sky-50 border-blue-200",
  "from-emerald-50 to-teal-50 border-emerald-200",
  "from-amber-50 to-orange-50 border-amber-200",
  "from-violet-50 to-purple-50 border-violet-200",
  "from-cyan-50 to-blue-50 border-cyan-200",
  "from-rose-50 to-pink-50 border-rose-200",
];

export function CategorySelectionPanel({ lang = "en", categories = [] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [runtimeCategories, setRuntimeCategories] = useState([]);

  useEffect(() => {
    let active = true;

    const loadRuntimeCategories = async () => {
      try {
        const res = await fetch("/api/settings/get", { cache: "no-store" });
        const json = await res.json();
        const received = Array.isArray(json?.data?.categories) ? json.data.categories : [];
        if (active && received.length > 0) {
          setRuntimeCategories(received);
        }
      } catch {
        // Keep fallback categories from props.
      }
    };

    loadRuntimeCategories();
    return () => {
      active = false;
    };
  }, []);

  const activeCategories = runtimeCategories.length > 0 ? runtimeCategories : categories;

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return activeCategories;
    return activeCategories.filter((category) => {
      const label = (lang === "ml" ? category.nameMl : category.name).toLowerCase();
      return label.includes(normalized);
    });
  }, [activeCategories, lang, query]);

  const mostUsed = filtered.slice(0, 3);

  const openCategory = (categoryId) => {
    setSelectedId(categoryId);
    window.setTimeout(() => {
      router.push(`/report-issue/${encodeURIComponent(categoryId)}`);
    }, 120);
  };

  return (
    <>
      <div className="mt-6 mb-8 text-center">
        <p className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-600">
          <span aria-hidden="true">🏛️</span>
          {pick(lang, "Citizen Services", "Citizen Services")}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {pick(lang, "Select Issue Category", "Select Issue Category")}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          {pick(
            lang,
            "Choose the department that best matches your issue.",
            "Choose the department that best matches your issue."
          )}
        </p>
      </div>

      <div className="mb-8 flex justify-center">
        <label className="relative w-full max-w-lg">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
            🔎
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={pick(lang, "Search category...", "Search category...")}
            className="w-full rounded-full border border-gray-200 bg-white px-5 py-3 pl-11 text-sm text-gray-800 shadow-sm outline-none transition focus:ring-2 focus:ring-blue-400"
          />
        </label>
      </div>

      {mostUsed.length > 0 && (
        <section className="mb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            {pick(lang, "Most Used Categories", "Most Used Categories")}
          </p>
          <div className="flex flex-wrap gap-2">
            {mostUsed.map((category) => (
              <button
                key={`chip-${category.id}`}
                type="button"
                onClick={() => openCategory(category.id)}
                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                {category.icon} {lang === "ml" ? category.nameMl : category.name}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((category, index) => {
          const tone = CARD_TONES[index % CARD_TONES.length];
          const isSelected = selectedId === category.id;
          return (
            <button
              key={category.id}
              type="button"
              title={pick(lang, "Click to continue", "Click to continue")}
              onClick={() => openCategory(category.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openCategory(category.id);
                }
              }}
              className={`group relative cursor-pointer rounded-2xl border bg-gradient-to-br p-6 text-left shadow-md transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 active:scale-95 ${tone} ${isSelected ? "border-blue-500 ring-2 ring-blue-300" : "border-gray-200"}`}
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div className="absolute right-4 top-4 text-sm text-blue-600 opacity-0 transition group-hover:opacity-100">
                {isSelected ? "✓" : "→"}
              </div>

              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-2xl transition group-hover:bg-white group-hover:shadow-md">
                {category.icon}
              </div>
              <h2 className="text-lg font-semibold text-gray-800">
                {lang === "ml" ? category.nameMl : category.name}
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                {pick(lang, "Tap to choose sub-issue and continue", "Tap to choose sub-issue and continue")}
              </p>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white/80 px-4 py-5 text-center text-sm font-medium text-gray-600 shadow-sm">
          {pick(lang, "No categories found. Try another keyword.", "No categories found. Try another keyword.")}
        </div>
      )}
    </>
  );
}
