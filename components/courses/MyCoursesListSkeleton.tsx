export default function MyCoursesListSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white"
        >
          <div className="aspect-[16/10] bg-slate-200" />
          <div className="space-y-3 p-5">
            <div className="h-5 w-3/4 rounded bg-slate-200" />
            <div className="h-4 w-full rounded bg-slate-100" />
            <div className="h-2 w-full rounded-full bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
