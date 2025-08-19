"use client"

export default function GlobalLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-primary"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  )
}
