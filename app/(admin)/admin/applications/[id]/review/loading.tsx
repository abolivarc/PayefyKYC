function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-100 ${className ?? ""}`} />
}

function DocReviewSkeleton() {
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0">
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-60" />
      </div>
      <div className="flex gap-1.5 shrink-0">
        <Skeleton className="h-7 w-16 rounded-md" />
        <Skeleton className="h-7 w-20 rounded-md" />
      </div>
    </div>
  )
}

export default function ReviewLoading() {
  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto">
      <Skeleton className="h-4 w-32 mb-4" />
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-gray-100 p-3 space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-gray-100 px-4 mb-6">
        {[0, 1, 2, 3, 4].map((i) => <DocReviewSkeleton key={i} />)}
      </div>
      <div className="flex gap-3 justify-end">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
    </div>
  )
}
