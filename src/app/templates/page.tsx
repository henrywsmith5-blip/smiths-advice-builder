"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Tabs from "@/components/ui/Tabs";
import Button from "@/components/ui/Button";

interface TemplateItem {
  id: string;
  docType: string;
  clientType: string | null;
  hasCover: boolean | null;
  name: string;
  html: string;
  css: string;
  version: number;
  isActive: boolean;
}

const TEMPLATE_TABS = [
  { id: "SOA_IND_NC", label: "SOA Individual" },
  { id: "SOA_IND_C", label: "SOA Individual + Cover" },
  { id: "SOA_PAR_NC", label: "SOA Partner" },
  { id: "SOA_PAR_C", label: "SOA Partner + Cover" },
  { id: "ROA_IND", label: "ROA Individual" },
  { id: "ROA_PAR", label: "ROA Partner" },
  { id: "SOE", label: "SOE" },
];

function parseTabId(tabId: string): {
  docType: string;
  clientType: string | null;
  hasCover: boolean | null;
} {
  switch (tabId) {
    case "SOA_IND_NC": return { docType: "SOA", clientType: "INDIVIDUAL", hasCover: false };
    case "SOA_IND_C": return { docType: "SOA", clientType: "INDIVIDUAL", hasCover: true };
    case "SOA_PAR_NC": return { docType: "SOA", clientType: "PARTNER", hasCover: false };
    case "SOA_PAR_C": return { docType: "SOA", clientType: "PARTNER", hasCover: true };
    case "ROA_IND": return { docType: "ROA", clientType: "INDIVIDUAL", hasCover: null };
    case "ROA_PAR": return { docType: "ROA", clientType: "PARTNER", hasCover: null };
    case "SOE": return { docType: "SOE", clientType: null, hasCover: null };
    default: return { docType: "SOA", clientType: "INDIVIDUAL", hasCover: false };
  }
}

