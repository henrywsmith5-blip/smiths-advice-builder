"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewCasePage() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.case?.id) {
          router.replace(`/cases/${d.case.id}`);
        } else {
          router.replace("/");
        }
      })
      .catch(() => router.replace("/"));
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "#E5E1DC", borderTopColor: "#C08B6F" }} />
    </div>
  );
}
