import React, { useRef } from "react";

interface FileUploadProps {
  value: File | null;
  onChange: (file: File | null) => void;
  error?: string | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({ value, onChange, error }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && !file.type.startsWith("audio/")) {
      onChange(null);
      return;
    }
    onChange(file || null);
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <label className="font-semibold text-[#1E293B] text-base mb-1" htmlFor="audio-upload">
        Upload Audio File
      </label>
      <input
        ref={fileInputRef}
        id="audio-upload"
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="bg-gradient-to-r from-[#4F7EF7] to-[#6B92F9] text-white font-semibold rounded-lg px-6 py-2 shadow transition hover:from-[#3B5EE5] hover:to-[#4F7EF7] focus:outline-none focus:ring-2 focus:ring-[#4F7EF7]"
      >
        {value ? `Selected: ${value.name}` : "Choose File"}
      </button>
      {error && <span className="text-[#EF4444] text-sm mt-1">{error}</span>}
    </div>
  );
};
