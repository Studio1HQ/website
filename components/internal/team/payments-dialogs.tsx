"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react";
import {
  deletePaymentAction,
  markPaidAction,
  savePayeeAction,
  savePaymentAction,
} from "@/app/internal/(dashboard)/money/payments/actions";
import {
  CURRENCIES,
  PAYEE_KINDS,
  formatMoney,
  monthLabel,
  type Payee,
  type PayeeKind,
  type Payment,
  type PaymentDirection,
} from "@/lib/internal/team/shared";
import { cn } from "@/lib/utils";
import { Select } from "@/components/internal/select";
import { useToast } from "@/components/internal/toast";
import { Notice, buttonClass, inputClass, textareaClass } from "@/components/internal/ui";

/* The Payments page's dialogs: add or edit a payment, mark one paid, add or
   edit a payee, and confirm a delete. */

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content className="internal-pop internal-dialog fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[min(520px,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[var(--i-line)] bg-[var(--i-panel)] text-[var(--i-ink)] shadow-[var(--i-shadow-pop)]">
          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--i-line)] px-5 py-3.5">
              <div className="min-w-0">
                <Dialog.Title className="text-[15px] font-medium">{title}</Dialog.Title>
                {description ? (
                  <Dialog.Description className="mt-0.5 text-[12.5px] text-[var(--i-muted)]">{description}</Dialog.Description>
                ) : (
                  <Dialog.Description className="sr-only">{title}</Dialog.Description>
                )}
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close"
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--i-muted)] hover:bg-[var(--i-hover)] hover:text-[var(--i-ink)]"
                >
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">{children}</div>
            <div className="flex items-center justify-end gap-2 border-t border-[var(--i-line)] px-5 py-3">
              <Dialog.Close asChild>
                <button type="button" className={buttonClass("ghost")}>
                  Cancel
                </button>
              </Dialog.Close>
              {footer}
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const KIND_OPTIONS = (Object.entries(PAYEE_KINDS) as [PayeeKind, string][]).map(([value, label]) => ({
  value,
  label,
}));

