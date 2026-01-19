function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-muted rounded ${className}`} />;
}

export default function SettingsLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-background rounded-xl border border-border p-6">
            <Skeleton className="h-6 w-48 mb-4" />
            <div className="space-y-4">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="flex items-center justify-between">
                  <div>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-10 w-40" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
