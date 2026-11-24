import { PencilSimple, Plus } from "@/components/internal/icons";
import {
  PERSON_ROLES,
  labelOf,
  pointsLabel,
} from "@/lib/internal/clients/schema";
import { Card, CardTitle, buttonClass } from "@/components/internal/ui";
import { TeamAvatar } from "@/components/internal/team-photos";
import { Pill } from "@/components/internal/community/ui";
import {
  CapacityDialog,
  type CapacityPerson,
} from "@/components/internal/clients/capacity-dialog";

/**
 * People's weekly capacity for client work: everyone with a capacity row,
 * plus anyone with a client role who hasn't got one yet (suggested when
 * adding). Each row opens a
 * small dialog to change it.
 */
export function CapacityTable({ people }: { people: CapacityPerson[] }) {
  const unsaved = people
    .filter((person) => person.role === null)
    .map((person) => person.email);
  const edit = (person: CapacityPerson) => (
    <CapacityDialog
      person={person}
      trigger={
        <button
          type="button"
          className={buttonClass(person.role ? "ghost" : "secondary", "sm")}
        >
          <PencilSimple size={13} /> {person.role ? "Edit" : "Set capacity"}
          <span className="sr-only"> for {person.name || person.email}</span>
        </button>
      }
    />
  );
  const capacity = (person: CapacityPerson) =>
    person.weekly_capacity === null ? (
      <span className="text-[var(--i-faint)]">Not set</span>
    ) : (
      <span className="tabular-nums">
        {pointsLabel(person.weekly_capacity)}
      </span>
    );
  const status = (person: CapacityPerson) =>
    person.role === null ? (
      <Pill tone="amber">No capacity yet</Pill>
    ) : person.active ? (
      <Pill tone="emerald">Active</Pill>
    ) : (
      <Pill tone="stone">Not taking work</Pill>
    );

  return (
    <Card>
      <CardTitle
        action={
          <CapacityDialog
            choices={unsaved}
            trigger={
              <button type="button" className={buttonClass("secondary", "sm")}>
                <Plus size={13} /> Add someone
              </button>
            }
          />
        }
      >
        People
      </CardTitle>
      {people.length ? (
        <>
          {/* Phones and tablets: a card per person. */}
          <ul className="divide-y divide-[var(--i-line)] lg:hidden">
            {people.map((person) => (
              <li
                key={person.email}
                className="flex items-start gap-3 px-4 py-3 text-[13px]"
              >
                <TeamAvatar
                  name={person.name || person.email}
                  email={person.email}
                  size={28}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {person.name || person.email}
                  </p>
                  <p className="truncate text-[12px] text-[var(--i-muted)]">
                    {[
                      person.role ? labelOf(PERSON_ROLES, person.role) : "",
                      person.email,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12.5px]">
                    {status(person)}
                    {capacity(person)}
                    {person.slack_user_id ? (
                      <span className="font-mono text-[12px] text-[var(--i-muted)]">
                        {person.slack_user_id}
                      </span>
                    ) : null}
                  </div>
                </div>
                {edit(person)}
              </li>
            ))}
          </ul>
          <div className="hidden lg:block">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--i-line)] text-[12px] text-[var(--i-muted)] [&>th]:whitespace-nowrap [&>th]:px-4 [&>th]:py-2.5 [&>th]:font-normal first:[&>th]:pl-5 last:[&>th]:pr-5">
                  <th scope="col">Person</th>
                  <th scope="col">Role</th>
                  <th scope="col">Weekly capacity</th>
                  <th scope="col">Slack user id</th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="sr-only">Edit</span>
                  </th>
                </tr>
              </thead>
              <tbody className="[&>tr]:border-b [&>tr]:border-[var(--i-line)] last:[&>tr]:border-0 [&>tr>td]:px-4 [&>tr>td]:py-2.5 first:[&>tr>td]:pl-5 last:[&>tr>td]:pr-5">
                {people.map((person) => (
                  <tr key={person.email} className="align-middle">
                    <td className="min-w-0 max-w-[18rem]">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <TeamAvatar
                          name={person.name || person.email}
                          email={person.email}
                          size={24}
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {person.name || person.email}
                          </span>
                          {person.name ? (
                            <span className="block truncate text-[12px] text-[var(--i-muted)]">
                              {person.email}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap">
                      {person.role ? (
                        labelOf(PERSON_ROLES, person.role)
                      ) : (
                        <span className="text-[var(--i-faint)]">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">{capacity(person)}</td>
                    <td className="whitespace-nowrap font-mono text-[12px] text-[var(--i-muted)]">
                      {person.slack_user_id || (
                        <span className="font-sans text-[var(--i-faint)]">
                          —
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">{status(person)}</td>
                    <td className="text-right">{edit(person)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="px-5 py-4 text-[13px] text-[var(--i-muted)]">
          Nobody has a client role or a capacity yet. Add someone to start.
        </p>
      )}
    </Card>
  );
}
