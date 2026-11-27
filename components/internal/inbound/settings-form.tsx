"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "@/components/internal/icons";
import { guarded } from "@/components/internal/guarded";
import { useToast } from "@/components/internal/toast";
import { buttonClass, inputClass } from "@/components/internal/ui";
import { saveSettings as saveSettingsAction } from "@/app/internal/(dashboard)/inbound/actions";
import type { AgentSettings } from "@/lib/internal/inbound/schema";
import { cn } from "@/lib/utils";

const saveSettings = guarded(saveSettingsAction);

/** The limits validateSetting (lib/internal/inbound/rules.ts) enforces. */
export const MAX_RULES = 30;
export const MAX_RULE_LENGTH = 300;

const clean = (rules: string[]) =>
  rules.map((rule) => rule.replace(/\s+/g, " ").trim()).filter(Boolean);

function Switch({
  checked,
  onChange,
  title,
  children,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  title: string;
  children?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p className="text-[14px] font-medium">{title}</p>
        {children ? (
          <p className="mt-0.5 max-w-xl text-[13px] leading-relaxed text-[var(--i-muted)]">
            {children}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
        className="mt-0.5 inline-flex h-6 shrink-0 items-center"
      >
        <span
          aria-hidden
          className={cn(
            "relative h-5 w-9 rounded-full transition-colors",
            checked ? "bg-[var(--i-accent)]" : "bg-[var(--i-line-strong)]",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-4 rounded-full bg-white transition-all",
              checked ? "left-[18px]" : "left-0.5",
            )}
          />
        </span>
      </button>
    </div>
  );
}

/** The agent's switches and house rules. Saving sends only what changed. */
export function SettingsForm({ initial }: { initial: AgentSettings }) {
  const toast = useToast();
  const [saved, setSaved] = useState(initial);
  const [apply, setApply] = useState(initial.sorter.apply);
  const [booking, setBooking] = useState(initial.auto_start.booking);
  const [mail, setMail] = useState(initial.auto_start.mail);
  const [rules, setRules] = useState<string[]>(initial.house_rules.rules);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const dirty =
    apply !== saved.sorter.apply ||
    booking !== saved.auto_start.booking ||
    mail !== saved.auto_start.mail ||
    JSON.stringify(clean(rules)) !== JSON.stringify(saved.house_rules.rules);

  const save = () => {
    setError(null);
    const nextRules = clean(rules);
    startSaving(async () => {
      const result = await saveSettings({
        sorterApply: apply,
        startOnBooking: booking,
        startOnMail: mail,
        rules: nextRules,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSaved({
        sorter: { apply },
        auto_start: { booking, mail },
        house_rules: { rules: nextRules },
      });
      setRules(nextRules);
      toast("success", result.message ?? "Saved");
    });
  };

  return (
    <div className="space-y-5">
      <div className="divide-y divide-[var(--i-line)]">
        <Switch
          checked={apply}
          onChange={setApply}
          title="Create leads from mail the sorter is sure about"
        >
          While this is off, the sorter only labels mail and never creates a
          lead. You decide on every one from Review.
        </Switch>
        <Switch
          checked={booking}
          onChange={setBooking}
          title="Start the agent when a call is booked"
        />
        <Switch
          checked={mail}
          onChange={setMail}
          title="Start the agent for a lead from mail"
        />
      </div>

      <div>
        <h2 className="text-[14px] font-medium">House rules</h2>
        <p className="mt-0.5 text-[13px] text-[var(--i-muted)]">
          Short rules the agent follows for every lead, one line each. Up to{" "}
          {MAX_RULES} rules, {MAX_RULE_LENGTH} characters each.
        </p>
        <ul className="mt-3 space-y-2">
          {rules.map((rule, index) => (
            <li key={index} className="flex items-center gap-2">
              <input
                value={rule}
                maxLength={MAX_RULE_LENGTH}
                onChange={(event) =>
                  setRules((current) =>
                    current.map((item, at) =>
                      at === index ? event.target.value : item,
                    ),
                  )
                }
                aria-label={`Rule ${index + 1}`}
                className={inputClass()}
              />
              <button
                type="button"
                onClick={() =>
                  setRules((current) => current.filter((_, at) => at !== index))
                }
                aria-label={`Remove rule ${index + 1}`}
                className={buttonClass("ghost", "sm")}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled={rules.length >= MAX_RULES}
          onClick={() => setRules((current) => [...current, ""])}
          className={cn(buttonClass("secondary", "sm"), "mt-3")}
        >
          <Plus size={14} />
          Add a rule
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--i-line)] pt-4">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className={buttonClass("primary")}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {error ? (
          <span
            role="alert"
            className="text-[13px] text-rose-700 dark:text-rose-300"
          >
            {error}
          </span>
        ) : null}
      </div>
    </div>
  );
}
