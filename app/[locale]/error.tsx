"use client";

import { PaperError } from "@/components/paper/paper-error-pages";

export default function LocaleError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return <PaperError error={error} retry={unstable_retry} />;
}
