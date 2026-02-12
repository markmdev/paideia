'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Loader2, CheckCircle2, AlertCircle, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface BatchResult {
  studentId: string
  studentName: string
  status: 'generated' | 'skipped' | 'error'
}

interface BatchResponse {
  generated: number
  skipped: number
  total: number
  reportCards: BatchResult[]
}

type DialogState =
  | { step: 'form' }
  | { step: 'generating'; completed: number; total: number }
  | { step: 'done'; result: BatchResponse }
  | { step: 'error'; message: string }

export function BatchGenerateDialog({
  classId,
  className,
  studentCount,
}: {
  classId: string
  className: string
  studentCount: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [gradingPeriod, setGradingPeriod] = useState('Q2 2025-2026')
  const [state, setState] = useState<DialogState>({ step: 'form' })

  async function handleGenerate() {
    if (!gradingPeriod.trim()) return

    setState({ step: 'generating', completed: 0, total: studentCount })

    try {
      const res = await fetch('/api/report-cards/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId, gradingPeriod: gradingPeriod.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        setState({ step: 'error', message: data.error ?? 'Failed to generate report cards' })
        return
      }

      const result: BatchResponse = await res.json()
      setState({ step: 'done', result })
      router.refresh()
    } catch {
      setState({ step: 'error', message: 'Network error. Please try again.' })
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      // Reset state when closing
      setState({ step: 'form' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
          onClick={(e) => e.stopPropagation()}
        >
          <FileText className="size-3.5" />
          Generate All
        </Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {state.step === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle>Generate Report Cards</DialogTitle>
              <DialogDescription>
                Generate AI-powered narrative report cards for all {studentCount} students in {className}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="grading-period">Grading Period</Label>
                <Input
                  id="grading-period"
                  value={gradingPeriod}
                  onChange={(e) => setGradingPeriod(e.target.value)}
                  placeholder="e.g., Q2 2025-2026"
                />
                <p className="text-xs text-stone-500">
                  Students who already have a report card for this period will be skipped.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!gradingPeriod.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Generate Report Cards
              </Button>
            </DialogFooter>
          </>
        )}

        {state.step === 'generating' && (
          <>
            <DialogHeader>
              <DialogTitle>Generating Report Cards</DialogTitle>
              <DialogDescription>
                Processing {studentCount} students in {className}. This may take a few minutes.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 className="size-10 text-amber-500 animate-spin" />
              <p className="text-sm text-stone-600">
                Generating report cards...
              </p>
              <div className="w-full rounded-full bg-stone-100 h-2">
                <div
                  className="rounded-full bg-amber-500 h-2 transition-all duration-500"
                  style={{ width: '100%' }}
                />
              </div>
              <p className="text-xs text-stone-500">
                Please do not close this dialog.
              </p>
            </div>
          </>
        )}

        {state.step === 'done' && (
          <>
            <DialogHeader>
              <DialogTitle>Report Cards Complete</DialogTitle>
              <DialogDescription>
                Batch generation for {className} is finished.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-emerald-50 p-3">
                  <p className="text-2xl font-bold text-emerald-700">{state.result.generated}</p>
                  <p className="text-xs text-emerald-600">Generated</p>
                </div>
                <div className="rounded-lg bg-stone-50 p-3">
                  <p className="text-2xl font-bold text-stone-600">{state.result.skipped}</p>
                  <p className="text-xs text-stone-500">Skipped</p>
                </div>
                <div className="rounded-lg bg-red-50 p-3">
                  <p className="text-2xl font-bold text-red-600">
                    {state.result.total - state.result.generated - state.result.skipped}
                  </p>
                  <p className="text-xs text-red-500">Errors</p>
                </div>
              </div>

              {state.result.reportCards.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-stone-200">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-stone-50 border-b border-stone-200">
                        <th className="text-left px-3 py-1.5 font-medium text-stone-600">Student</th>
                        <th className="text-left px-3 py-1.5 font-medium text-stone-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.result.reportCards.map((rc) => (
                        <tr key={rc.studentId} className="border-b border-stone-100 last:border-0">
                          <td className="px-3 py-1.5 text-stone-700">{rc.studentName}</td>
                          <td className="px-3 py-1.5">
                            {rc.status === 'generated' && (
                              <span className="inline-flex items-center gap-1 text-emerald-600">
                                <CheckCircle2 className="size-3" />
                                Generated
                              </span>
                            )}
                            {rc.status === 'skipped' && (
                              <span className="inline-flex items-center gap-1 text-stone-500">
                                <SkipForward className="size-3" />
                                Skipped
                              </span>
                            )}
                            {rc.status === 'error' && (
                              <span className="inline-flex items-center gap-1 text-red-600">
                                <AlertCircle className="size-3" />
                                Error
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        )}

        {state.step === 'error' && (
          <>
            <DialogHeader>
              <DialogTitle>Generation Failed</DialogTitle>
              <DialogDescription>
                An error occurred while generating report cards.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-3 py-6">
              <AlertCircle className="size-10 text-red-400" />
              <p className="text-sm text-red-600 text-center">{state.message}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
              <Button onClick={() => setState({ step: 'form' })}>
                Try Again
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
