import type { Metadata } from "next";
import "./internal.css";

export const metadata: Metadata = {
  title: { default: "Internal", template: "%s · Internal" },
  robots: { index: false, follow: false, nocache: true },
};

export default function InternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="internal-ui">{children}</div>;
}