export default function TemplatesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("SOA_IND_NC");
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [name, setName] = useState("");
  const [html, setHtml] = useState("");
  const [css, setCss] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Track if user has edited so we don't overwrite their changes
  const userEdited = useRef(false);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/templates");
      const data = await res.json();
      setTemplates(data.templates || []);
      return data.templates || [];
    } catch {
      return [];
    }
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    loadTemplates().finally(() => setLoading(false));
  }, [loadTemplates]);

  // When tab changes, load template data for that tab
  useEffect(() => {
    userEdited.current = false;
    const { docType, clientType, hasCover } = parseTabId(activeTab);
    const match = templates.find(
      (t) =>
        t.docType === docType &&
        t.clientType === clientType &&
        t.hasCover === hasCover &&
        t.isActive
    );
    if (match) {
      setName(match.name);
      setHtml(match.html);
      setCss(match.css);
    } else {
      // Try without hasCover filter (legacy templates)
      const fallback = templates.find(
        (t) => t.docType === docType && t.clientType === clientType && t.isActive
      );
      if (fallback) {
        setName(fallback.name);
        setHtml(fallback.html);
        setCss(fallback.css);
      } else {
        setName("");
        setHtml("");
        setCss("");
      }
    }
    setShowPreview(false);
  }, [activeTab, templates]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg("");
    const { docType, clientType, hasCover } = parseTabId(activeTab);

    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType,
          clientType,
          hasCover,
          name: name || `${docType} Template`,
          html,
          css,
        }),
      });

      if (res.ok) {
        setSaveMsg("Saved!");
        // Refresh but don't reset the editor (userEdited prevents it)
        userEdited.current = true;
        await loadTemplates();
        setTimeout(() => setSaveMsg(""), 2000);
      } else {
        const err = await res.json();
        setSaveMsg(`Error: ${err.error || "Save failed"}`);
      }
    } catch {
      setSaveMsg("Error: Save failed");
    } finally {
      setSaving(false);
    }
  };

  const { docType, clientType, hasCover } = parseTabId(activeTab);
  const versions = templates
    .filter((t) => t.docType === docType && t.clientType === clientType && (t.hasCover === hasCover || t.hasCover === null))
    .sort((a, b) => b.version - a.version);

  return (
    <div className="min-h-screen" style={{ background: "#FAFAF9" }}>
      <Header />
      <main className="pt-16">
        <div className="max-w-[1280px] mx-auto px-6 py-8 animate-fade-in">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push("/")} className="text-xs cursor-pointer" style={{ color: "#8A8A8A" }}>&larr; Dashboard</button>
              <h1 className="text-xl font-semibold" style={{ color: "#1A1A1A" }}>Templates</h1>
            </div>
            <div className="flex items-center gap-3">
              {saveMsg && (
                <span className="text-xs font-medium" style={{ color: saveMsg.startsWith("Error") ? "#E65100" : "#2E7D32" }}>
                  {saveMsg}
                </span>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                disabled={!html}
              >
                {showPreview ? "Back to Edit" : "Preview"}
              </Button>
              <Button onClick={handleSave} disabled={saving || !html}>
                {saving ? "Saving..." : "Save Template"}
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 overflow-x-auto pb-1">
            <Tabs tabs={TEMPLATE_TABS} active={activeTab} onChange={setActiveTab} />
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: "#E5E1DC", borderTopColor: "#C08B6F" }} />
              <span className="text-[13px]" style={{ color: "#8A8A8A" }}>Loading templates...</span>
            </div>
          ) : showPreview ? (
            /* ─── PREVIEW MODE ─── */
            <div>
              <div className="mb-3 px-1">
                <span className="text-xs" style={{ color: "#8A8A8A" }}>Previewing: {name || "Untitled"}</span>
              </div>
              <div
                className="rounded-xl overflow-hidden bg-white"
                style={{
                  border: "1px solid #F0EDEA",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                  minHeight: "600px",
                }}
              >
                <iframe
                  srcDoc={css ? `<style>${css}</style>${html}` : html}
                  className="w-full border-0"
                  style={{ minHeight: "800px", height: "100%" }}
                  title="Template Preview"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          ) : (
            /* ─── EDIT MODE ─── */
            <div className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "#8A8A8A" }}>Template Name</label>
                <input
                  value={name}
                  onChange={(e) => { setName(e.target.value); userEdited.current = true; }}
                  className="w-full max-w-md px-3 py-2 text-sm rounded-lg focus-ring transition-all"
                  style={{ border: "1px solid #E5E1DC", color: "#1A1A1A", outline: "none", background: "white" }}
                />
              </div>

              {/* Version selector */}
              {versions.length > 1 && (
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "#8A8A8A" }}>Version History ({versions.length} versions)</label>
                  <select
                    className="px-3 py-2 text-sm rounded-lg focus-ring transition-all"
                    style={{ border: "1px solid #E5E1DC", color: "#1A1A1A", outline: "none", background: "white" }}
                    onChange={(e) => {
                      const v = versions.find((t) => t.id === e.target.value);
                      if (v) { setName(v.name); setHtml(v.html); setCss(v.css); }
                    }}
                    value={versions.find((v) => v.isActive)?.id || versions[0]?.id}
                  >
                    {versions.map((v) => (
                      <option key={v.id} value={v.id}>
                        v{v.version} {v.isActive ? "(active)" : ""} — {v.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* HTML Editor */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "#8A8A8A" }}>HTML Template</label>
                  <span className="text-[10px]" style={{ color: "#B0A99F" }}>{html.length.toLocaleString()} chars</span>
                </div>
                <textarea
                  value={html}
                  onChange={(e) => { setHtml(e.target.value); userEdited.current = true; }}
                  rows={30}
                  className="w-full px-4 py-3 text-[11px] rounded-lg focus-ring transition-all resize-y"
                  style={{
                    border: "1px solid #E5E1DC",
                    color: "#1A1A1A",
                    outline: "none",
                    fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
                    lineHeight: "1.7",
                    background: "white",
                    tabSize: 2,
                  }}
                  spellCheck={false}
                />
              </div>

              {/* CSS Editor */}
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "#8A8A8A" }}>Additional CSS (optional)</label>
                <textarea
                  value={css}
                  onChange={(e) => { setCss(e.target.value); userEdited.current = true; }}
                  rows={6}
                  className="w-full px-4 py-3 text-[11px] rounded-lg focus-ring transition-all resize-y"
                  style={{
                    border: "1px solid #E5E1DC",
                    color: "#1A1A1A",
                    outline: "none",
                    fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
                    lineHeight: "1.7",
                    background: "white",
                    tabSize: 2,
                  }}
                  spellCheck={false}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
