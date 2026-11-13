"use client";

import { Printer } from "@phosphor-icons/react";
import { buttonClass } from "@/components/internal/ui";

/** Opens the browser's print dialog, where "Save as PDF" makes the file. */
export function PrintButton({ label = "Save as PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass("primary", "sm")}>
      <Printer size={13} /> {label}
    </button>
  );
}
