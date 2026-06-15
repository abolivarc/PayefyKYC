function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-100 ${className ?? ""}`} />
}

export default function DashboardLoading() {
  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto">
      <Skeleton className="h-8 w-48 mb-6" />
      <div className="space-y-4">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border border-gray-100 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-8 w-28 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
