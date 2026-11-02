export default function ServicesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen overflow-x-clip bg-[var(--home-cream)] text-[var(--home-ink)]">
      {children}
    </div>
  );
}
