import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SessionWrapper } from "@/components/auth/SessionWrapper";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Audio Summary",
  description:
    "Upload audio files, generate transcripts, and create AI-powered summaries",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <SessionWrapper>
          {children}
          <Toaster position="bottom-right" />
        </SessionWrapper>
      </body>
    </html>
  );
}
