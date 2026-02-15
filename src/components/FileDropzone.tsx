"use client";

import { useCallback, useState, useRef } from "react";

interface FileDropzoneProps {
  label: string;
  accept?: string;
  multiple?: boolean;
  files: File[];
  onFilesChange: (files: File[]) => void;
  hint?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileDropzone({
  label,
  accept,
  multiple = true,
  files,
  onFilesChange,
  hint,
}: FileDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = Array.from(e.dataTransfer.files);
      if (multiple) {
        onFilesChange([...files, ...dropped]);
      } else {
        onFilesChange(dropped.slice(0, 1));
      }
    },
    [files, multiple, onFilesChange]
  );

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    if (multiple) {
      onFilesChange([...files, ...selected]);
    } else {
      onFilesChange(selected.slice(0, 1));
    }
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label
        className="block text-xs font-medium uppercase tracking-wider mb-2"
        style={{ color: "#8A8A8A", letterSpacing: "0.04em" }}
      >
        {label}
      </label>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className="flex flex-col items-center justify-center gap-2 py-6 px-4 rounded-xl cursor-pointer transition-all duration-150"
        style={{
          border: `2px dashed ${dragOver ? "#C08B6F" : "#E5E1DC"}`,
          background: dragOver ? "rgba(192,139,111,0.04)" : "#FAFAF9",
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke={dragOver ? "#C08B6F" : "#8A8A8A"}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <span className="text-xs" style={{ color: "#8A8A8A" }}>
          Drag files here or <span style={{ color: "#C08B6F", fontWeight: 500 }}>browse</span>
        </span>
        {hint && (
          <span className="text-[10px]" style={{ color: "#B0A99F" }}>
            {hint}
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleSelect}
          className="hidden"
        />
      </div>

      {files.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-2">
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="flex items-center justify-between px-3 py-1.5 rounded-md text-xs"
              style={{
                background: "white",
                border: "1px solid #F0EDEA",
              }}
            >
              <span className="truncate mr-2" style={{ color: "#3D3D3D" }}>
                {file.name}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span style={{ color: "#8A8A8A" }}>{formatSize(file.size)}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                  className="w-5 h-5 flex items-center justify-center rounded-full transition-colors cursor-pointer"
                  style={{ color: "#8A8A8A" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "#FFF3E0";
                    (e.currentTarget as HTMLElement).style.color = "#E65100";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "#8A8A8A";
                  }}
                >
                  &times;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