export function FormField({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-[12px] text-[var(--i-muted)]">
        {label}
        {hint ? <span className="text-[var(--i-faint)]"> · {hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-[var(--i-sunken)] p-0.5 ring-1 ring-inset ring-[var(--i-line)]">
      {options.map(([key, text]) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          onClick={() => onChange(key)}
          className={cn(
            "h-7 rounded-md px-3 text-[12.5px] transition-colors",
            value === key
              ? "bg-[var(--i-panel)] font-medium text-[var(--i-ink)] shadow-[var(--i-shadow-sm)] ring-1 ring-[var(--i-line)]"
              : "text-[var(--i-muted)] hover:text-[var(--i-ink)]",
          )}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- payment */

/** Add a payment by hand (payment null), or edit one. */
export function PaymentDialog({
  open,
  onOpenChange,
  payment,
  payees,
  thisMonth,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: Payment | null;
  payees: Payee[];
  thisMonth: string;
}) {
  const toast = useToast();
  const [saving, startSaving] = useTransition();
  const [payeeId, setPayeeId] = useState(payment?.payee_id ?? "");
  const [name, setName] = useState(payment?.name ?? "");
  const [email, setEmail] = useState(payment?.email ?? "");
  const [code, setCode] = useState(payment?.code ?? "");
  const [kind, setKind] = useState<PayeeKind>(payment?.kind ?? "writer");
  const [direction, setDirection] = useState<PaymentDirection>(payment?.direction ?? "out");
  const [directionTouched, setDirectionTouched] = useState(Boolean(payment));
  const [month, setMonth] = useState(payment?.month || thisMonth);
  const [amount, setAmount] = useState(payment?.amount !== null && payment?.amount !== undefined ? String(payment.amount) : "");
  const [currency, setCurrency] = useState(payment?.currency ?? "INR");
  const [description, setDescription] = useState(payment?.description ?? "");
  const [note, setNote] = useState(payment?.note ?? "");
  const [clearFlag, setClearFlag] = useState(false);

  const payee = payees.find((item) => item.id === payeeId) ?? null;
  const effectiveKind = payee?.kind ?? kind;
  const pickKind = (next: PayeeKind) => {
    setKind(next);
    if (!directionTouched) setDirection(next === "sponsor" ? "in" : "out");
  };
  const pickPayee = (id: string) => {
    setPayeeId(id);
    const next = payees.find((item) => item.id === id);
    if (next && !directionTouched) setDirection(next.kind === "sponsor" ? "in" : "out");
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    startSaving(async () => {
      const result = await savePaymentAction(payment?.id ?? null, {
        payee_id: payeeId || null,
        name,
        email,
        code,
        kind: effectiveKind,
        direction,
        month,
        amount,
        currency,
        description,
        note,
        clear_flag: clearFlag,
      });
      if (result.ok) {
        toast("success", payment ? "Saved." : "Payment added.");
        onOpenChange(false);
      } else {
        toast("error", result.message);
      }
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={payment ? "Edit payment" : "Add a payment"}
      description={payment?.source === "email" ? `Came in by email: “${payment.email_subject ?? ""}”` : undefined}
      onSubmit={submit}
      footer={
        <button type="submit" disabled={saving} className={buttonClass("primary")}>
          {saving ? "Saving…" : payment ? "Save" : "Add payment"}
        </button>
      }
    >
      <FormField label="Payee">
        <Select
          value={payeeId}
          onChange={pickPayee}
          options={[
            { value: "", label: "Someone not on the list" },
            ...payees.map((item) => ({
              value: item.id,
              label: `${item.name} · ${item.code}${item.active ? "" : " (inactive)"}`,
              disabled: !item.active && item.id !== payeeId,
            })),
          ]}
        />
      </FormField>
      {payee ? null : (
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Name" className="sm:col-span-2">
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required className={inputClass()} />
          </FormField>
          <FormField label="Email" hint="for the paid email">
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} className={inputClass()} />
          </FormField>
          <FormField label="Kind">
            <Select value={kind} onChange={pickKind} options={KIND_OPTIONS} />
          </FormField>
          <FormField label="Code" hint="optional" className="sm:col-span-2">
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              maxLength={16}
              placeholder="WR-07"
              className={cn(inputClass(), "uppercase tracking-wide")}
            />
          </FormField>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Segmented<PaymentDirection>
          label="Direction"
          value={direction}
          onChange={(next) => {
            setDirection(next);
            setDirectionTouched(true);
          }}
          options={[
            ["out", "We pay them"],
            ["in", "They pay us"],
          ]}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_6.5rem]">
        <FormField label="Month it's for">
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} required className={inputClass()} />
        </FormField>
        <FormField label="Amount">
          <input
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="12500"
            className={cn(inputClass(), "tabular-nums")}
          />
        </FormField>
        <FormField label="Currency">
          <Select
            value={currency}
            onChange={setCurrency}
            options={CURRENCIES.map((item) => ({ value: item, label: item }))}
          />
        </FormField>
      </div>
      <FormField label="What it's for" hint="optional">
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={200}
          placeholder="3 blog posts, judging, venue…"
          className={inputClass()}
        />
      </FormField>
      <FormField label="Note" hint="only the team sees it">
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={500}
          rows={2}
          className={textareaClass}
        />
      </FormField>
      {payment?.flagged ? (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12.5px] text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <input
            type="checkbox"
            checked={clearFlag}
            onChange={(event) => setClearFlag(event.target.checked)}
            className="mt-0.5 size-4 accent-[var(--i-accent)]"
          />
          <span>
            Checked it: clear the note
            <span className="block text-amber-800/80 dark:text-amber-200/70">{payment.flagged}</span>
          </span>
        </label>
      ) : null}
    </Modal>
  );
}

/* ------------------------------------------------------------- mark paid */

export function MarkPaidDialog({
  open,
  onOpenChange,
  payment,
  today,
  mailerReady,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: Payment;
  today: string;
  mailerReady: boolean;
}) {
  const toast = useToast();
  const [saving, startSaving] = useTransition();
  const incoming = payment.direction === "in";
  const canEmail = !incoming && Boolean(payment.email) && mailerReady;
  const [amount, setAmount] = useState(payment.amount !== null ? String(payment.amount) : "");
  const [paidOn, setPaidOn] = useState(today);
  const [reference, setReference] = useState("");
  const [notify, setNotify] = useState(canEmail);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    startSaving(async () => {
      const result = await markPaidAction(payment.id, { amount, paid_on: paidOn, reference, notify: canEmail && notify });
      if (result.ok) {
        toast("success", result.message ?? (incoming ? "Marked received." : "Marked paid."));
        onOpenChange(false);
      } else {
        toast("error", result.message);
      }
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={incoming ? `Mark ${payment.name}'s payment received` : `Mark ${payment.name} paid`}
      description={[payment.month ? monthLabel(payment.month) : "", payment.description].filter(Boolean).join(" · ") || undefined}
      onSubmit={submit}
      footer={
        <button type="submit" disabled={saving} className={buttonClass("accent")}>
          {saving ? "Saving…" : incoming ? "Mark received" : notify && canEmail ? "Mark paid and email" : "Mark paid"}
        </button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label={incoming ? "Amount received" : "Amount paid"} hint={payment.currency}>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
            autoFocus
            className={cn(inputClass(), "tabular-nums")}
          />
        </FormField>
        <FormField label={incoming ? "Received on" : "Paid on"}>
          <input type="date" value={paidOn} max={today} onChange={(event) => setPaidOn(event.target.value)} required className={inputClass()} />
        </FormField>
      </div>
      <FormField label="Reference" hint="UTR or transaction ID, optional">
        <input value={reference} onChange={(event) => setReference(event.target.value)} maxLength={80} className={inputClass()} />
      </FormField>
      {incoming ? null : (
        <label
          className={cn(
            "flex items-start gap-2.5 rounded-lg border border-[var(--i-line)] px-3 py-2.5 text-[13px]",
            canEmail ? "cursor-pointer" : "opacity-70",
          )}
        >
          <input
            type="checkbox"
            checked={canEmail && notify}
            disabled={!canEmail}
            onChange={(event) => setNotify(event.target.checked)}
            className="mt-0.5 size-4 accent-[var(--i-accent)]"
          />
          <span>
            Email {payment.email ?? "them"} that it&apos;s paid
            <span className="block text-[12px] text-[var(--i-muted)]">
              {!payment.email
                ? "There's no email address on this payment."
                : !mailerReady
                  ? "Sending needs RESEND_API_KEY in Vercel."
                  : `A short note with ${amount ? formatMoney(Number(amount.replace(/,/g, "")) || 0, payment.currency) : "the amount"}${reference ? " and the reference" : ""}. Replies come to you.`}
            </span>
          </span>
        </label>
      )}
      {payment.flagged ? <Notice tone="warning">{payment.flagged}</Notice> : null}
    </Modal>
  );
}

/* ----------------------------------------------------------------- payee */

export function PayeeDialog({
  open,
  onOpenChange,
  payee,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payee: Payee | null;
}) {
  const toast = useToast();
  const [saving, startSaving] = useTransition();
  const [code, setCode] = useState(payee?.code ?? "");
  const [name, setName] = useState(payee?.name ?? "");
  const [email, setEmail] = useState(payee?.email ?? "");
  const [kind, setKind] = useState<PayeeKind>(payee?.kind ?? "writer");
  const [notes, setNotes] = useState(payee?.notes ?? "");
  const [active, setActive] = useState(payee?.active ?? true);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    startSaving(async () => {
      const result = await savePayeeAction(payee?.id ?? null, { code, name, email, kind, notes, active });
      if (result.ok) {
        toast("success", payee ? "Payee saved." : `Added ${name}. Their code is ${code.trim().toUpperCase()}.`);
        onOpenChange(false);
      } else {
        toast("error", result.message);
      }
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={payee ? `Edit ${payee.name}` : "Add a payee"}
      description="They put their code in the invoice email's subject, so it lands on them."
      onSubmit={submit}
      footer={
        <button type="submit" disabled={saving} className={buttonClass("primary")}>
          {saving ? "Saving…" : payee ? "Save" : "Add payee"}
        </button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
        <FormField label="Code">
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            maxLength={16}
            required
            placeholder="WR-07"
            pattern="[A-Za-z0-9][A-Za-z0-9\-]{1,15}"
            className={cn(inputClass(), "font-medium uppercase tracking-wide")}
          />
        </FormField>
        <FormField label="Name">
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required className={inputClass()} />
        </FormField>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
        <FormField label="Email" hint="invoices from it match them">
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} className={inputClass()} />
        </FormField>
        <FormField label="Kind">
          <Select value={kind} onChange={setKind} options={KIND_OPTIONS} />
        </FormField>
      </div>
      <FormField label="Notes" hint="rate, terms, anything useful">
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={300}
          rows={2}
          className={textareaClass}
        />
      </FormField>
      {payee ? (
        <label className="flex cursor-pointer items-center gap-2.5 text-[13px]">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="size-4 accent-[var(--i-accent)]" />
          Active. Turn off for people you no longer work with; their invoices get flagged.
        </label>
      ) : null}
    </Modal>
  );
}

/* ---------------------------------------------------------------- delete */

export function DeletePaymentDialog({
  open,
  onOpenChange,
  payment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: Payment;
}) {
  const toast = useToast();
  const [saving, startSaving] = useTransition();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    startSaving(async () => {
      const result = await deletePaymentAction(payment.id);
      if (result.ok) {
        toast("success", "Payment deleted.");
        onOpenChange(false);
      } else {
        toast("error", result.message);
      }
    });
  };
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Delete this payment?"
      description={`${payment.name} · ${payment.month ? monthLabel(payment.month) : ""} · ${formatMoney(payment.amount, payment.currency)}`}
      onSubmit={submit}
      footer={
        <button type="submit" disabled={saving} className={buttonClass("danger")}>
          {saving ? "Deleting…" : "Delete"}
        </button>
      }
    >
      <p className="text-[13px] leading-relaxed text-[var(--i-ink-2)]">
        It goes for good{payment.invoice_path ? ", with its invoice file" : ""}. To keep a record, cancel it instead.
      </p>
    </Modal>
  );
}
