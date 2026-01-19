function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-muted rounded ${className}`} />;
}

export default function MailingLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div>
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-28" />
      </div>

      {/* Content */}
      <div className="bg-background rounded-xl border border-border p-6 space-y-6">
        <div className="bg-primary/5 rounded-xl p-6">
          <div className="flex gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Skeleton className="h-5 w-32" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 bg-secondary/30 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ))}
        </div>

        <Skeleton className="h-10 w-40" />
      </div>
    </div>
  );
}
