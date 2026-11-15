"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/internal/select";
import { displayName } from "@/lib/internal/team/shared";
import { tasksHref } from "@/lib/internal/tasks/shared";

/** Whose tasks to show: a select that keeps the current view. */
export function PersonPicker({
  people,
  value,
  me,
  view,
}: {
  people: { email: string; name: string }[];
  value: string;
  me: string;
  view: string;
}) {
  const router = useRouter();
  return (
    <Select
      aria-label="Whose tasks"
      value={value}
      onChange={(email) =>
        router.push(tasksHref({ view: view === "week" ? null : view, person: email === me ? null : email }))
      }
      options={people.map((person) => ({
        value: person.email,
        label: person.email === me ? `${displayName(person)} (you)` : displayName(person),
        textValue: displayName(person),
      }))}
      className="w-[13rem]"
    />
  );
}
