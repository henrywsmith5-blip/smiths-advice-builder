"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Tabs from "@/components/ui/Tabs";
import Button from "@/components/ui/Button";

interface TemplateItem {
  id: string;
  docType: string;
  name: string;
  html: string;
  css: string;
  version: number;
  isActive: boolean;
}

const TEMPLATE_TABS = [
  { id: "SOA", label: "Statement of Advice" },
  { id: "ROA", label: "Record of Advice" },
  { id: "SOE", label: "Scope of Engagement" },
];

export default function TemplatesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("SOA");
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [name, setName] = useState("");
  const [html, setHtml] = useState("");
  const [css, setCss] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const userEdited = useRef(false);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/templates");
      const data = await res.json();
      setTemplates(data.templates || []);
      return data.templates || [];
    } catch { return []; }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadTemplates().finally(() => setLoading(false));
  }, [loadTemplates]);

  useEffect(() => {
    userEdited.current = false;
    const match = templates.find(
      (t) => t.docType === activeTab && t.isActive
    );
    if (match) {
      setName(match.name);
      setHtml(match.html);
      setCss(match.css);
    } else {
      setName("");
      setHtml("");
      setCss("");
    }
    setShowPreview(false);
  }, [activeTab, templates]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType: activeTab, name: name || `${activeTab} Template`, html, css }),
      });
      if (res.ok) {
        setSaveMsg("Saved!");
        userEdited.current = true;
        await loadTemplates();
        setTimeout(() => setSaveMsg(""), 2000);
      } else {
        const err = await res.json();
        setSaveMsg(`Error: ${err.error || "Save failed"}`);
      }
    } catch { setSaveMsg("Error: Save failed"); }
    finally { setSaving(false); }
  };

  const versions = templates
    .filter((t) => t.docType === activeTab)
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
              {saveMsg && (
                <span className="text-xs font-medium" style={{ color: saveMsg.startsWith("Error") ? "#E65100" : "#2E7D32" }}>{saveMsg}</span>
              )}
              <Button variant="secondary" size="sm" onClick={() => setShowPreview(!showPreview)} disabled={!html}>
                {showPreview ? "Back to Edit" : "Preview"}
              </Button>
              <Button onClick={handleSave} disabled={saving || !html}>
                {saving ? "Saving..." : "Save Template"}
              </Button>
            </div>
          </div>

          <div className="mb-6">
            <Tabs tabs={TEMPLATE_TABS} active={activeTab} onChange={setActiveTab} />
          </div>

          <p className="text-xs mb-6" style={{ color: "#8A8A8A" }}>
            One template per document type. Nunjucks conditionals handle Single/Partner and Cover/NoCover variants automatically.
          </p>

          {loading ? (
            <div className="text-center py-20">
              <div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: "#E5E1DC", borderTopColor: "#C08B6F" }} />
            </div>
          ) : showPreview ? (
            <div>
              <div className="mb-3"><span className="text-xs" style={{ color: "#8A8A8A" }}>Previewing: {name || "Untitled"}</span></div>
              <div className="rounded-xl overflow-hidden bg-white" style={{ border: "1px solid #F0EDEA", boxShadow: "0 4px 12px rgba(0,0,0,0.06)", minHeight: "600px" }}>
                <iframe srcDoc={css ? `<style>${css}</style>${html}` : html} className="w-full border-0" style={{ minHeight: "900px" }} title="Template Preview" sandbox="allow-same-origin" />
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "#8A8A8A" }}>Template Name</label>
                <input value={name} onChange={(e) => { setName(e.target.value); userEdited.current = true; }} className="w-full max-w-md px-3 py-2 text-sm rounded-lg focus-ring" style={{ border: "1px solid #E5E1DC", color: "#1A1A1A", outline: "none", background: "white" }} />
              </div>

              {versions.length > 1 && (
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "#8A8A8A" }}>Version History ({versions.length} versions)</label>
                  <select className="px-3 py-2 text-sm rounded-lg focus-ring" style={{ border: "1px solid #E5E1DC", color: "#1A1A1A", outline: "none", background: "white" }}
                    onChange={(e) => { const v = versions.find((t) => t.id === e.target.value); if (v) { setName(v.name); setHtml(v.html); setCss(v.css); } }}
                    value={versions.find((v) => v.isActive)?.id || versions[0]?.id}>
                    {versions.map((v) => (<option key={v.id} value={v.id}>v{v.version} {v.isActive ? "(active)" : ""} — {v.name}</option>))}
                  </select>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "#8A8A8A" }}>HTML Template (Nunjucks)</label>
                  <span className="text-[10px]" style={{ color: "#B0A99F" }}>{html.length.toLocaleString()} chars</span>
                </div>
                <textarea value={html} onChange={(e) => { setHtml(e.target.value); userEdited.current = true; }} rows={32}
                  className="w-full px-4 py-3 text-[11px] rounded-lg focus-ring resize-y"
                  style={{ border: "1px solid #E5E1DC", color: "#1A1A1A", outline: "none", fontFamily: "'SF Mono','Fira Code','Consolas',monospace", lineHeight: "1.7", background: "white", tabSize: 2 }}
                  spellCheck={false} />
              </div>

              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "#8A8A8A" }}>Additional CSS (optional)</label>
                <textarea value={css} onChange={(e) => { setCss(e.target.value); userEdited.current = true; }} rows={6}
                  className="w-full px-4 py-3 text-[11px] rounded-lg focus-ring resize-y"
                  style={{ border: "1px solid #E5E1DC", color: "#1A1A1A", outline: "none", fontFamily: "'SF Mono','Fira Code','Consolas',monospace", lineHeight: "1.7", background: "white", tabSize: 2 }}
                  spellCheck={false} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
