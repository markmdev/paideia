'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'

export function ReportCardActions({ reportCardId }: { reportCardId: string }) {
  const router = useRouter()
  const [approving, setApproving] = useState(false)

  async function handleApprove() {
    setApproving(true)
    try {
      const res = await fetch(`/api/report-cards/${reportCardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? 'Failed to approve report card')
        return
      }

      router.refresh()
    } catch {
      alert('Failed to approve report card')
    } finally {
      setApproving(false)
    }
  }

  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        onClick={handleApprove}
        disabled={approving}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
      >
        {approving ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <CheckCircle2 className="size-4" />
        )}
        {approving ? 'Approving...' : 'Approve Report Card'}
      </button>
    </div>
  )
}
