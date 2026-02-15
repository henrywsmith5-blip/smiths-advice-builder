"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Button from "@/components/ui/Button";

interface CaseItem {
  id: string;
  title: string;
  clientType: string;
  clientAName: string | null;
  clientBName: string | null;
  updatedAt: string;
  documents: { id: string; docType: string }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cases")
      .then((r) => r.json())
      .then((d) => setCases(d.cases || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function createCase() {
    const res = await fetch("/api/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (data.case?.id) {
      router.push(`/cases/${data.case.id}`);
    }
  }

  async function deleteCase(id: string) {
    if (!confirm("Delete this case?")) return;
    await fetch(`/api/cases/${id}`, { method: "DELETE" });
    setCases((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="pt-16">
        <div className="max-w-[1280px] mx-auto px-6 py-12 animate-fade-in">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-xl font-semibold" style={{ color: "#1A1A1A", letterSpacing: "-0.01em" }}>
              Cases
            </h1>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => router.push("/templates")}>
                Templates
              </Button>
              <Button onClick={createCase}>New Case</Button>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="text-center py-20" style={{ color: "#8A8A8A" }}>
              <div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: "#E5E1DC", borderTopColor: "#C08B6F" }} />
              Loading...
            </div>
          ) : cases.length === 0 ? (
            <div className="text-center py-20">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "#F5F3F0" }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8A8A8A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: "#3D3D3D" }}>
                No cases yet
              </p>
              <p className="text-xs mb-6" style={{ color: "#8A8A8A" }}>
                Create your first case to get started
              </p>
              <Button onClick={createCase}>New Case</Button>
            </div>
          ) : (
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid #F0EDEA" }}
            >
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#FAFAF9" }}>
                    <th className="text-left px-5 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#8A8A8A" }}>Title</th>
                    <th className="text-left px-5 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#8A8A8A" }}>Client</th>
                    <th className="text-left px-5 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#8A8A8A" }}>Type</th>
                    <th className="text-left px-5 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#8A8A8A" }}>Docs</th>
                    <th className="text-left px-5 py-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: "#8A8A8A" }}>Updated</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c) => (
                    <tr
                      key={c.id}
                      className="cursor-pointer transition-colors"
                      onClick={() => router.push(`/cases/${c.id}`)}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "#FAFAF9";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                      }}
                    >
                      <td className="px-5 py-3.5 text-sm font-medium" style={{ color: "#1A1A1A", borderBottom: "1px solid #F0EDEA" }}>
                        {c.title || "Untitled"}
                      </td>
                      <td className="px-5 py-3.5 text-sm" style={{ color: "#3D3D3D", borderBottom: "1px solid #F0EDEA" }}>
                        {c.clientAName || "—"}
                        {c.clientBName ? ` & ${c.clientBName}` : ""}
                      </td>
                      <td className="px-5 py-3.5 text-xs" style={{ color: "#8A8A8A", borderBottom: "1px solid #F0EDEA" }}>
                        <span className="px-2 py-0.5 rounded-full" style={{ background: "#F5F3F0" }}>
                          {c.clientType}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs" style={{ color: "#8A8A8A", borderBottom: "1px solid #F0EDEA" }}>
                        {c.documents.length} doc{c.documents.length !== 1 ? "s" : ""}
                      </td>
                      <td className="px-5 py-3.5 text-xs" style={{ color: "#8A8A8A", borderBottom: "1px solid #F0EDEA" }}>
                        {new Date(c.updatedAt).toLocaleDateString("en-NZ")}
                      </td>
                      <td className="px-3 py-3.5" style={{ borderBottom: "1px solid #F0EDEA" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCase(c.id);
                          }}
                          className="text-xs px-2 py-1 rounded transition-colors cursor-pointer"
                          style={{ color: "#8A8A8A" }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.color = "#E65100";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.color = "#8A8A8A";
                          }}
                        >
                          &times;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
