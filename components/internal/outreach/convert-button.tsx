"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react";
import { convertToClient } from "@/app/internal/(dashboard)/outreach/actions";
import { useToast } from "@/components/internal/toast";
import { buttonClass } from "@/components/internal/ui";

/**
 * Turns a won organisation into a client and opens its page. Two clicks:
 * it adds a row to Clients, which isn't undone from here.
 */
export function ConvertButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const toast = useToast();
  const [sure, setSure] = useState(false);
  const [busy, startTransition] = useTransition();

  const click = () => {
    if (!sure) {
      setSure(true);
      setTimeout(() => setSure(false), 5000);
      return;
    }
    startTransition(async () => {
      const result = await convertToClient(id);
      if (!result.ok) {
        toast("error", result.message);
        setSure(false);
        return;
      }
      if (result.warning) toast("error", result.warning);
      else toast("success", result.message ?? `${name} is now a client`);
      if (result.slug) router.push(`/clients/${result.slug}`);
      else router.refresh();
    });
  };

  return (
    <button type="button" onClick={click} disabled={busy} className={buttonClass("accent")}>
      {busy ? "Adding…" : sure ? "Click again to add the client" : "Make it a client"}
      {busy || sure ? null : <ArrowRight size={14} />}
    </button>
  );
}
