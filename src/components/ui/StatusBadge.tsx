"use client";

type Status = "idle" | "generating" | "done" | "error";

const config: Record<Status, { bg: string; color: string; label: string }> = {
  idle: { bg: "#F5F3F0", color: "#8A8A8A", label: "Ready" },
  generating: { bg: "rgba(192,139,111,0.1)", color: "#C08B6F", label: "Generating..." },
  done: { bg: "#E8F5E9", color: "#2E7D32", label: "Complete" },
  error: { bg: "#FFF3E0", color: "#E65100", label: "Error" },
};

export default function StatusBadge({ status }: { status: Status }) {
  const c = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full ${
        status === "generating" ? "animate-pulse-ring" : ""
      }`}
      style={{ background: c.bg, color: c.color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: c.color }}
      />
      {c.label}
    </span>
  );
}
