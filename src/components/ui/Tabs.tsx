"use client";

interface TabsProps {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}

export default function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div
      className="inline-flex p-1 rounded-[10px]"
      style={{ background: "#F5F3F0" }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="px-5 py-2 text-[13px] font-medium rounded-lg transition-all duration-200 cursor-pointer"
            style={{
              background: isActive ? "white" : "transparent",
              color: isActive ? "#1A1A1A" : "#8A8A8A",
              boxShadow: isActive
                ? "0 1px 3px rgba(0,0,0,0.08)"
                : "none",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
