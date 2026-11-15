"use client";

import { useAfterSave } from "@/components/internal/clients/use-after-save";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { saveEngagement } from "@/app/internal/(dashboard)/clients/actions";
import {
  CADENCES,
  ENGAGEMENT_STATUSES,
  ENGAGEMENT_TYPES,
  NO_SECRETS_HINT,
  personName,
  type Cadence,
  type Engagement,
  type EngagementStatus,
  type EngagementType,
} from "@/lib/internal/clients/schema";
import { useToast } from "@/components/internal/toast";
import { DateField, SuggestInput } from "@/components/internal/pickers";
import { Select } from "@/components/internal/select";
import { inputClass, textareaClass } from "@/components/internal/ui";
import {
  FormDialog,
  FormField,
  FormSection,
  useDialogOpen,
} from "@/components/internal/clients/client-dialog-shell";

/**
 * Add or edit an engagement (the unit of monthly scope): name, type,
 * status, account owner, dates, cadence, and the client tracker and
 * contract links. Managers only; saveEngagement checks again.
 */

type Values = {
  name: string;
  type: EngagementType;
  status: EngagementStatus;
  owner: string;
  starts_on: string;
  ends_on: string;
  cadence: Cadence;
  client_tracker_url: string;
  contract_url: string;
  notes: string;
};

function startValues(engagement: Engagement | undefined, me: string): Values {
  return {
    name: engagement?.name ?? "",
    type: engagement?.type ?? "devrel_retainer",
    status: engagement?.status ?? "active",
    owner: engagement ? (engagement.owner ?? "") : me,
    starts_on: engagement?.starts_on ?? "",
    ends_on: engagement?.ends_on ?? "",
    cadence: engagement?.cadence ?? "monthly",
    client_tracker_url: engagement?.client_tracker_url ?? "",
    contract_url: engagement?.contract_url ?? "",
    notes: engagement?.notes ?? "",
  };
}

export function EngagementDialog({
  engagement,
  clientId,
  workspacePath,
  owners = [],
  names = {},
  me = "",
  trigger,
}: {
  /** The engagement to edit; leave out to add one. */
  engagement?: Engagement;
  /** Adding: the client it belongs to. */
  clientId: string;
  /** The client's workspace; a new engagement opens there, selected. */
  workspacePath: string;
  /** Emails for the account owner suggestions (ownerChoices()). */
  owners?: readonly string[];
  names?: Readonly<Record<string, string>>;
  /** The viewer's email: a new engagement's owner unless changed. */
  me?: string;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const afterSave = useAfterSave();
  const toast = useToast();
  const [values, setValues] = useState<Values>(() =>
    startValues(engagement, me),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, startSaving] = useTransition();
  const [open, setOpen] = useDialogOpen(() => {
    setValues(startValues(engagement, me));
    setError(null);
  });
  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((current) => ({ ...current, [key]: value }));
  const people = owners.map((email) => ({
    value: email,
    label: personName(email, names),
  }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    startSaving(async () => {
      const result = await saveEngagement(engagement?.id ?? null, {
        ...values,
        ...(engagement ? {} : { client_id: clientId }),
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast("success", result.message ?? "Saved");
      setOpen(false);
      if (!engagement && result.id)
        router.push(`${workspacePath}?engagement=${result.id}`);
      else afterSave();
    });
  };

  const text = (
    key: "name" | "client_tracker_url" | "contract_url",
    placeholder: string,
    url = false,
  ) => (
    <input
      id={`engagement-${key}`}
      type={url ? "url" : "text"}
      inputMode={url ? "url" : undefined}
      required={key === "name"}
      maxLength={url ? 1000 : 120}
      value={values[key]}
      onChange={(event) => set(key, event.target.value)}
      placeholder={placeholder}
      className={inputClass()}
    />
  );

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={engagement ? "Edit engagement" : "New engagement"}
      description="Fill in the engagement's details and save."
      onSubmit={submit}
      busy={busy}
      error={error}
      submitLabel={engagement ? "Save" : "Add engagement"}
    >
      <FormField id="engagement-name" label="Name" required wide>
        {text("name", "Token Factory content")}
      </FormField>
      <FormField
        id="engagement-type"
        label="Type"
        required
        help="Sets the monthly scope a new month starts with."
      >
        <Select
          id="engagement-type"
          value={values.type}
          onChange={(next) => set("type", next)}
          options={ENGAGEMENT_TYPES}
        />
      </FormField>
      <FormField id="engagement-status" label="Status">
        <Select
          id="engagement-status"
          value={values.status}
          onChange={(next) => set("status", next)}
          options={ENGAGEMENT_STATUSES}
        />
      </FormField>
      <FormField
        id="engagement-owner"
        label="Account owner"
        help="Chases the client's approvals."
      >
        <SuggestInput
          id="engagement-owner"
          type="text"
          value={values.owner}
          onChange={(next) => set("owner", next)}
          options={people}
          placeholder="name@studio1hq.com"
        />
      </FormField>
      <FormField id="engagement-cadence" label="Cadence">
        <Select
          id="engagement-cadence"
          value={values.cadence}
          onChange={(next) => set("cadence", next)}
          options={CADENCES}
        />
      </FormField>
      <FormField id="engagement-starts_on" label="Start date">
        <DateField
          id="engagement-starts_on"
          value={values.starts_on}
          onChange={(next) => set("starts_on", next)}
        />
      </FormField>
      <FormField id="engagement-ends_on" label="End date">
        <DateField
          id="engagement-ends_on"
          value={values.ends_on}
          onChange={(next) => set("ends_on", next)}
          min={values.starts_on || undefined}
        />
      </FormField>
      <FormSection title="Links" hint={NO_SECRETS_HINT} />
      <FormField
        id="engagement-client_tracker_url"
        label="Client tracker"
        help="Their Notion or sheet, if they keep one."
      >
        {text("client_tracker_url", "https://", true)}
      </FormField>
      <FormField id="engagement-contract_url" label="Contract">
        {text("contract_url", "https://", true)}
      </FormField>
      <FormField id="engagement-notes" label="Notes" wide>
        <textarea
          id="engagement-notes"
          rows={3}
          maxLength={5000}
          value={values.notes}
          onChange={(event) => set("notes", event.target.value)}
          className={textareaClass}
        />
      </FormField>
    </FormDialog>
  );
}
