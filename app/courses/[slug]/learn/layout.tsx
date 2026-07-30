export default function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="learn-shell min-h-[calc(100dvh-4rem)]">{children}</div>
  );
}
