export default function HrSegmentLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Mirrors PageShell header height so sidebar navigation feels less jumpy */}
      <header className="sticky top-0 z-20 flex h-16 shrink-0 animate-pulse items-center justify-between gap-4 border-b border-kastros-sand bg-kastros-cream/80 px-6 backdrop-blur">
        <div className="h-7 w-40 max-w-[50%] rounded-lg bg-kastros-sand/90" />
        <div className="flex gap-2">
          <div className="h-10 w-10 rounded-xl bg-white ring-1 ring-kastros-sand" />
          <div className="h-10 w-28 rounded-xl bg-white ring-1 ring-kastros-sand" />
        </div>
      </header>
      <div className="flex-1 space-y-6 overflow-auto p-6">
        <div className="h-36 rounded-2xl bg-white ring-1 ring-kastros-sand/70" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-44 rounded-2xl bg-white ring-1 ring-kastros-sand/70" />
          <div className="h-44 rounded-2xl bg-white ring-1 ring-kastros-sand/70" />
        </div>
      </div>
    </div>
  );
}
