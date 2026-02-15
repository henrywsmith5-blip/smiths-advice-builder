"use client";

import { useEffect, useState } from "react";
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

  const [name, setName] = useState("");
  const [html, setHtml] = useState("");
  const [css, setCss] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const { docType, clientType, hasCover } = parseTabId(activeTab);
    const active = templates.find(
      (t) =>
        t.docType === docType &&
        t.clientType === clientType &&
        t.hasCover === hasCover &&
        t.isActive
    );
    if (active) {
      setName(active.name);
      setHtml(active.html);
      setCss(active.css);
    } else {
      setName("");
      setHtml("");
      setCss("");
    }
    setShowPreview(false);
  }, [activeTab, templates]);

  const handleSave = async () => {
    setSaving(true);
    const { docType, clientType, hasCover } = parseTabId(activeTab);

    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType, clientType, hasCover, name: name || `${docType} Template`, html, css }),
      });

      if (res.ok) {
        const refreshRes = await fetch("/api/templates");
        const refreshData = await refreshRes.json();
        setTemplates(refreshData.templates || []);
      }
    } catch {
      // handle error
    } finally {
      setSaving(false);
    }
  };

  const { docType, clientType, hasCover } = parseTabId(activeTab);
  const versions = templates
    .filter((t) => t.docType === docType && t.clientType === clientType && t.hasCover === hasCover)
    .sort((a, b) => b.version - a.version);

  return (
    <div className="min-h-screen" style={{ background: "#FAFAF9" }}>
      <Header />
      <main className="pt-16">
        <div className="max-w-[1280px] mx-auto px-6 py-8 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push("/")} className="text-xs cursor-pointer" style={{ color: "#8A8A8A" }}>&larr; Dashboard</button>
              <h1 className="text-xl font-semibold" style={{ color: "#1A1A1A" }}>Templates</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => setShowPreview(!showPreview)}>
                {showPreview ? "Edit" : "Preview"}
              </Button>
              <Button onClick={handleSave} disabled={saving || !html}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>

          <div className="mb-6 overflow-x-auto pb-1">
            <Tabs tabs={TEMPLATE_TABS} active={activeTab} onChange={setActiveTab} />
          </div>

          {loading ? (
            <div className="text-center py-20" style={{ color: "#8A8A8A" }}>Loading...</div>
          ) : showPreview ? (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #F0EDEA", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}>
              <iframe srcDoc={css ? `<style>${css}</style>${html}` : html} className="w-full border-0" style={{ minHeight: "800px" }} title="Template Preview" sandbox="allow-same-origin" />
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "#8A8A8A" }}>Template Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg focus-ring transition-all" style={{ border: "1px solid #E5E1DC", color: "#1A1A1A", outline: "none", background: "white" }} />
              </div>

              {versions.length > 1 && (
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "#8A8A8A" }}>Version History</label>
                  <select
                    className="px-3 py-2 text-sm rounded-lg focus-ring transition-all" style={{ border: "1px solid #E5E1DC", color: "#1A1A1A", outline: "none", background: "white" }}
                    onChange={(e) => { const v = versions.find((t) => t.id === e.target.value); if (v) { setName(v.name); setHtml(v.html); setCss(v.css); } }}
                    defaultValue={versions.find((v) => v.isActive)?.id}
                  >
                    {versions.map((v) => (<option key={v.id} value={v.id}>v{v.version} {v.isActive ? "(active)" : ""} — {v.name}</option>))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "#8A8A8A" }}>HTML Template</label>
                <textarea value={html} onChange={(e) => setHtml(e.target.value)} rows={28} className="w-full px-4 py-3 text-xs rounded-lg focus-ring transition-all resize-y" style={{ border: "1px solid #E5E1DC", color: "#1A1A1A", outline: "none", fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace", lineHeight: "1.6", background: "white", tabSize: 2 }} spellCheck={false} />
              </div>

              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "#8A8A8A" }}>Additional CSS</label>
                <textarea value={css} onChange={(e) => setCss(e.target.value)} rows={8} className="w-full px-4 py-3 text-xs rounded-lg focus-ring transition-all resize-y" style={{ border: "1px solid #E5E1DC", color: "#1A1A1A", outline: "none", fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace", lineHeight: "1.6", background: "white", tabSize: 2 }} spellCheck={false} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
