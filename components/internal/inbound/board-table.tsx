import Link from "next/link";
import { Card } from "@/components/internal/ui";
import { Muted, Table, rowClass } from "@/components/internal/community/ui";
import {
  FitTag,
  LeadLogo,
  StatusText,
  sourceAndAge,
} from "@/components/internal/inbound/board-card";
import { BOARD_COLUMNS, type LeadCard } from "@/lib/internal/inbound/schema";

/** The board's leads as rows. */
export function BoardTable({
  cards,
  now,
}: {
  cards: readonly LeadCard[];
  now: Date;
}) {
  const label = (key: string) =>
    BOARD_COLUMNS.find((column) => column.key === key)?.label ?? key;
  return (
    <Card>
      <Table
        head={
          <>
            <th>Company</th>
            <th>Stage</th>
            <th>Contact</th>
            <th>Came in</th>
            <th>Agent</th>
            <th>Fit</th>
          </>
        }
      >
        {cards.map((card) => (
          <tr key={card.org.id} className={rowClass}>
            <td className="max-w-[16rem]">
              <Link
                href={`/inbound/${card.org.id}`}
                className="group flex min-w-0 items-center gap-2.5"
              >
                <LeadLogo lead={card.org} size={26} />
                <span className="truncate font-medium group-hover:text-[var(--i-accent-text)]">
                  {card.org.name}
                </span>
              </Link>
            </td>
            <td className="whitespace-nowrap">{label(card.column)}</td>
            <td className="max-w-[12rem] truncate">
              {card.primaryContact ? (
                card.primaryContact.name || card.primaryContact.email
              ) : (
                <Muted>—</Muted>
              )}
            </td>
            <td className="whitespace-nowrap text-[var(--i-muted)]">
              {sourceAndAge(card, now)}
            </td>
            <td className="max-w-[18rem]">
              <StatusText card={card} className="line-clamp-2" />
            </td>
            <td>
              <FitTag whyFit={card.org.why_fit} />
            </td>
          </tr>
        ))}
      </Table>
    </Card>
  );
}
