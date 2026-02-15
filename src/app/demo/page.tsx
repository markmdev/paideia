'use client'

import Link from 'next/link'
import { BookOpen, ArrowLeft } from 'lucide-react'
import { DemoAccountButtons } from '@/components/demo-accounts'

export default function DemoPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-amber-50 via-orange-50/80 to-stone-50">
      {/* Header */}
      <header className="border-b border-stone-200/60 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-600 text-white">
              <BookOpen className="size-4" />
            </div>
            <span className="text-lg font-bold tracking-tight">Paideia</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-stone-900">
              Try the Demo
            </h1>
            <p className="mt-3 text-stone-600">
              Each account creates a fresh, isolated sandbox. Explore any role — your changes won&apos;t affect other visitors.
            </p>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <DemoAccountButtons />
          </div>

          <p className="text-center text-sm text-stone-500">
            Want your own account?{' '}
            <Link href="/register" className="text-amber-700 hover:text-amber-800 font-medium">
              Register here
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
