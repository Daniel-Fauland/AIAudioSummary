"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

type FooterModal = "imprint" | "privacy" | "cookies" | null;

const OWNER_NAME = process.env.NEXT_PUBLIC_OWNER_NAME ?? "";
const OWNER_STREET = process.env.NEXT_PUBLIC_OWNER_STREET ?? "";
const OWNER_CITY = process.env.NEXT_PUBLIC_OWNER_CITY ?? "";
const OWNER_COUNTRY = process.env.NEXT_PUBLIC_OWNER_COUNTRY ?? "";
const OWNER_EMAIL = process.env.NEXT_PUBLIC_OWNER_EMAIL ?? "";
const OWNER_PHONE = process.env.NEXT_PUBLIC_OWNER_PHONE ?? "";

interface ModalConfig {
  title: string;
  maxWidth: string;
  content: React.ReactNode;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <div className="space-y-2 text-muted-foreground">{children}</div>
    </section>
  );
}

const imprintContent = (
  <div className="space-y-5 text-sm">
    <Section title="Service Operator">
      <p>
        {OWNER_NAME}
        <br />
        {OWNER_STREET}
        <br />
        {OWNER_CITY}
        <br />
        {OWNER_COUNTRY}
      </p>
    </Section>
    <Section title="Contact">
      <p>
        Email:{" "}
        <a
          href={`mailto:${OWNER_EMAIL}`}
          className="text-primary hover:underline"
        >
          {OWNER_EMAIL}
        </a>
      </p>
      {OWNER_PHONE && <p>Phone: {OWNER_PHONE}</p>}
    </Section>
    <Section title="Responsible for Content">
      <p>
        Responsible for content per § 18 para. 2 MStV:
        <br />
        {OWNER_NAME} (address as above)
      </p>
    </Section>
    <Section title="Disclaimer">
      <p>
        This service is provided as a private, non-commercial tool. Despite
        careful content control, we accept no liability for the content of
        external links. The operators of linked pages are solely responsible for
        their content.
      </p>
    </Section>
  </div>
);

