"use client";

import Link from "next/link";
import Script from "next/script";
import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import {
  CONSENT_CHANGE_EVENT,
  CONSENT_STORAGE_KEY,
  gaInitScript,
  needsConsentBanner,
  readConsent,
  type ConsentChoice,
} from "@/lib/analytics";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** Set in next.config.ts for production builds only; empty elsewhere. */
const GA_ID = process.env.GA_MEASUREMENT_ID ?? "";

// The banner's state lives outside React: the saved choice (localStorage),
// the browser's time zone, and two flags for this page view.
let reopened = false; // "Cookie settings" was clicked
let chosenNow: ConsentChoice | null = null; // a choice when storage is blocked

function subscribe(onChange: () => void) {
  window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function bannerOpen() {
  if (reopened) return true;
  if (chosenNow) return false;
  try {
    if (readConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY)))
      return false;
  } catch {
    // Storage blocked: ask, and remember the answer for this page view.
  }
  return needsConsentBanner(Intl.DateTimeFormat().resolvedOptions().timeZone);
}

function choose(choice: ConsentChoice) {
  chosenNow = choice;
  reopened = false;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    // Not saved; GA still gets this page view's choice below.
  }
  window.gtag?.("consent", "update", { analytics_storage: choice });
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
}

/** Show the consent banner again (footer "Cookie settings"). */
export function openCookieSettings() {
  reopened = true;
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
}

/**
 * Google Analytics plus, for visitors in the EEA, the UK and Switzerland, a
 * small Accept/Decline bar. Renders nothing outside production builds.
 */
export function Analytics() {
  if (!GA_ID) return null;
  return (
    <>
      <Script id="ga-init" strategy="afterInteractive">
        {gaInitScript(GA_ID)}
      </Script>
      <ConsentBanner />
    </>
  );
}

function ConsentBanner() {
  const t = useTranslations("CookieBanner");
  const open = useSyncExternalStore(subscribe, bannerOpen, () => false);
  if (!open) return null;
  return (
    <section
      aria-label={t("label")}
      className="fixed inset-x-4 bottom-4 z-[500] mx-auto flex max-w-xl flex-col gap-3 rounded-[8px] bg-[#fbf8f3] p-4 text-[#141414] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.35)] ring-1 ring-[#141414]/10 sm:flex-row sm:items-center sm:gap-4"
    >
      <p className="text-[13.5px] leading-snug">
        {t("text")}{" "}
        <Link
          href="/privacy"
          className="underline underline-offset-2 hover:text-[#f97316]"
        >
          {t("privacy")}
        </Link>
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => choose("denied")}
          className="h-9 flex-1 rounded-[6px] px-4 text-[13.5px] font-medium ring-1 ring-[#141414]/20 transition-colors hover:bg-[#141414]/5 sm:flex-none"
        >
          {t("decline")}
        </button>
        <button
          type="button"
          onClick={() => choose("granted")}
          className="h-9 flex-1 rounded-[6px] bg-[#141414] px-4 text-[13.5px] font-medium text-white transition-colors hover:bg-[#f97316] sm:flex-none"
        >
          {t("accept")}
        </button>
      </div>
    </section>
  );
}

/** Footer link that reopens the banner, so a choice can be changed later. */
export function CookieSettingsButton({ className }: { className?: string }) {
  const t = useTranslations("Footer");
  if (!GA_ID) return null;
  return (
    <button type="button" onClick={openCookieSettings} className={className}>
      {t("legal.cookies")}
    </button>
  );
}
