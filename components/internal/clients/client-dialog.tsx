"use client";

import { useAfterSave } from "@/components/internal/clients/use-after-save";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Archive, ArrowCounterClockwise } from "@/components/internal/icons";
import {
  archiveClient,
  saveClient,
} from "@/app/internal/(dashboard)/clients/actions";
import {
  CLIENT_STATUSES,
  NO_SECRETS_HINT,
  clientPath,
  type ClientAccount,
  type ClientStatus,
} from "@/lib/internal/clients/schema";
import { useToast } from "@/components/internal/toast";
import { DateField } from "@/components/internal/pickers";
import { Select } from "@/components/internal/select";
import {
  buttonClass,
  inputClass,
  textareaClass,
} from "@/components/internal/ui";
import {
  FormDialog,
  FormField,
  FormSection,
  useDialogOpen,
} from "@/components/internal/clients/client-dialog-shell";

/**
 * Add or edit a client: name, status, primary contact, Slack channel,
 * website, start date and notes. Managers only (the page hides it from
 * members; saveClient checks again).
 */

type Values = {
  name: string;
  slug: string;
  status: ClientStatus;
  contact_name: string;
  contact_email: string;
  slack_channel_id: string;
  website: string;
  started_on: string;
  notes: string;
};

function startValues(client?: ClientAccount): Values {
  return {
    name: client?.name ?? "",
    slug: client?.slug ?? "",
    status: client?.status ?? "prospect",
    contact_name: client?.contact_name ?? "",
    contact_email: client?.contact_email ?? "",
    slack_channel_id: client?.slack_channel_id ?? "",
    website: client?.website ?? "",
    started_on: client?.started_on ?? "",
    notes: client?.notes ?? "",
  };
}

export function ClientDialog({
  client,
  trigger,
}: {
  /** The client to edit; leave out to add one. */
  client?: ClientAccount;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const afterSave = useAfterSave();
  const toast = useToast();
  const [values, setValues] = useState<Values>(() => startValues(client));
  const [error, setError] = useState<string | null>(null);
  const [busy, startSaving] = useTransition();
  const [open, setOpen] = useDialogOpen(() => {
    setValues(startValues(client));
    setError(null);
  });
  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    startSaving(async () => {
      const payload: Record<string, unknown> = { ...values };
      // A new client's short name comes from its name unless one is typed.
      if (!client && !values.slug.trim()) delete payload.slug;
      const result = await saveClient(client?.id ?? null, payload);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast("success", result.message ?? "Saved");
      setOpen(false);
      const slug = values.slug.trim().toLowerCase();
      if (client && slug && slug !== client.slug)
        router.replace(clientPath(slug));
      else if (!client && result.slug) router.push(clientPath(result.slug));
      else afterSave();
    });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={client ? "Edit client" : "New client"}
      description="Fill in the client's details and save."
      onSubmit={submit}
      busy={busy}
      error={error}
      submitLabel={client ? "Save" : "Add client"}
    >
      <FormField id="client-name" label="Name" required>
        <input
          id="client-name"
          type="text"
          required
          maxLength={120}
          value={values.name}
          onChange={(event) => set("name", event.target.value)}
          placeholder="Acme AI"
          className={inputClass()}
        />
      </FormField>
      <FormField id="client-status" label="Status">
        <Select
          id="client-status"
          value={values.status}
          onChange={(next) => set("status", next)}
          options={CLIENT_STATUSES}
        />
      </FormField>
      <FormField
        id="client-slug"
        label="Short name for the link"
        help={
          client
            ? "Changing it changes this page's address."
            : "Leave blank to make one from the name."
        }
      >
        <input
          id="client-slug"
          type="text"
          maxLength={80}
          value={values.slug}
          onChange={(event) => set("slug", event.target.value)}
          placeholder="acme-ai"
          className={inputClass()}
        />
      </FormField>
      <FormField id="client-started_on" label="Start date">
        <DateField
          id="client-started_on"
          value={values.started_on}
          onChange={(next) => set("started_on", next)}
        />
      </FormField>
      <FormField id="client-contact_name" label="Primary contact">
        <input
          id="client-contact_name"
          type="text"
          maxLength={120}
          value={values.contact_name}
          onChange={(event) => set("contact_name", event.target.value)}
          placeholder="Who we talk to"
          className={inputClass()}
        />
      </FormField>
      <FormField id="client-contact_email" label="Contact email">
        <input
          id="client-contact_email"
          type="email"
          inputMode="email"
          maxLength={200}
          value={values.contact_email}
          onChange={(event) => set("contact_email", event.target.value)}
          className={inputClass()}
        />
      </FormField>
      <FormField
        id="client-slack_channel_id"
        label="Slack channel"
        help="The shared channel's name or id, e.g. #acme-studio1."
      >
        <input
          id="client-slack_channel_id"
          type="text"
          maxLength={80}
          value={values.slack_channel_id}
          onChange={(event) => set("slack_channel_id", event.target.value)}
          className={inputClass()}
        />
      </FormField>
      <FormSection title="Links" hint={NO_SECRETS_HINT} />
      <FormField id="client-website" label="Website" wide>
        <input
          id="client-website"
          type="url"
          inputMode="url"
          maxLength={1000}
          value={values.website}
          onChange={(event) => set("website", event.target.value)}
          placeholder="https://"
          className={inputClass()}
        />
      </FormField>
      <FormField
        id="client-notes"
        label="Notes"
        wide
        help="Plain text. No passwords or keys."
      >
        <textarea
          id="client-notes"
          rows={4}
          maxLength={5000}
          value={values.notes}
          onChange={(event) => set("notes", event.target.value)}
          placeholder="How we work with them, who signs off, anything to remember."
          className={textareaClass}
        />
      </FormField>
    </FormDialog>
  );
}

/**
 * Archive a client (hidden from the lists; their work stays for past
 * reports), or bring one back. Archiving asks for a second click.
 */
export function ClientArchiveButton({
  clientId,
  archived,
}: {
  clientId: string;
  archived: boolean;
}) {
  const afterSave = useAfterSave();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const click = () => {
    if (!archived && !confirm) {
      setConfirm(true);
      timer.current = setTimeout(() => setConfirm(false), 5000);
      return;
    }
    start(async () => {
      const result = await archiveClient(clientId, !archived);
      setConfirm(false);
      if (!result.ok) {
        toast("error", result.message);
        return;
      }
      toast("success", result.message ?? "Saved");
      afterSave();
    });
  };

  return (
    <button
      type="button"
      onClick={click}
      disabled={busy}
      className={buttonClass(confirm ? "danger" : "secondary")}
    >
      {archived ? <ArrowCounterClockwise size={14} /> : <Archive size={14} />}
      {archived ? "Bring back" : confirm ? "Click again to archive" : "Archive"}
    </button>
  );
}
