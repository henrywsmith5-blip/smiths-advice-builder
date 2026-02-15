"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState, useEffect } from "react";

export default function Header() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setEmail(d.user?.email ?? null))
      .catch(() => {});

    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-6 transition-all duration-300"
      style={{
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "saturate(180%) blur(20px)",
        WebkitBackdropFilter: "saturate(180%) blur(20px)",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        boxShadow: scrolled ? "0 1px 3px rgba(0,0,0,0.04)" : "none",
      }}
    >
      <div className="flex items-center justify-between w-full max-w-[1280px] mx-auto">
        {/* Left: Logo */}
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity duration-200"
        >
          <Image
            src="/smiths-logo.png"
            alt="Smiths Insurance & KiwiSaver"
            width={160}
            height={40}
            priority
            style={{ objectFit: "contain", height: "32px", width: "auto" }}
          />
        </button>

        {/* Center: Divider + Title */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="w-px h-4" style={{ background: "#E5E1DC" }} />
          <span
            className="text-[13px] font-medium tracking-tight"
            style={{ color: "#3D3D3D" }}
          >
            Advice Builder
          </span>
        </div>

        {/* Right: User */}
        <div className="relative">
          {email && (
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200 cursor-pointer"
              style={{
                background: showMenu ? "#F0EDEA" : "transparent",
                color: "#3D3D3D",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#F5F3F0";
              }}
              onMouseLeave={(e) => {
                if (!showMenu) (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-semibold"
                style={{
                  background: "linear-gradient(135deg, #C08B6F 0%, #D4A88E 100%)",
                }}
              >
                {email.charAt(0).toUpperCase()}
              </div>
              <span className="hidden md:inline">{email}</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="ml-0.5 opacity-40">
                <path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <div
                className="absolute right-0 top-11 z-50 w-48 py-1 rounded-xl overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.95)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(0,0,0,0.06)",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <div className="px-4 py-2.5 text-[11px] font-medium truncate" style={{ color: "#8A8A8A", borderBottom: "1px solid #F0EDEA" }}>
                  {email}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-[13px] transition-colors cursor-pointer"
                  style={{ color: "#3D3D3D" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "#F5F3F0";
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
