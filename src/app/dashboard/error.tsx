'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="rounded-full bg-rose-50 p-6 mb-6">
        <AlertTriangle className="size-10 text-rose-500" />
      </div>
      <h2 className="font-serif text-2xl font-bold tracking-tight text-stone-900 mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-stone-500 max-w-md mb-8">
        An unexpected error occurred while loading the dashboard. Please try
        again, and contact support if the problem persists.
      </p>
      <Button
        onClick={reset}
        className="bg-amber-600 hover:bg-amber-700 text-white"
      >
        Try Again
      </Button>
    </div>
  )
}
