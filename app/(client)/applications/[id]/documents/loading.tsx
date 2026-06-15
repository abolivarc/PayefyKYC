function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-100 ${className ?? ""}`} />
}

function DocRowSkeleton() {
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0">
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-72" />
      </div>
      <Skeleton className="h-8 w-16 rounded-md shrink-0" />
    </div>
  )
}

export default function DocumentsLoading() {
  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto">
      <Skeleton className="h-4 w-24 mb-4" />
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <div className="mb-6 space-y-1.5">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-3 w-full rounded-full" />
      </div>
      {["Formularios digitales", "Documentos de la empresa", "Identidades y poderes"].map((title) => (
        <section key={title} className="mb-6">
          <Skeleton className="h-3 w-40 mb-2" />
          <div className="rounded-lg border border-gray-100 px-4">
            {[0, 1, 2].map((i) => <DocRowSkeleton key={i} />)}
          </div>
        </section>
      ))}
    </div>
  )
}
