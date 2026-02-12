'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface BatchGradeButtonProps {
  assignmentId: string
  ungradedCount: number
  onGradingComplete?: () => void
}

export function BatchGradeButton({
  assignmentId,
  ungradedCount,
  onGradingComplete,
}: BatchGradeButtonProps) {
  const [isGrading, setIsGrading] = useState(false)
  const [progress, setProgress] = useState({ graded: 0, total: 0 })

  const startBatchGrading = useCallback(async () => {
    setIsGrading(true)
    setProgress({ graded: 0, total: ungradedCount })

    try {
      const response = await fetch('/api/grading/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Grading request failed' }))
        throw new Error(error.message ?? 'Grading request failed')
      }

      const result = await response.json()
      setProgress({ graded: result.graded ?? ungradedCount, total: ungradedCount })
      toast.success(`Graded ${result.graded ?? ungradedCount} submissions`)
      onGradingComplete?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start batch grading'
      toast.error(message)
    } finally {
      setIsGrading(false)
    }
  }, [assignmentId, ungradedCount, onGradingComplete])

  if (ungradedCount === 0) {
    return null
  }

  return (
    <Button
      onClick={startBatchGrading}
      disabled={isGrading}
      className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
    >
      {isGrading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Grading {progress.graded} of {progress.total}...
        </>
      ) : (
        <>
          <Zap className="size-4" />
          Grade All Ungraded ({ungradedCount})
        </>
      )}
    </Button>
  )
}
