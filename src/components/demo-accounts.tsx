'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const DEMO_ACCOUNTS = [
  {
    label: 'Teacher',
    name: 'Ms. Rivera',
    email: 'rivera@school.edu',
    description: '8th grade English Language Arts',
    color: 'border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900',
    dot: 'bg-amber-500',
  },
  {
    label: 'SPED Teacher',
    name: 'Ms. Rodriguez',
    email: 'rodriguez@school.edu',
    description: 'Special education case manager',
    color: 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900',
    dot: 'bg-emerald-500',
  },
  {
    label: 'Admin',
    name: 'Dr. Williams',
    email: 'williams@school.edu',
    description: 'District administrator',
    color: 'border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-900',
    dot: 'bg-stone-500',
  },
  {
    label: 'Parent',
    name: 'Sarah Chen',
    email: 'sarah.chen@email.com',
    description: "Parent of Aisha Torres",
    color: 'border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-900',
    dot: 'bg-sky-500',
  },
  {
    label: 'Student',
    name: 'Aisha Torres',
    email: 'aisha@student.edu',
    description: '8th grade student',
    color: 'border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-900',
    dot: 'bg-rose-500',
  },
] as const

export function DemoAccountButtons({ compact = false }: { compact?: boolean }) {
  const [error, setError] = useState('')
  const [demoLoading, setDemoLoading] = useState<string | null>(null)
  const router = useRouter()

  async function handleDemoLogin(demoEmail: string) {
    setError('')
    setDemoLoading(demoEmail)

    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demoEmail }),
      })

      if (!res.ok) {
        setDemoLoading(null)
        setError('Demo login failed. Please try again.')
        return
      }

      const { email: clonedEmail } = await res.json()

      const result = await signIn('credentials', {
        email: clonedEmail,
        password: 'password123',
        redirect: false,
      })

      setDemoLoading(null)

      if (result?.error) {
        setError('Demo login failed. Please try again.')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setDemoLoading(null)
      setError('Demo login failed. Please try again.')
    }
  }

  const isDisabled = demoLoading !== null

  if (compact) {
    return (
      <div className="space-y-3">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              disabled={isDisabled}
              onClick={() => handleDemoLogin(account.email)}
              className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${account.color}`}
            >
              {demoLoading === account.email ? (
                <>
                  <Spinner />
                  Setting up...
                </>
              ) : (
                account.label
              )}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <div className="grid gap-2">
        {DEMO_ACCOUNTS.map((account) => (
          <button
            key={account.email}
            type="button"
            disabled={isDisabled}
            onClick={() => handleDemoLogin(account.email)}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${account.color}`}
          >
            <div className={`size-2.5 shrink-0 rounded-full ${account.dot}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold">{account.label}</span>
                <span className="text-xs opacity-70">{account.name}</span>
              </div>
              <p className="text-xs opacity-60">{account.description}</p>
            </div>
            {demoLoading === account.email && <Spinner />}
          </button>
        ))}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="mr-1.5 h-3.5 w-3.5 shrink-0 animate-spin opacity-60" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}
