export default function Loading() {
  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center">
      <div className="text-center">
        {/* Spinner */}
        <div className="relative w-16 h-16 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin" />
        </div>

        {/* Text */}
        <p className="text-muted-foreground animate-pulse">
          Chargement...
        </p>
      </div>
    </div>
  );
}
