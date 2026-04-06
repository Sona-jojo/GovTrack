function IconGlyph({ children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      {children}
    </svg>
  );
}

function IconBadge({ colorClass, children }) {
  return (
    <span
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md ${colorClass}`}
    >
      {children}
    </span>
  );
}

export function DepartmentIcon({ code }) {
  const colorByCode = {
    RD: "bg-gradient-to-br from-orange-500 to-amber-500",
    WS: "bg-gradient-to-br from-cyan-500 to-blue-600",
    HP: "bg-gradient-to-br from-rose-500 to-pink-600",
    ED: "bg-gradient-to-br from-indigo-500 to-violet-600",
    AE: "bg-gradient-to-br from-emerald-500 to-green-600",
    EL: "bg-gradient-to-br from-yellow-500 to-amber-600",
    AD: "bg-gradient-to-br from-slate-500 to-slate-700",
  };
  const colorClass = colorByCode[code] ?? "bg-gradient-to-br from-slate-500 to-slate-700";

  if (code === "RD") {
    return (
      <IconBadge colorClass={colorClass}>
        <IconGlyph>
          <path d="M4 20 8 4h8l4 16" />
          <path d="M12 4v16" />
        </IconGlyph>
      </IconBadge>
    );
  }

  if (code === "WS") {
    return (
      <IconBadge colorClass={colorClass}>
        <IconGlyph>
          <path d="M12 3c3 4 6 7 6 10a6 6 0 1 1-12 0c0-3 3-6 6-10Z" />
        </IconGlyph>
      </IconBadge>
    );
  }

  if (code === "HP") {
    return (
      <IconBadge colorClass={colorClass}>
        <IconGlyph>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M12 8v8M8 12h8" />
        </IconGlyph>
      </IconBadge>
    );
  }

  if (code === "ED") {
    return (
      <IconBadge colorClass={colorClass}>
        <IconGlyph>
          <path d="M3 9l9-5 9 5-9 5-9-5Z" />
          <path d="M6 11v5c0 2 3 4 6 4s6-2 6-4v-5" />
        </IconGlyph>
      </IconBadge>
    );
  }

  if (code === "AE") {
    return (
      <IconBadge colorClass={colorClass}>
        <IconGlyph>
          <path d="M12 20s7-4.5 7-10a7 7 0 1 0-14 0c0 5.5 7 10 7 10Z" />
          <path d="M9 13c3 0 4-3 6-5" />
        </IconGlyph>
      </IconBadge>
    );
  }

  if (code === "EL") {
    return (
      <IconBadge colorClass={colorClass}>
        <IconGlyph>
          <path d="M12 3 7 12h4l-1 9 7-11h-4l2-7Z" />
        </IconGlyph>
      </IconBadge>
    );
  }

  return (
    <IconBadge colorClass={colorClass}>
      <IconGlyph>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </IconGlyph>
    </IconBadge>
  );
}

export function IssueIcon({ issueSlug }) {
  const normalized = issueSlug.toLowerCase();

  if (normalized.includes("water") || normalized.includes("mosquito")) {
    return (
      <IconBadge colorClass="bg-gradient-to-br from-cyan-500 to-blue-600">
        <IconGlyph>
          <path d="M12 3c3 4 6 7 6 10a6 6 0 1 1-12 0c0-3 3-6 6-10Z" />
        </IconGlyph>
      </IconBadge>
    );
  }

  if (normalized.includes("school") || normalized.includes("anganwadi")) {
    return (
      <IconBadge colorClass="bg-gradient-to-br from-indigo-500 to-violet-600">
        <IconGlyph>
          <path d="M3 10h18" />
          <path d="M5 10v9h14v-9" />
          <path d="M12 3 3 8h18l-9-5Z" />
        </IconGlyph>
      </IconBadge>
    );
  }

  if (normalized.includes("ambulance") || normalized.includes("medicine")) {
    return (
      <IconBadge colorClass="bg-gradient-to-br from-rose-500 to-pink-600">
        <IconGlyph>
          <rect x="4" y="7" width="16" height="10" rx="2" />
          <path d="M12 9v6M9 12h6" />
        </IconGlyph>
      </IconBadge>
    );
  }

  if (normalized.includes("streetlight") || normalized.includes("electricity")) {
    return (
      <IconBadge colorClass="bg-gradient-to-br from-yellow-500 to-amber-600">
        <IconGlyph>
          <path d="M12 3 7 12h4l-1 9 7-11h-4l2-7Z" />
        </IconGlyph>
      </IconBadge>
    );
  }

  if (
    normalized.includes("road") ||
    normalized.includes("pothole") ||
    normalized.includes("bridge")
  ) {
    return (
      <IconBadge colorClass="bg-gradient-to-br from-orange-500 to-amber-500">
        <IconGlyph>
          <path d="M4 20 8 4h8l4 16" />
          <path d="M12 4v16" />
        </IconGlyph>
      </IconBadge>
    );
  }

  if (
    normalized.includes("canal") ||
    normalized.includes("irrigation") ||
    normalized.includes("environment")
  ) {
    return (
      <IconBadge colorClass="bg-gradient-to-br from-emerald-500 to-green-600">
        <IconGlyph>
          <path d="M12 20s7-4.5 7-10a7 7 0 1 0-14 0c0 5.5 7 10 7 10Z" />
          <path d="M9 13c3 0 4-3 6-5" />
        </IconGlyph>
      </IconBadge>
    );
  }

  return (
    <IconBadge colorClass="bg-gradient-to-br from-slate-500 to-slate-700">
      <IconGlyph>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v5M12 16h.01" />
      </IconGlyph>
    </IconBadge>
  );
}
