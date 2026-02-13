import Link from 'next/link'
import { BookOpen } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="rounded-full bg-amber-50 p-6 mb-6 inline-block">
          <BookOpen className="size-12 text-amber-400" />
        </div>
        <h1 className="font-serif text-4xl font-bold text-stone-900 mb-2">
          Page Not Found
        </h1>
        <p className="text-stone-500 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
