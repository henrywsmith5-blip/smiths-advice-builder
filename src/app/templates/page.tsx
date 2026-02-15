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
  name: string;
  html: string;
  css: string;
  version: number;
  isActive: boolean;
}

const TEMPLATE_TABS = [
  { id: "SOA_INDIVIDUAL", label: "SOA Individual" },
  { id: "SOA_PARTNER", label: "SOA Partner" },
  { id: "ROA_INDIVIDUAL", label: "ROA Individual" },
  { id: "ROA_PARTNER", label: "ROA Partner" },
  { id: "SOE", label: "SOE" },
];

function parseTabId(tabId: string): { docType: string; clientType: string | null } {
  if (tabId === "SOE") return { docType: "SOE", clientType: null };
  const [docType, clientType] = tabId.split("_");
  return { docType, clientType };
}

export default function TemplatesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("SOA_INDIVIDUAL");
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editor state
  const [name, setName] = useState("");
  const [html, setHtml] = useState("");
  const [css, setCss] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Load templates
  useEffect(() => {
    setLoading(true);
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Update editor when tab changes
  useEffect(() => {
    const { docType, clientType } = parseTabId(activeTab);
    const active = templates.find(
      (t) => t.docType === docType && t.clientType === clientType && t.isActive
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
    const { docType, clientType } = parseTabId(activeTab);

    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType,
          clientType,
          name: name || `${docType} Template`,
          html,
          css,
        }),
      });

      if (res.ok) {
        // Refresh templates
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

  const { docType, clientType } = parseTabId(activeTab);
  const versions = templates
    .filter((t) => t.docType === docType && t.clientType === clientType)
    .sort((a, b) => b.version - a.version);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="pt-16">
        <div className="max-w-[1280px] mx-auto px-6 py-8 animate-fade-in">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push("/")} className="text-xs cursor-pointer" style={{ color: "#8A8A8A" }}>
                &larr; Dashboard
              </button>
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

          {/* Tabs */}
          <div className="mb-6 overflow-x-auto">
            <Tabs tabs={TEMPLATE_TABS} active={activeTab} onChange={setActiveTab} />
          </div>

          {loading ? (
            <div className="text-center py-20" style={{ color: "#8A8A8A" }}>Loading...</div>
          ) : showPreview ? (
            /* Preview mode */
            <div
              className="rounded-xl overflow-hidden"
              style={{
                border: "1px solid #F0EDEA",
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              }}
            >
              <iframe
                srcDoc={css ? `<style>${css}</style>${html}` : html}
                className="w-full border-0"
                style={{ minHeight: "800px" }}
                title="Template Preview"
                sandbox="allow-same-origin"
              />
            </div>
          ) : (
            /* Edit mode */
            <div className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "#8A8A8A" }}>
                  Template Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg focus-ring transition-all"
                  style={{ border: "1px solid #E5E1DC", color: "#1A1A1A", outline: "none" }}
                />
              </div>

              {/* Version selector */}
              {versions.length > 1 && (
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "#8A8A8A" }}>
                    Version History
                  </label>
                  <select
                    className="px-3 py-2 text-sm rounded-lg focus-ring transition-all"
                    style={{ border: "1px solid #E5E1DC", color: "#1A1A1A", outline: "none" }}
                    onChange={(e) => {
                      const v = versions.find((t) => t.id === e.target.value);
                      if (v) {
                        setName(v.name);
                        setHtml(v.html);
                        setCss(v.css);
                      }
                    }}
                    defaultValue={versions.find((v) => v.isActive)?.id}
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
                <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "#8A8A8A" }}>
                  HTML Template
                </label>
                <textarea
                  value={html}
                  onChange={(e) => setHtml(e.target.value)}
                  rows={24}
                  className="w-full px-4 py-3 text-xs rounded-lg focus-ring transition-all resize-y"
                  style={{
                    border: "1px solid #E5E1DC",
                    color: "#1A1A1A",
                    outline: "none",
                    fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
                    lineHeight: "1.6",
                    background: "#FAFAF9",
                    tabSize: 2,
                  }}
                  spellCheck={false}
                />
              </div>

              {/* CSS Editor */}
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "#8A8A8A" }}>
                  Additional CSS (injected into &lt;style&gt;)
                </label>
                <textarea
                  value={css}
                  onChange={(e) => setCss(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 text-xs rounded-lg focus-ring transition-all resize-y"
                  style={{
                    border: "1px solid #E5E1DC",
                    color: "#1A1A1A",
                    outline: "none",
                    fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
                    lineHeight: "1.6",
                    background: "#FAFAF9",
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
