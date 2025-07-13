import React from "react";

interface PromptInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
}

export const PromptInput: React.FC<PromptInputProps> = ({ value, onChange, placeholder }) => (
  <div className="w-full flex flex-col gap-2">
    <label className="font-semibold text-[#1E293B] text-base mb-1" htmlFor="system-prompt">
      System Prompt
    </label>
    <textarea
      id="system-prompt"
      value={value}
      onChange={onChange}
      rows={4}
      className="w-full rounded-lg border border-[#E2E8F0] p-3 text-base text-[#334155] placeholder-[#94A3B8] focus:border-[#4F7EF7] focus:outline-none focus:ring-2 focus:ring-[#4F7EF7]/20 transition"
      placeholder={placeholder || "Describe what you want the AI to summarize..."}
    />
  </div>
);