const privacyContent = (
  <div className="space-y-6 text-sm">
    <p className="text-muted-foreground text-xs">
      Last updated: 22 February 2026
    </p>

    <Section title="1. Controller">
      <p>
        The controller responsible for data processing on this website is:
        <br />
        <br />
        {OWNER_NAME}
        <br />
        {OWNER_STREET}, {OWNER_CITY}, {OWNER_COUNTRY}
        <br />
        Email:{" "}
        <a
          href={`mailto:${OWNER_EMAIL}`}
          className="text-primary hover:underline"
        >
          {OWNER_EMAIL}
        </a>
        {OWNER_PHONE && (
          <>
            <br />
            Phone: {OWNER_PHONE}
          </>
        )}
      </p>
    </Section>

    <Section title="2. What Data We Process">
      <div className="space-y-4">
        <div>
          <p className="font-medium text-foreground mb-1">
            a) Google Account Data (Authentication)
          </p>
          <p>
            When you sign in with Google, we receive your name, email address,
            and profile picture. This data is used solely to authenticate you
            and control access to the service. Legal basis: Art. 6(1)(b) GDPR —
            performance of contract.
          </p>
        </div>
        <div>
          <p className="font-medium text-foreground mb-1">b) Audio Recordings</p>
          <p>
            Audio files you upload or record via microphone are transmitted to
            AssemblyAI for transcription and deleted from our servers immediately
            after processing. No audio is stored persistently. For real-time
            transcription, audio is streamed directly to AssemblyAI&apos;s EU
            endpoint. Legal basis: Art. 6(1)(b) GDPR.
          </p>
          <p className="mt-2 italic">
            Important: If your recordings contain the voices of other people
            (e.g., meeting participants), you are responsible for ensuring those
            individuals have consented to this processing before uploading or
            recording.
          </p>
        </div>
        <div>
          <p className="font-medium text-foreground mb-1">
            c) Transcript &amp; Summary Text
          </p>
          <p>
            Transcribed text is sent to your chosen AI provider (OpenAI,
            Anthropic, Google Gemini, or Azure OpenAI) using your own API key to
            generate summaries. Neither transcripts nor summaries are stored on
            our servers — they exist only in your browser session. Legal basis:
            Art. 6(1)(b) GDPR.
          </p>
        </div>
        <div>
          <p className="font-medium text-foreground mb-1">
            d) API Keys (Browser Storage Only)
          </p>
          <p>
            API keys are stored exclusively in your browser&apos;s localStorage.
            They are never transmitted to or stored on our servers — they are
            only sent directly to the respective external service when you
            initiate a request.
          </p>
        </div>
        <div>
          <p className="font-medium text-foreground mb-1">e) Server Logs</p>
          <p>
            Our servers log IP addresses, timestamps, and request paths for
            security and error diagnosis purposes. Legal basis: Art. 6(1)(f)
            GDPR — legitimate interest. Retention period: up to 30 days.
          </p>
        </div>
        <div>
          <p className="font-medium text-foreground mb-1">f) Session Data</p>
          <p>
            An encrypted session cookie keeps you signed in after
            authentication. It is deleted upon sign-out. Legal basis:
            Art. 6(1)(b) GDPR.
          </p>
        </div>
      </div>
    </Section>

    <Section title="3. Third-Party Services">
      <p>
        The following third-party providers process data in connection with this
        service:
      </p>
      <div className="mt-3 space-y-3">
        {[
          {
            name: "AssemblyAI Inc. (US)",
            desc: "Speech-to-text transcription. Data processing agreement in place. Real-time transcription uses an EU endpoint (streaming.eu.assemblyai.com). Covered by the EU-US Data Privacy Framework (DPF) and Standard Contractual Clauses (SCCs).",
          },
          {
            name: "Google LLC (US)",
            desc: "Authentication via Google OAuth. Covered by DPF and SCCs.",
          },
          {
            name: "OpenAI / Anthropic / Google Gemini / Azure OpenAI",
            desc: "AI summarization, used at your choice with your own API key. Data is processed under your account with each provider according to their respective terms.",
          },
          {
            name: "Hetzner Online GmbH (DE)",
            desc: "Application hosting. Server located in Nuremberg, Germany. Data processing agreement in place.",
          },
        ].map(({ name, desc }) => (
          <div key={name}>
            <span className="font-medium text-foreground">{name}:</span>{" "}
            <span>{desc}</span>
          </div>
        ))}
      </div>
    </Section>

    <Section title="4. Browser Storage (localStorage &amp; Cookies)">
      <p>
        This service uses only technically necessary browser storage. No
        tracking, analytics, or advertising cookies are used. Under § 25 TDDDG,
        no consent is required for strictly necessary storage. See Cookie
        Settings for details.
      </p>
    </Section>

    <Section title="5. Your Rights">
      <p>Under the GDPR, you have the right to:</p>
      <ul className="list-disc list-inside mt-2 space-y-1">
        <li>
          <span className="font-medium text-foreground">Access</span> (Art. 15)
          — request information about data we hold about you
        </li>
        <li>
          <span className="font-medium text-foreground">Rectification</span>{" "}
          (Art. 16) — have inaccurate data corrected
        </li>
        <li>
          <span className="font-medium text-foreground">Erasure</span> (Art.
          17) — request deletion of your data
        </li>
        <li>
          <span className="font-medium text-foreground">Restriction</span> (Art.
          18) — limit processing in certain circumstances
        </li>
        <li>
          <span className="font-medium text-foreground">Portability</span> (Art.
          20) — receive your data in a machine-readable format
        </li>
        <li>
          <span className="font-medium text-foreground">Objection</span> (Art.
          21) — object to processing based on legitimate interest
        </li>
      </ul>
      <p className="mt-2">
        To exercise any of these rights, contact:{" "}
        <a
          href={`mailto:${OWNER_EMAIL}`}
          className="text-primary hover:underline"
        >
          {OWNER_EMAIL}
        </a>
      </p>
    </Section>

    <Section title="6. Right to Lodge a Complaint">
      <p>
        You have the right to lodge a complaint with the competent supervisory
        authority:
      </p>
      <p className="mt-2">
        Der Landesbeauftragte für den Datenschutz und die Informationsfreiheit
        Baden-Württemberg (LfDI BW)
        <br />
        Königstraße 10a, 70173 Stuttgart
        <br />
        <a
          href="https://www.baden-wuerttemberg.datenschutz.de"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          www.baden-wuerttemberg.datenschutz.de
        </a>
      </p>
    </Section>
  </div>
);

