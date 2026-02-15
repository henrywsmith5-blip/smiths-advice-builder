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
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-[400px] px-6 animate-fade-in">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Image
            src="/smiths-logo.svg"
            alt="Smiths Insurance & KiwiSaver"
            width={180}
            height={48}
            priority
          />
        </div>

        {/* Card */}
        <div
          className="bg-white rounded-xl p-8"
          style={{
            border: "1px solid #F0EDEA",
            boxShadow:
              "0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <h1 className="text-xl font-semibold text-center mb-1" style={{ color: "#1A1A1A" }}>
            Sign in
          </h1>
          <p className="text-center text-sm mb-8" style={{ color: "#8A8A8A" }}>
            Smith&apos;s Advice Builder
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium uppercase tracking-wider mb-2"
                style={{ color: "#8A8A8A", letterSpacing: "0.04em" }}
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
                className="w-full px-3.5 py-2.5 text-sm rounded-lg transition-all duration-150 focus-ring"
                style={{
                  border: "1px solid #E5E1DC",
                  color: "#1A1A1A",
                  outline: "none",
                }}
                placeholder="you@smiths.net.nz"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium uppercase tracking-wider mb-2"
                style={{ color: "#8A8A8A", letterSpacing: "0.04em" }}
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
                className="w-full px-3.5 py-2.5 text-sm rounded-lg transition-all duration-150 focus-ring"
                style={{
                  border: "1px solid #E5E1DC",
                  color: "#1A1A1A",
                  outline: "none",
                }}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div
                className="text-sm px-3 py-2 rounded-lg"
                style={{
                  background: "#FFF3E0",
                  color: "#E65100",
                  border: "1px solid #FFCC80",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-semibold text-white rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-60"
              style={{
                background: loading ? "#D4A88E" : "#C08B6F",
                boxShadow: "0 1px 2px rgba(192,139,111,0.3)",
              }}
              onMouseEnter={(e) => {
                if (!loading) (e.target as HTMLElement).style.background = "#B07D63";
              }}
              onMouseLeave={(e) => {
                if (!loading) (e.target as HTMLElement).style.background = "#C08B6F";
              }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "#8A8A8A" }}>
          Smiths Insurance &amp; KiwiSaver &mdash; Internal Use Only
        </p>
      </div>
    </div>
  );
}
