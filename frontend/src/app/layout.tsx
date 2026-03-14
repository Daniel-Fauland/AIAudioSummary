import type { Metadata } from "next";
import { Sora, Instrument_Serif, Fira_Code } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionWrapper } from "@/components/auth/SessionWrapper";
import { ThemeProvider } from "next-themes";
import { GlobalProviders } from "@/components/global/GlobalProviders";
import "./globals.css";

const sora = Sora({
  variable: "--font-sans",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  weight: "400",
  subsets: ["latin"],
});

const firaCode = Fira_Code({
  variable: "--font-mono",
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${sora.variable} ${instrumentSerif.variable} ${firaCode.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey="aias:v1:theme"
        >
          <SessionWrapper>
            <TooltipProvider delayDuration={100}>
              <GlobalProviders>
                {children}
              </GlobalProviders>
              <Toaster position="top-right" offset="72px" duration={5000} />
            </TooltipProvider>
          </SessionWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