const cookiesContent = (
  <div className="space-y-5 text-sm">
    <Section title="Overview">
      <p>
        This service uses only technically necessary browser storage. There are
        no tracking, analytics, or advertising cookies — no cookie consent
        banner is required.
      </p>
    </Section>
    <Section title="Session Cookie">
      <p>
        A single session cookie is set by Auth.js when you sign in with Google.
        It contains an encrypted token used to keep you authenticated and is
        automatically deleted when you sign out. This cookie is strictly
        necessary for the service to function.
      </p>
    </Section>
    <Section title="localStorage">
      <p>
        The following data is stored in your browser&apos;s localStorage — not
        on our servers:
      </p>
      <div className="mt-3 space-y-2">
        {[
          {
            key: "API keys",
            desc: "Your AssemblyAI and LLM provider API keys. Never sent to our servers; only transmitted directly to the respective external service when you make a request.",
          },
          {
            key: "Provider & model selection",
            desc: "Your preferred AI provider and model name.",
          },
          {
            key: "UI preferences",
            desc: "App mode, color theme, realtime summary interval, and feature-level model overrides.",
          },
        ].map(({ key, desc }) => (
          <div key={key}>
            <span className="font-medium text-foreground">{key}:</span>{" "}
            <span className="text-muted-foreground">{desc}</span>
          </div>
        ))}
      </div>
    </Section>
    <Section title="Clearing Your Data">
      <p>
        You can remove individual API keys via the Settings panel (gear icon).
        To clear all stored preferences, open your browser&apos;s developer
        tools → Application → Local Storage and delete entries prefixed with{" "}
        <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
          aias:v1:
        </code>
        .
      </p>
    </Section>
    <Section title="Legal Basis">
      <p>
        All storage described here is strictly necessary for the core
        functionality of the service. No consent is required under § 25 TDDDG
        (German implementation of the ePrivacy Directive).
      </p>
    </Section>
  </div>
);

const MODAL_CONFIG: Record<NonNullable<FooterModal>, ModalConfig> = {
  imprint: {
    title: "Imprint",
    maxWidth: "sm:max-w-md",
    content: imprintContent,
  },
  privacy: {
    title: "Privacy Policy",
    maxWidth: "sm:max-w-2xl",
    content: privacyContent,
  },
  cookies: {
    title: "Cookie Settings",
    maxWidth: "sm:max-w-lg",
    content: cookiesContent,
  },
};

export function Footer() {
  const [openModal, setOpenModal] = useState<FooterModal>(null);

  const config = openModal ? MODAL_CONFIG[openModal] : null;

  return (
    <>
      <footer className="w-full py-6 flex items-center justify-center gap-2 text-xs text-foreground-muted">
        <button
          type="button"
          className="cursor-pointer hover:text-foreground-secondary transition-colors"
          onClick={() => setOpenModal("imprint")}
        >
          Imprint
        </button>
        <span aria-hidden="true">·</span>
        <button
          type="button"
          className="cursor-pointer hover:text-foreground-secondary transition-colors"
          onClick={() => setOpenModal("privacy")}
        >
          Privacy Policy
        </button>
        <span aria-hidden="true">·</span>
        <button
          type="button"
          className="cursor-pointer hover:text-foreground-secondary transition-colors"
          onClick={() => setOpenModal("cookies")}
        >
          Cookie Settings
        </button>
      </footer>

      <Dialog
        open={openModal !== null}
        onOpenChange={(open) => {
          if (!open) setOpenModal(null);
        }}
      >
        {config && (
          <DialogContent className={`${config.maxWidth} bg-card`}>
            <DialogHeader>
              <DialogTitle>{config.title}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[65vh] pr-4">
              {config.content}
            </ScrollArea>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
