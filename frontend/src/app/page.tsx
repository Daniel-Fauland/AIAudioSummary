"use client";

import Image from "next/image";
import React, { useRef, useState } from "react";
import { Stepper } from "../components/Stepper";
import { FileUpload } from "../components/FileUpload";
import { PromptInput } from "../components/PromptInput";
import { Button } from "../components/Button";
import { useAudioSummarySession } from "../hooks/useAudioSummarySession";
import ReactMarkdown from "react-markdown";
import { uploadTempFile, createTranscript, getConfig, createSummary } from "../services/api";

const steps = ["Upload Audio", "Transcript", "AI Summary"];

export default function Home() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState("");
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const { save } = useAudioSummarySession();
  const [filePath, setFilePath] = useState<string | null>(null);
  const [isSummaryStreaming, setIsSummaryStreaming] = useState(false);

  // Step 1: Upload
  const handleFileChange = (file: File | null) => {
    if (file && !file.type.startsWith("audio/")) {
      setError("Please upload a valid audio file.");
      setAudioFile(null);
      return;
    }
    setAudioFile(file);
    setError(null);
  };

  // Step 2: Transcript
  const handleTranscriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTranscript(e.target.value);
  };

  // Step 3: Prompt
  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  // Step navigation
  const handleNextStep = async () => {
    if (step === 0 && audioFile) {
      setStep(1); // Immediately go to Step 2
      setIsProcessing(true);
      try {
        const path = await uploadTempFile(audioFile);
        setFilePath(path);
        const transcriptResult = await createTranscript(path);
        setTranscript(transcriptResult);
      } catch (err: any) {
        setError(err.message || "Failed to process file");
      }
      setIsProcessing(false);
    } else if (step === 1 && transcript) {
      setStep(2);
      setIsProcessing(true);
      try {
        const systemPrompt = await getConfig();
        setPrompt(systemPrompt);
      } catch (err: any) {
        setPrompt("");
      }
      setIsProcessing(false);
    } else if (step === 2 && prompt) {
      setIsSummaryStreaming(true);
      setSummary("");
      await createSummary({ text: transcript, system_prompt: prompt, stream: true }, (chunk) =>
        setSummary((prev) => (prev || "") + chunk)
      );
      setIsSummaryStreaming(false);
    }
  };

  const handleBack = () => {
    if (step === 1) {
      setStep(0);
      setTranscript("");
    } else if (step === 2) {
      setStep(1);
      setSummary(null);
    }
  };

  const handleStartOver = () => {
    setAudioFile(null);
    setTranscript("");
    setPrompt("");
    setSummary(null);
    setStep(0);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-4 pb-8 bg-gradient-to-b from-[#F8FAFF] to-[#E8F2FF]">
      {/* Header */}
      <header className="mb-6 w-full max-w-2xl text-center">
        <h1
          className="text-4xl sm:text-5xl font-bold text-[#0F172A] tracking-tight"
          style={{ letterSpacing: "-0.02em" }}
        >
          AI Audio Summary Platform
        </h1>
      </header>

      {/* Stepper */}
      <Stepper
        steps={steps}
        currentStep={step}
        stepStatus={{
          fileUploaded: !!audioFile,
          transcriptReady: !!transcript,
          summaryReady: !!summary,
        }}
      />

      {/* Step Content */}
      <main
        className="w-full max-w-xl bg-white rounded-xl shadow-md p-8 flex flex-col gap-8 items-center"
        style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #F8FAFF 100%)" }}
      >
        {/* Step 1: Upload Audio */}
        {step === 0 && (
          <>
            <FileUpload value={audioFile} onChange={handleFileChange} error={error} />
            {audioFile && (
              <Button type="button" onClick={handleNextStep}>
                Create Transcript
              </Button>
            )}
          </>
        )}
        {/* Step 2: Transcript */}
        {step === 1 && (
          <>
            {isProcessing ? (
              <div className="flex flex-col items-center w-full gap-4">
                <div className="w-16 h-16 border-4 border-[#E2E8F0] border-t-[#4F7EF7] rounded-full animate-spin mb-4" />
                <div className="text-lg font-semibold text-[#334155] text-center">
                  Processing your audio file and generating transcript...
                </div>
                <div className="w-full flex flex-col gap-1 mt-4">
                  <div className="text-sm text-[#64748B]">
                    File: <span className="font-medium text-[#1E293B]">{audioFile?.name}</span>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleBack}
                  className="mt-6 w-auto px-8 bg-white text-[#4F7EF7] border border-[#E2E8F0] shadow-none hover:bg-[#F8FAFF] hover:border-[#4F7EF7]"
                >
                  Previous Step
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center w-full gap-4">
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-r from-[#4F7EF7] to-[#6B92F9] shadow">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="text-xl font-bold text-[#1E293B] text-center">Transcript Ready!</div>
                <div className="w-full flex flex-col gap-1 mt-2">
                  <div className="text-sm text-[#64748B]">
                    File: <span className="font-medium text-[#1E293B]">{audioFile?.name}</span>
                  </div>
                </div>
                <textarea
                  className="w-full rounded-lg border border-[#E2E8F0] p-4 text-base text-[#334155] placeholder-[#94A3B8] focus:border-[#4F7EF7] focus:outline-none focus:ring-2 focus:ring-[#4F7EF7]/20 transition min-h-[120px]"
                  value={transcript}
                  onChange={handleTranscriptChange}
                />
                <div className="flex w-full gap-4 mt-4">
                  <Button
                    type="button"
                    onClick={handleBack}
                    className="w-1/2 bg-white text-[#4F7EF7] border border-[#E2E8F0] shadow-none hover:bg-[#F8FAFF] hover:border-[#4F7EF7]"
                  >
                    Previous Step
                  </Button>
                  <Button type="button" onClick={handleNextStep} disabled={!transcript} className="w-1/2">
                    Next Step
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
        {/* Step 3: AI Summary */}
        {step === 2 && (
          <>
            <div className="flex flex-col items-center w-full gap-4">
              <div className="w-full flex flex-col gap-2">
                <label className="font-semibold text-[#1E293B] text-base mb-1" htmlFor="system-prompt">
                  System Prompt
                </label>
                <textarea
                  id="system-prompt"
                  value={prompt}
                  onChange={handlePromptChange}
                  rows={3}
                  className="w-full rounded-lg border border-[#E2E8F0] p-3 text-base text-[#334155] placeholder-[#94A3B8] focus:border-[#4F7EF7] focus:outline-none focus:ring-2 focus:ring-[#4F7EF7]/20 transition"
                  placeholder="Describe what you want the AI to summarize..."
                  disabled={!!summary || isSummaryStreaming}
                />
              </div>
              <div className="flex w-full gap-4 mt-4">
                <Button
                  type="button"
                  onClick={handleBack}
                  disabled={isSummaryStreaming}
                  className="w-1/2 bg-white text-[#4F7EF7] border border-[#E2E8F0] shadow-none hover:bg-[#F8FAFF] hover:border-[#4F7EF7]"
                >
                  Previous Step
                </Button>
                <Button
                  type="button"
                  onClick={handleNextStep}
                  disabled={!prompt || isSummaryStreaming || !!summary}
                  className="w-1/2"
                >
                  Generate Summary
                </Button>
              </div>
              {isSummaryStreaming && (
                <div className="flex flex-col items-center w-full gap-4 mt-4">
                  <div className="w-16 h-16 border-4 border-[#E2E8F0] border-t-[#4F7EF7] rounded-full animate-spin mb-4" />
                  <div className="text-lg font-semibold text-[#334155] text-center">
                    Generating summary...
                  </div>
                </div>
              )}
              {summary && (
                <div className="w-full bg-[#F8FAFF] border border-[#E2E8F0] rounded-lg p-4 mt-4 text-[#334155] text-base prose prose-slate max-w-none">
                  <ReactMarkdown>{summary}</ReactMarkdown>
                </div>
              )}
            </div>
          </>
        )}
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image aria-hidden src="/file.svg" alt="File icon" width={16} height={16} />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image aria-hidden src="/window.svg" alt="Window icon" width={16} height={16} />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image aria-hidden src="/globe.svg" alt="Globe icon" width={16} height={16} />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
