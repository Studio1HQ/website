"use client";

import { useOptimistic, useState, useTransition, type ReactNode } from "react";
import {
  approveFile as approveFileAction,
  askAgent as askAgentAction,
  retryEvent as retryEventAction,
} from "@/app/internal/(dashboard)/inbound/actions";
import { ArrowClockwise } from "@/components/internal/icons";
import { guarded } from "@/components/internal/guarded";
import {
  FormDialog,
  LabelledField,
} from "@/components/internal/inbound/form-dialog";
import { useToast } from "@/components/internal/toast";
import {
  buttonClass,
  inputClass,
  textareaClass,
} from "@/components/internal/ui";
import { queueableEvents } from "@/lib/internal/inbound/rules";
import type { EventKind } from "@/lib/internal/inbound/schema";

const askAgent = guarded(askAgentAction);
const retryEvent = guarded(retryEventAction);
const approveFile = guarded(approveFileAction);

type Variant = "secondary" | "ghost" | "danger" | "accent";

type Action = {
  kind: EventKind;
  label: string;
  title: string;
  description: string;
  submitLabel: string;
  variant: Variant;
  /** The one field this asks for, if any. */
  field?: {
    key: "notes" | "answers" | "reason";
    label: string;
    hint?: string;
    multiline: boolean;
  };
  founderOnly?: boolean;
};

const ACTIONS: Action[] = [
  {
    kind: "call_notes_added",
    label: "Add call notes",
    title: "Add call notes",
    description:
      "What was said on the call. The agent reads them and updates its brief and next steps.",
    submitLabel: "Send to the agent",
    variant: "secondary",
    field: { key: "notes", label: "Call notes", multiline: true },
  },
  {
    kind: "founder_answers",
    label: "Answer the agent",
    title: "Answer the agent",
    description:
      "Prices, scope and anything else the agent is waiting on. Only the founders see this form.",
    submitLabel: "Send answers",
    variant: "accent",
    field: {
      key: "answers",
      label: "Your answers",
      hint: "Write them as you would tell a colleague.",
      multiline: true,
    },
    founderOnly: true,
  },
  {
    kind: "lead_created",
    label: "Run research again",
    title: "Run the research again",
    description:
      "The agent looks into this company again and rebuilds its brief. This replaces nothing: earlier files stay as older versions.",
    submitLabel: "Run it again",
    variant: "secondary",
  },
  {
    kind: "proposal_sent",
    label: "Mark proposal sent",
    title: "Mark the proposal as sent",
    description:
      "Use this once the proposal has gone to them. The lead moves to Proposal. Nothing is sent from here.",
    submitLabel: "Yes, it was sent",
    variant: "secondary",
  },
  {
    kind: "won",
    label: "Mark won",
    title: "Mark this lead as won",
    description:
      "They said yes. The lead moves to Won and can't be changed from here afterwards. Are you sure?",
    submitLabel: "Yes, mark it won",
    variant: "secondary",
  },
  {
    kind: "lost",
    label: "Mark lost",
    title: "Mark this lead as lost",
    description:
      "They said no, or went quiet. The lead moves to Lost and can't be changed from here afterwards. Are you sure?",
    submitLabel: "Yes, mark it lost",
    variant: "danger",
    field: {
      key: "reason",
      label: "Why was it lost?",
      hint: "A few words is enough.",
      multiline: false,
    },
  },
];

function ActionDialog({
  orgId,
  action,
  trigger,
}: {
  orgId: string;
  action: Action;
  trigger: ReactNode;
}) {
  const [value, setValue] = useState("");
  const { field } = action;
  return (
    <FormDialog
      trigger={trigger}
      title={action.title}
      description={action.description}
      submitLabel={action.submitLabel}
      disabled={Boolean(field) && !value.trim()}
      onOpen={() => setValue("")}
      submit={() =>
        askAgent(orgId, action.kind, field ? { [field.key]: value } : {})
      }
    >
      {field ? (
        <LabelledField label={field.label} hint={field.hint}>
          {field.multiline ? (
            <textarea
              value={value}
              onChange={(event) => setValue(event.target.value)}
              rows={8}
              maxLength={10_000}
              required
              className={textareaClass}
            />
          ) : (
            <input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              maxLength={500}
              required
              autoComplete="off"
              className={inputClass()}
            />
          )}
        </LabelledField>
      ) : null}
    </FormDialog>
  );
}

/** The buttons that ask the agent for something, only those this stage allows. */
export function LeadActions({
  orgId,
  stage,
  isFounder,
  onlyAnswer = false,
}: {
  orgId: string;
  stage: string;
  isFounder: boolean;
  /** Just the "Answer the agent" button (it sits in the Next panel too). */
  onlyAnswer?: boolean;
}) {
  const allowed = queueableEvents(stage);
  const shown = ACTIONS.filter(
    (action) =>
      allowed.includes(action.kind) &&
      (!action.founderOnly || isFounder) &&
      (!onlyAnswer || action.kind === "founder_answers"),
  );
  if (!shown.length) return null;
  return (
    <>
      {shown.map((action) => (
        <ActionDialog
          key={action.kind}
          orgId={orgId}
          action={action}
          trigger={
            <button type="button" className={buttonClass(action.variant, "sm")}>
              {action.label}
            </button>
          }
        />
      ))}
    </>
  );
}

export function RetryButton({
  orgId,
  eventId,
}: {
  orgId: string;
  eventId: string;
}) {
  const toast = useToast();
  const [busy, start] = useTransition();
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() =>
        start(async () => {
          const result = await retryEvent(orgId, eventId);
          if (result.ok) toast("success", result.message ?? "Queued again");
          else toast("error", result.message);
        })
      }
      className={buttonClass("secondary", "sm")}
    >
      <ArrowClockwise size={13} />
      {busy ? "Queuing…" : "Try again"}
    </button>
  );
}

/** A founder's "Approved to send" tick for one file. */
export function ApproveTick({
  fileId,
  approved,
}: {
  fileId: string;
  approved: boolean;
}) {
  const toast = useToast();
  const [busy, start] = useTransition();
  const [shown, setShown] = useOptimistic(approved);
  return (
    <label className="inline-flex shrink-0 items-center gap-1.5 text-[12.5px] text-[var(--i-muted)]">
      <input
        type="checkbox"
        checked={shown}
        disabled={busy}
        onChange={(event) => {
          const next = event.target.checked;
          start(async () => {
            setShown(next);
            const result = await approveFile(fileId, next);
            if (!result.ok) toast("error", result.message);
          });
        }}
        className="size-4 accent-[var(--i-accent)]"
      />
      Approved to send
    </label>
  );
}
