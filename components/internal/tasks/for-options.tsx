import type { SelectOption } from "@/components/internal/select";
import type { LinkOption } from "@/lib/internal/tasks/shared";

/* The "For" picker's options, grouped under headings: Studio1 (and its
   areas), your client deliverables, the clients. Single-line labels, so the
   picker's button never cuts a second line off. */

const GROUPS: { key: LinkOption["group"]; label: string }[] = [
  { key: "studio", label: "Studio1" },
  { key: "deliverable", label: "Your client work" },
  { key: "client", label: "Clients" },
  { key: "task", label: "Your tasks" },
  { key: "community", label: "Community tasks" },
];

/** "Cookbook intro · Nebius" for a deliverable, the label otherwise. */
export function optionText(option: LinkOption) {
  return option.group === "deliverable" && option.hint ? `${option.label} · ${option.hint}` : option.label;
}

export function forSelectOptions(options: readonly LinkOption[], current?: { value: string; label: string }): SelectOption[] {
  const list: SelectOption[] = [];
  for (const group of GROUPS) {
    const items = options.filter((option) => option.group === group.key);
    if (!items.length) continue;
    if (group.key !== "studio") {
      list.push({
        value: `__${group.key}`,
        disabled: true,
        textValue: group.label,
        label: <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--i-faint)]">{group.label}</span>,
      });
    }
    for (const option of items) list.push({ value: option.value, label: optionText(option), textValue: optionText(option) });
  }
  if (current && !options.some((option) => option.value === current.value)) {
    list.push({ value: current.value, label: current.label, textValue: current.label });
  }
  return list;
}
