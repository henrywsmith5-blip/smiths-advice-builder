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
    <div className="min-h-screen" style={{ background: "#FAFAF9" }}>
      <Header />
      <main className="pt-16">
        <div className="max-w-[1080px] mx-auto px-6 py-12 animate-fade-in">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-10">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#1A1A1A" }}>
                Cases
              </h1>
              <p className="text-[13px] mt-1" style={{ color: "#8A8A8A" }}>
                {cases.length > 0 ? `${cases.length} case${cases.length !== 1 ? "s" : ""}` : "Get started by creating a case"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => router.push("/templates")}>
                Templates
              </Button>
              <Button onClick={createCase}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                New Case
              </Button>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="text-center py-24" style={{ color: "#8A8A8A" }}>
              <div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: "#E5E1DC", borderTopColor: "#C08B6F" }} />
              <span className="text-[13px]">Loading cases...</span>
            </div>
          ) : cases.length === 0 ? (
            <div className="text-center py-24">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: "white", boxShadow: "0 0 0 1px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)" }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C08B6F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              </div>
              <p className="text-[15px] font-medium mb-1" style={{ color: "#1A1A1A" }}>
                No cases yet
              </p>
              <p className="text-[13px] mb-8" style={{ color: "#8A8A8A" }}>
                Create your first case to generate advice documents
              </p>
              <Button onClick={createCase}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                New Case
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {cases.map((c) => (
                <div
                  key={c.id}
                  onClick={() => router.push(`/cases/${c.id}`)}
                  className="flex items-center justify-between px-5 py-4 rounded-xl cursor-pointer transition-all duration-200 group"
                  style={{
                    background: "white",
                    border: "1px solid rgba(0,0,0,0.04)",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget).style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
                    (e.currentTarget).style.borderColor = "rgba(0,0,0,0.06)";
                    (e.currentTarget).style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget).style.boxShadow = "0 1px 2px rgba(0,0,0,0.02)";
                    (e.currentTarget).style.borderColor = "rgba(0,0,0,0.04)";
                    (e.currentTarget).style.transform = "translateY(0)";
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-[13px] font-semibold shrink-0"
                      style={{
                        background: "linear-gradient(135deg, rgba(192,139,111,0.08) 0%, rgba(192,139,111,0.15) 100%)",
                        color: "#C08B6F",
                      }}
                    >
                      {(c.clientAName || "C").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[14px] font-medium" style={{ color: "#1A1A1A" }}>
                        {c.clientAName || "Untitled"}
                        {c.clientBName ? ` & ${c.clientBName}` : ""}
                      </p>
                      <p className="text-[12px] mt-0.5" style={{ color: "#8A8A8A" }}>
                        {c.clientType === "PARTNER" ? "Partner" : "Individual"} &middot; {c.documents.length} doc{c.documents.length !== 1 ? "s" : ""} &middot; {new Date(c.updatedAt).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCase(c.id);
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 cursor-pointer opacity-0 group-hover:opacity-100"
                      style={{ color: "#8A8A8A" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget).style.background = "rgba(230,81,0,0.06)";
                        (e.currentTarget).style.color = "#E65100";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget).style.background = "transparent";
                        (e.currentTarget).style.color = "#8A8A8A";
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      </svg>
                    </button>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C5C0BB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
