"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { addLead as addLeadAction } from "@/app/internal/(dashboard)/inbound/actions";
import { inputClass, textareaClass } from "@/components/internal/ui";
import { Select } from "@/components/internal/select";
import {
  FormDialog,
  LabelledField,
} from "@/components/internal/inbound/form-dialog";

const EMPTY = {
  name: "",
  website: "",
  source: "inbound_call",
  contactName: "",
  contactEmail: "",
  message: "",
  startAgent: false,
};

/** Adds a lead by hand and opens its page. */
export function AddLeadDialog({ trigger }: { trigger: ReactNode }) {
  const router = useRouter();
  const [values, setValues] = useState(EMPTY);
  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  return (
    <FormDialog
      trigger={trigger}
      title="Add a lead"
      description="Someone who got in touch outside the booking page or the leads mailbox. A website that already belongs to a company in Inbound, Outreach or Clients is refused."
      submitLabel="Add lead"
      disabled={!values.name.trim()}
      onOpen={() => setValues(EMPTY)}
      submit={() => addLeadAction(values)}
      onSaved={(result) => {
        if (result.id) router.push(`/inbound/${result.id}`);
      }}
    >
      <div className="grid gap-3.5 sm:grid-cols-2">
        <LabelledField label="Company name">
          <input
            value={values.name}
            onChange={(event) => set("name", event.target.value)}
            maxLength={140}
            required
            autoComplete="off"
            className={inputClass()}
          />
        </LabelledField>
        <LabelledField label="Website">
          <input
            value={values.website}
            onChange={(event) => set("website", event.target.value)}
            maxLength={300}
            inputMode="url"
            autoComplete="off"
            placeholder="example.com"
            className={inputClass()}
          />
        </LabelledField>
        <LabelledField label="How they reached us">
          <Select
            value={values.source}
            onChange={(next) => set("source", next)}
            aria-label="How they reached us"
            options={[
              { value: "inbound_call", label: "Call" },
              { value: "inbound_email", label: "Mail" },
            ]}
          />
        </LabelledField>
        <LabelledField label="Contact name">
          <input
            value={values.contactName}
            onChange={(event) => set("contactName", event.target.value)}
            maxLength={120}
            autoComplete="off"
            className={inputClass()}
          />
        </LabelledField>
        <div className="sm:col-span-2">
          <LabelledField label="Contact email">
            <input
              type="email"
              value={values.contactEmail}
              onChange={(event) => set("contactEmail", event.target.value)}
              maxLength={254}
              autoComplete="off"
              className={inputClass()}
            />
          </LabelledField>
        </div>
        <div className="sm:col-span-2">
          <LabelledField label="What they asked for">
            <textarea
              value={values.message}
              onChange={(event) => set("message", event.target.value)}
              rows={4}
              maxLength={2000}
              className={textareaClass}
            />
          </LabelledField>
        </div>
      </div>
      <label className="flex items-center gap-2 text-[13px]">
        <input
          type="checkbox"
          checked={values.startAgent}
          onChange={(event) => set("startAgent", event.target.checked)}
          className="size-4 accent-[var(--i-accent)]"
        />
        Start the agent now
      </label>
    </FormDialog>
  );
}
