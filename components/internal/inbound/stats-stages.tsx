import { stageLabel } from "@/lib/internal/inbound/wording";
import type { StageCount } from "@/lib/internal/inbound/stats-math";

/** Each stage with how many leads are in it now and how many got that far. */
export function StatsStages({ stages }: { stages: StageCount[] }) {
  return (
    <table className="w-full text-left text-[13px]">
      <thead className="text-[12px] text-[var(--i-muted)]">
        <tr>
          <th className="py-1.5 pr-3 font-normal">Stage</th>
          <th className="px-3 py-1.5 text-right font-normal">In it now</th>
          <th className="py-1.5 pl-3 text-right font-normal">Reached it</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--i-line)]">
        {stages.map((row) => (
          <tr key={row.stage}>
            <td className="py-2 pr-3">{stageLabel(row.stage)}</td>
            <td className="px-3 py-2 text-right tabular-nums">{row.inStage}</td>
            <td className="py-2 pl-3 text-right tabular-nums">
              {row.reached === null ? (
                <span className="text-[var(--i-faint)]">—</span>
              ) : (
                row.reached
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
