import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Logo from "@/components/ui/svgs/logo";
import { PAPER_SCOPE } from "@/lib/paper";
import { unsubscribe, verifyUnsubscribe } from "@/lib/unsubscribe";

export const metadata: Metadata = {
  title: "Email updates",
  robots: { index: false, follow: false },
};

async function confirm(formData: FormData) {
  "use server";
  const email = await verifyUnsubscribe(formData.get("e"), formData.get("t"));
  if (!email) redirect("/unsubscribe?invalid=1");
  const result = await unsubscribe(email);
  if (!result.ok) {
    console.error(`[unsubscribe] failed: ${result.message}`);
    redirect("/unsubscribe?failed=1");
  }
  redirect("/unsubscribe?done=1");
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** The page behind every "Unsubscribe" link: one button, no sign-in. */
export default async function UnsubscribePage({ searchParams }: Props) {
  const params = await searchParams;
  const one = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);
  const email = one("done") || one("failed") ? null : await verifyUnsubscribe(one("e"), one("t"));

  let title: string;
  let body: React.ReactNode;
  if (one("done")) {
    title = "You're unsubscribed";
    body = "You won't get Studio1's email updates any more. Emails about an application you've sent can still reach you.";
  } else if (one("failed")) {
    title = "That didn't work";
    body = (
      <>
        Something went wrong on our side. Try the link again in a minute, or write to{" "}
        <a href="mailto:contact@studio1hq.com" className="underline decoration-[#f97316] underline-offset-4">
          contact@studio1hq.com
        </a>{" "}
        and we&apos;ll take you off the list.
      </>
    );
  } else if (!email) {
    title = "This link isn't valid";
    body = (
      <>
        Use the unsubscribe link from your latest Studio1 email, or write to{" "}
        <a href="mailto:contact@studio1hq.com" className="underline decoration-[#f97316] underline-offset-4">
          contact@studio1hq.com
        </a>
        .
      </>
    );
  } else {
    title = "Unsubscribe from Studio1 updates?";
    body = (
      <>
        <span className="font-medium text-[#141414]">{email}</span> will stop getting our emails about
        new roles, cohorts and events. Any application you&apos;ve sent isn&apos;t affected.
      </>
    );
  }

  return (
    <main style={PAPER_SCOPE} className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center gap-2.5">
          <Logo className="size-8" />
          <span className="text-[17px] font-medium text-[#141414]">Studio1</span>
        </Link>
        <div className="rounded-[14px] border border-[#141414]/10 bg-white p-7 shadow-[0_1px_2px_rgba(20,20,20,0.05)]">
          <div aria-hidden className="mb-5 h-[3px] w-10 rounded-full bg-[#f97316]" />
          <h1 className="text-[22px] font-medium leading-tight tracking-[-0.01em] text-[#141414]">{title}</h1>
          <p className="mt-2.5 text-[15px] leading-relaxed text-[#141414]/70">{body}</p>
          {email ? (
            <form action={confirm} className="mt-6">
              <input type="hidden" name="e" value={one("e")} />
              <input type="hidden" name="t" value={one("t")} />
              <button
                type="submit"
                className="inline-flex items-center gap-3 rounded-full bg-[#141414] py-1.5 pl-5 pr-1.5 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
              >
                Unsubscribe
                <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-[#f97316]">
                  →
                </span>
              </button>
            </form>
          ) : (
            <Link href="/" className="mt-6 inline-block text-[14px] font-medium text-[#141414] underline decoration-[#f97316] underline-offset-4">
              Back to studio1hq.com
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
