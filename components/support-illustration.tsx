import { CheckCircle } from "@phosphor-icons/react";
import Logo from "@/components/ui/svgs/logo";
import { cn } from "@/lib/utils";

type Message = { from: "client" | "studio"; text: string; done?: boolean };

/** One embedded-team exchange: request, quick acknowledgement, shipped. */
const THREAD: Message[] = [
  { from: "client", text: "Can we get the API guide live this week?" },
  { from: "studio", text: "On it. Draft is in review today." },
  { from: "studio", text: "Published and shared with the team", done: true },
];

/**
 * Support: a compact chat thread, shown in full with the card (no waiting
 * on per-message animation).
 */
export default function SupportIllustration({
  className,
}: {
  className?: string;
}) {
  const shown = THREAD;

  return (
    <div
      aria-hidden
      className={cn("flex w-full justify-center px-6 md:px-10", className)}
    >
      <div className="w-full max-w-[420px]">
        <div className="flex min-h-[148px] flex-col justify-end gap-2.5">
          {shown.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex items-end gap-2",
                message.from === "studio" ? "justify-start" : "justify-end",
              )}
            >
              {message.from === "studio" ? (
                <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-[#1a1412] ring-1 ring-white/10">
                  <Logo className="size-3.5" />
                </span>
              ) : null}
              <span
                className={cn(
                  "max-w-[78%] rounded-[6px] px-3 py-2 text-[12.5px] leading-[1.4]",
                  message.from === "client"
                    ? "rounded-br-md bg-white/[0.1] text-white/85"
                    : "rounded-bl-md bg-gradient-to-b from-[#f97316] to-[#c2410c] text-white shadow-[0_8px_20px_-10px_rgba(234,88,12,0.8)]",
                )}
              >
                {message.done ? (
                  <span className="flex items-center gap-1.5">
                    <CheckCircle weight="fill" className="size-3.5 shrink-0" />
                    {message.text}
                  </span>
                ) : (
                  message.text
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
