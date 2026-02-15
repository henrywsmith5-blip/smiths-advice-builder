"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#FAFAF9" }}>
      <div className="w-full max-w-[380px] px-6 animate-fade-in">
        {/* Logo */}
        <div className="flex justify-center mb-12">
          <Image
            src="/smiths-logo.png"
            alt="Smiths Insurance & KiwiSaver"
            width={220}
            height={56}
            priority
            style={{ objectFit: "contain", height: "48px", width: "auto" }}
          />
        </div>

        {/* Card */}
        <div
          className="bg-white rounded-2xl px-8 py-10"
          style={{
            boxShadow:
              "0 0 0 1px rgba(0,0,0,0.03), 0 2px 4px rgba(0,0,0,0.02), 0 12px 40px rgba(0,0,0,0.06)",
          }}
        >
          <h1 className="text-lg font-semibold text-center mb-0.5" style={{ color: "#1A1A1A", letterSpacing: "-0.02em" }}>
            Welcome back
          </h1>
          <p className="text-center text-[13px] mb-8" style={{ color: "#8A8A8A" }}>
            Sign in to Advice Builder
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-[11px] font-medium uppercase tracking-wider mb-1.5"
                style={{ color: "#8A8A8A", letterSpacing: "0.06em" }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
                className="w-full px-3.5 py-2.5 text-[14px] rounded-lg transition-all duration-200 focus-ring"
                style={{
                  border: "1px solid #E5E1DC",
                  color: "#1A1A1A",
                  outline: "none",
                  background: "#FAFAF9",
                }}
                placeholder="you@smiths.net.nz"
                onFocus={(e) => {
                  (e.target as HTMLElement).style.background = "#fff";
                }}
                onBlur={(e) => {
                  (e.target as HTMLElement).style.background = "#FAFAF9";
                }}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-[11px] font-medium uppercase tracking-wider mb-1.5"
                style={{ color: "#8A8A8A", letterSpacing: "0.06em" }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 text-[14px] rounded-lg transition-all duration-200 focus-ring"
                style={{
                  border: "1px solid #E5E1DC",
                  color: "#1A1A1A",
                  outline: "none",
                  background: "#FAFAF9",
                }}
                placeholder="••••••••"
                onFocus={(e) => {
                  (e.target as HTMLElement).style.background = "#fff";
                }}
                onBlur={(e) => {
                  (e.target as HTMLElement).style.background = "#FAFAF9";
                }}
              />
            </div>

            {error && (
              <div
                className="text-[13px] px-3.5 py-2.5 rounded-lg flex items-center gap-2"
                style={{
                  background: "#FFF3E0",
                  color: "#C75000",
                  border: "1px solid rgba(199,80,0,0.1)",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-[14px] font-semibold text-white rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              style={{
                background: "linear-gradient(135deg, #C08B6F 0%, #B07D63 100%)",
                boxShadow: "0 1px 3px rgba(192,139,111,0.3), 0 1px 2px rgba(0,0,0,0.06)",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  (e.target as HTMLElement).style.boxShadow = "0 2px 8px rgba(192,139,111,0.4), 0 1px 2px rgba(0,0,0,0.08)";
                  (e.target as HTMLElement).style.transform = "translateY(-0.5px)";
                }
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.boxShadow = "0 1px 3px rgba(192,139,111,0.3), 0 1px 2px rgba(0,0,0,0.06)";
                (e.target as HTMLElement).style.transform = "translateY(0)";
              }}
              onMouseDown={(e) => {
                (e.target as HTMLElement).style.transform = "scale(0.985)";
              }}
              onMouseUp={(e) => {
                (e.target as HTMLElement).style.transform = "translateY(-0.5px)";
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] mt-8" style={{ color: "#B0A99F" }}>
          Smiths Insurance &amp; KiwiSaver &mdash; Internal Use Only
        </p>
      </div>
    </div>
  );
}
