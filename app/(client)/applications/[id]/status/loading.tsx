function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-100 ${className ?? ""}`} />
}

export default function StatusLoading() {
  return (
    <div className="p-6 sm:p-8 max-w-2xl mx-auto">
      <Skeleton className="h-4 w-24 mb-4" />
      <Skeleton className="h-8 w-40 mb-6" />
      <div className="rounded-xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-52" />
          </div>
        </div>
        <div className="space-y-2 pt-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-3 w-3 rounded-full shrink-0" />
              <Skeleton className="h-3 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
