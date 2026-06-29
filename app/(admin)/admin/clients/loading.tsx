import { ClientsGridSkeleton } from "@/components/admin/clients-grid"

export default function ClientsLoading() {
  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <div className="h-7 w-32 bg-secondary rounded motion-safe:animate-pulse" />
        <div className="h-4 w-48 bg-secondary rounded mt-2 motion-safe:animate-pulse" />
      </div>
      <ClientsGridSkeleton />
    </div>
  )
}
