"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState, useEffect } from "react";

export default function Header() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setEmail(d.user?.email ?? null))
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-6"
      style={{
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      <div className="flex items-center justify-between w-full max-w-[1280px] mx-auto">
        {/* Left: Logo */}
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <Image
            src="/smiths-logo.svg"
            alt="Smiths"
            width={140}
            height={36}
            priority
          />
        </button>

        {/* Center: Title */}
        <span
          className="text-sm font-medium hidden sm:block"
          style={{ color: "#1A1A1A", letterSpacing: "-0.01em" }}
        >
          Advice Builder
        </span>

        {/* Right: User */}
        <div className="relative">
          {email && (
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer"
              style={{
                background: "#F5F3F0",
                color: "#3D3D3D",
                border: "1px solid transparent",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "#E5E1DC";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "transparent";
              }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold"
                style={{ background: "#C08B6F" }}
              >
                {email.charAt(0).toUpperCase()}
              </div>
              {email}
            </button>
          )}

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <div
                className="absolute right-0 top-10 z-50 w-44 py-1.5 rounded-lg"
                style={{
                  background: "white",
                  border: "1px solid #F0EDEA",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm transition-colors cursor-pointer"
                  style={{ color: "#3D3D3D" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "#FAFAF9";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
