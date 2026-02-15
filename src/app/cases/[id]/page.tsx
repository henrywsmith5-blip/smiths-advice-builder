"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Tabs from "@/components/ui/Tabs";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import FileDropzone from "@/components/FileDropzone";

type DocType = "SOA" | "ROA" | "SOE";
type GenStatus = "idle" | "generating" | "done" | "error";

interface CaseData {
  id: string;
  title: string;
  clientType: string;
  clientAName: string | null;
  clientBName: string | null;
  clientEmail: string | null;
  clientAHasExisting: boolean;
  clientBHasExisting: boolean;
  additionalContext: string | null;
  roaDeviations: string | null;
  firefliesText: string | null;
  quotesText: string | null;
  otherDocsText: string | null;
  documents: { id: string; docType: string; createdAt: string }[];
}

const DOC_TABS = [
  { id: "SOA", label: "SOA" },
  { id: "ROA", label: "ROA" },
  { id: "SOE", label: "Scope of Engagement" },
];

export default function CaseWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [activeTab, setActiveTab] = useState<DocType>("SOA");
  const [status, setStatus] = useState<GenStatus>("idle");
  const [error, setError] = useState("");

  // Form state
  const [clientType, setClientType] = useState<"INDIVIDUAL" | "PARTNER">("INDIVIDUAL");
  const [clientAName, setClientAName] = useState("");
  const [clientBName, setClientBName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAHasExisting, setClientAHasExisting] = useState(false);
  const [clientBHasExisting, setClientBHasExisting] = useState(false);
  const [firefliesPaste, setFirefliesPaste] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [roaDeviations, setRoaDeviations] = useState("");
  const [saveCase, setSaveCase] = useState(true);

  // Files
  const [firefliesFiles, setFirefliesFiles] = useState<File[]>([]);
  const [quoteFiles, setQuoteFiles] = useState<File[]>([]);
  const [otherFiles, setOtherFiles] = useState<File[]>([]);

  // Output
  const [docId, setDocId] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  // Parsed texts (from ingest)
  const [firefliesText, setFirefliesText] = useState("");
  const [quotesText, setQuotesText] = useState("");
  const [otherDocsText, setOtherDocsText] = useState("");

  // Load case data
  useEffect(() => {
    fetch(`/api/cases/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.case) {
          const c = d.case as CaseData;
          setCaseData(c);
          setClientType(c.clientType as "INDIVIDUAL" | "PARTNER");
          setClientAName(c.clientAName || "");
          setClientBName(c.clientBName || "");
          setClientEmail(c.clientEmail || "");
          setClientAHasExisting(c.clientAHasExisting);
          setClientBHasExisting(c.clientBHasExisting);
          setAdditionalContext(c.additionalContext || "");
          setRoaDeviations(c.roaDeviations || "");
          if (c.firefliesText) setFirefliesText(c.firefliesText);
          if (c.quotesText) setQuotesText(c.quotesText);
          if (c.otherDocsText) setOtherDocsText(c.otherDocsText);

          // If there's a most recent document, show it
          if (c.documents.length > 0) {
            const latest = c.documents[0];
            setDocId(latest.id);
            setStatus("done");
            // Load its HTML
            fetch(`/api/docs/${latest.id}/html`)
              .then((r) => r.text())
              .then((html) => setPreviewHtml(html))
              .catch(() => {});
          }
        }
      })
      .catch(() => {});
  }, [id]);

  const handleIngest = useCallback(async () => {
    if (firefliesFiles.length === 0 && quoteFiles.length === 0 && otherFiles.length === 0 && !firefliesPaste) {
      return;
    }

    const formData = new FormData();
    firefliesFiles.forEach((f) => formData.append("fireflies", f));
    quoteFiles.forEach((f) => formData.append("quotes", f));
    otherFiles.forEach((f) => formData.append("others", f));
    if (firefliesPaste) formData.append("firefliesPaste", firefliesPaste);

    const res = await fetch(`/api/cases/${id}/ingest`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (data.texts) {
      if (data.texts.firefliesText) setFirefliesText(data.texts.firefliesText);
      if (data.texts.quotesText) setQuotesText(data.texts.quotesText);
      if (data.texts.otherDocsText) setOtherDocsText(data.texts.otherDocsText);
    }

    return data;
  }, [firefliesFiles, quoteFiles, otherFiles, firefliesPaste, id]);

  const handleGenerate = async () => {
    setStatus("generating");
    setError("");
    setDocId(null);
    setPreviewHtml(null);

    try {
      // First ingest any new files
      await handleIngest();

      // Save case metadata
      await fetch(`/api/cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientType,
          clientAName: clientAName || null,
          clientBName: clientBName || null,
          clientEmail: clientEmail || null,
          clientAHasExisting,
          clientBHasExisting,
          additionalContext: additionalContext || null,
          roaDeviations: roaDeviations || null,
          title: clientAName
            ? `${clientAName}${clientBName ? ` & ${clientBName}` : ""} — ${new Date().toLocaleDateString("en-NZ")}`
            : undefined,
        }),
      });

      // Generate
      const res = await fetch(`/api/cases/${id}/generate?docType=${activeTab}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firefliesText: firefliesText || firefliesPaste,
          quotesText,
          otherDocsText,
          additionalContext,
          roaDeviations: activeTab === "ROA" ? roaDeviations : undefined,
          clientAName: clientAName || undefined,
          clientBName: clientType === "PARTNER" ? clientBName || undefined : undefined,
          clientEmail: clientEmail || undefined,
          clientAHasExisting,
          clientBHasExisting: clientType === "PARTNER" ? clientBHasExisting : false,
          saveCase,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setDocId(data.docId);
      setStatus("done");

      // Load the rendered HTML for preview
      const htmlRes = await fetch(`/api/docs/${data.docId}/html`);
      if (htmlRes.ok) {
        const html = await htmlRes.text();
        setPreviewHtml(html);
      }
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Generation failed");
    }
  };

  const handleClear = () => {
    setFirefliesPaste("");
    setFirefliesFiles([]);
    setQuoteFiles([]);
    setOtherFiles([]);
    setAdditionalContext("");
    setRoaDeviations("");
    setFirefliesText("");
    setQuotesText("");
    setOtherDocsText("");
    setDocId(null);
    setPreviewHtml(null);
    setStatus("idle");
    setError("");
  };

  if (!caseData) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="pt-16 flex items-center justify-center" style={{ minHeight: "calc(100vh - 64px)" }}>
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "#E5E1DC", borderTopColor: "#C08B6F" }} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="pt-16">
        <div className="max-w-[1280px] mx-auto px-6 animate-fade-in">
          {/* Tab bar */}
          <div className="flex items-center justify-between py-6">
            <button onClick={() => router.push("/")} className="text-xs cursor-pointer" style={{ color: "#8A8A8A" }}>
              &larr; Back to cases
            </button>
            <Tabs tabs={DOC_TABS} active={activeTab} onChange={(t) => setActiveTab(t as DocType)} />
            <span className="text-xs" style={{ color: "#8A8A8A" }}>
              {caseData.title || "Untitled Case"}
            </span>
          </div>

          {/* Split layout */}
          <div className="flex gap-6 pb-12" style={{ minHeight: "calc(100vh - 160px)" }}>
            {/* LEFT: Inputs */}
            <div className="w-[40%] shrink-0 overflow-y-auto pr-4" style={{ maxHeight: "calc(100vh - 160px)" }}>
              <div className="space-y-6">
                {/* Client Details */}
                <section>
                  <h3 className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: "#8A8A8A", letterSpacing: "0.04em" }}>Client Details</h3>

                  {/* Client Type Toggle */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="inline-flex p-1 rounded-lg" style={{ background: "#F5F3F0" }}>
                      {(["INDIVIDUAL", "PARTNER"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setClientType(t)}
                          className="px-4 py-1.5 text-xs font-medium rounded-md transition-all duration-200 cursor-pointer"
                          style={{
                            background: clientType === t ? "white" : "transparent",
                            color: clientType === t ? "#1A1A1A" : "#8A8A8A",
                            boxShadow: clientType === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                          }}
                        >
                          {t === "INDIVIDUAL" ? "Individual" : "Partner / Couple"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "#8A8A8A" }}>
                        {clientType === "PARTNER" ? "Client A Name" : "Client Name"}
                      </label>
                      <input
                        value={clientAName}
                        onChange={(e) => setClientAName(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg focus-ring transition-all"
                        style={{ border: "1px solid #E5E1DC", color: "#1A1A1A", outline: "none" }}
                        placeholder="John Smith"
                      />
                    </div>
                    {clientType === "PARTNER" && (
                      <div>
                        <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "#8A8A8A" }}>Client B Name</label>
                        <input
                          value={clientBName}
                          onChange={(e) => setClientBName(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg focus-ring transition-all"
                          style={{ border: "1px solid #E5E1DC", color: "#1A1A1A", outline: "none" }}
                          placeholder="Jane Smith"
                        />
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "#8A8A8A" }}>Email (optional)</label>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg focus-ring transition-all"
                      style={{ border: "1px solid #E5E1DC", color: "#1A1A1A", outline: "none" }}
                      placeholder="client@email.com"
                    />
                  </div>

                  {/* Existing Cover Toggles */}
                  <div className="flex flex-col gap-2 mt-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div
                        className="relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer"
                        style={{ background: clientAHasExisting ? "#C08B6F" : "#E5E1DC" }}
                        onClick={() => setClientAHasExisting(!clientAHasExisting)}
                      >
                        <div
                          className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                          style={{ transform: clientAHasExisting ? "translateX(22px)" : "translateX(2px)" }}
                        />
                      </div>
                      <span className="text-xs" style={{ color: "#3D3D3D" }}>
                        {clientType === "PARTNER" ? "Client A has existing cover" : "Has existing cover"}
                      </span>
                    </label>
                    {clientType === "PARTNER" && (
                      <label className="flex items-center gap-3 cursor-pointer">
                        <div
                          className="relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer"
                          style={{ background: clientBHasExisting ? "#C08B6F" : "#E5E1DC" }}
                          onClick={() => setClientBHasExisting(!clientBHasExisting)}
                        >
                          <div
                            className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                            style={{ transform: clientBHasExisting ? "translateX(22px)" : "translateX(2px)" }}
                          />
                        </div>
                        <span className="text-xs" style={{ color: "#3D3D3D" }}>Client B has existing cover</span>
                      </label>
                    )}
                  </div>
                </section>

                <hr style={{ border: "none", borderTop: "1px solid #F0EDEA" }} />

                {/* Fireflies Transcript */}
                <section>
                  <h3 className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: "#8A8A8A", letterSpacing: "0.04em" }}>Fireflies Transcript</h3>
                  <textarea
                    value={firefliesPaste}
                    onChange={(e) => setFirefliesPaste(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 text-sm rounded-lg focus-ring transition-all resize-none mb-3"
                    style={{ border: "1px solid #E5E1DC", color: "#1A1A1A", outline: "none" }}
                    placeholder="Paste transcript text here..."
                  />
                  <FileDropzone
                    label="Or upload transcript file"
                    accept=".txt,.md,.pdf"
                    files={firefliesFiles}
                    onFilesChange={setFirefliesFiles}
                    hint="Supports .txt, .md, .pdf"
                  />
                </section>

                <hr style={{ border: "none", borderTop: "1px solid #F0EDEA" }} />

                {/* Quote Documents */}
                <section>
                  <FileDropzone
                    label="Quote Documents"
                    accept=".pdf"
                    files={quoteFiles}
                    onFilesChange={setQuoteFiles}
                    hint="QuoteMonster, QuoteHub, insurer quotes (PDF)"
                  />
                </section>

                <hr style={{ border: "none", borderTop: "1px solid #F0EDEA" }} />

                {/* Other Documents */}
                <section>
                  <FileDropzone
                    label="Other Documents"
                    accept=".pdf"
                    files={otherFiles}
                    onFilesChange={setOtherFiles}
                    hint="Any other relevant PDFs"
                  />
                </section>

                <hr style={{ border: "none", borderTop: "1px solid #F0EDEA" }} />

                {/* Additional Context */}
                <section>
                  <label className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "#8A8A8A", letterSpacing: "0.04em" }}>
                    Additional Context
                  </label>
                  <textarea
                    value={additionalContext}
                    onChange={(e) => setAdditionalContext(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm rounded-lg focus-ring transition-all resize-none"
                    style={{ border: "1px solid #E5E1DC", color: "#1A1A1A", outline: "none" }}
                    placeholder="Any additional notes or instructions..."
                  />
                </section>

                {/* ROA Deviations */}
                {activeTab === "ROA" && (
                  <section>
                    <label className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "#8A8A8A", letterSpacing: "0.04em" }}>
                      Deviations / Differences vs SOA
                    </label>
                    <textarea
                      value={roaDeviations}
                      onChange={(e) => setRoaDeviations(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-sm rounded-lg focus-ring transition-all resize-none"
                      style={{ border: "1px solid #E5E1DC", color: "#1A1A1A", outline: "none" }}
                      placeholder="Note any differences from the SOA..."
                    />
                  </section>
                )}

                {/* Save toggle + Generate */}
                <section className="pb-4">
                  <label className="flex items-center gap-3 mb-4 cursor-pointer">
                    <div
                      className="relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer"
                      style={{ background: saveCase ? "#C08B6F" : "#E5E1DC" }}
                      onClick={() => setSaveCase(!saveCase)}
                    >
                      <div
                        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                        style={{ transform: saveCase ? "translateX(22px)" : "translateX(2px)" }}
                      />
                    </div>
                    <span className="text-xs" style={{ color: "#3D3D3D" }}>Save this case</span>
                  </label>

                  <Button
                    onClick={handleGenerate}
                    disabled={status === "generating"}
                    className="w-full"
                    size="lg"
                  >
                    {status === "generating" ? "Generating..." : `Generate ${activeTab}`}
                  </Button>
                </section>
              </div>
            </div>

            {/* RIGHT: Output */}
            <div
              className="flex-1 rounded-xl overflow-hidden flex flex-col"
              style={{ background: "#FAFAF9", border: "1px solid #F0EDEA" }}
            >
              {/* Disclaimer */}
              <div
                className="px-4 py-2.5 text-xs flex items-center gap-2"
                style={{
                  background: "rgba(192,139,111,0.08)",
                  borderBottom: "1px solid rgba(192,139,111,0.15)",
                  color: "#8A6B55",
                  borderLeft: "3px solid #C08B6F",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                Draft generated with AI. Must be reviewed and approved by an adviser before sending to clients.
              </div>

              {/* Top bar */}
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #F0EDEA" }}>
                <StatusBadge status={status} />
                <div className="flex items-center gap-2">
                  {docId && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => window.open(`/api/docs/${docId}/pdf`, "_blank")}
                      >
                        Download PDF
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => window.open(`/api/docs/${docId}/html`, "_blank")}
                      >
                        Download HTML
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/cases/${id}`
                          );
                        }}
                      >
                        Copy Link
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="sm" onClick={handleClear}>
                    Clear
                  </Button>
                </div>
              </div>

              {/* Preview area */}
              <div className="flex-1 overflow-auto p-4">
                {error && (
                  <div
                    className="px-4 py-3 rounded-lg mb-4 text-sm"
                    style={{ background: "#FFF3E0", color: "#E65100", border: "1px solid #FFCC80" }}
                  >
                    {error}
                  </div>
                )}

                {status === "generating" && (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div
                      className="w-8 h-8 border-2 rounded-full animate-spin mb-4"
                      style={{ borderColor: "#E5E1DC", borderTopColor: "#C08B6F" }}
                    />
                    <p className="text-sm" style={{ color: "#8A8A8A" }}>Generating {activeTab}...</p>
                    <p className="text-xs mt-1" style={{ color: "#B0A99F" }}>This may take 30-60 seconds</p>
                  </div>
                )}

                {status === "idle" && !previewHtml && (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                      style={{ background: "#F0EDEA" }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8A8A8A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                    </div>
                    <p className="text-sm" style={{ color: "#8A8A8A" }}>Generate a document to preview here</p>
                  </div>
                )}

                {previewHtml && (
                  <div
                    className="bg-white rounded-lg overflow-hidden"
                    style={{
                      boxShadow: "0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.08)",
                    }}
                  >
                    <iframe
                      srcDoc={previewHtml}
                      className="w-full border-0"
                      style={{ minHeight: "800px", height: "100%" }}
                      title="Document Preview"
                      sandbox="allow-same-origin"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
