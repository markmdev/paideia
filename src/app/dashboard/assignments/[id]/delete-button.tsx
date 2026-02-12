'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DeleteAssignmentButtonProps {
  assignmentId: string
}

export function DeleteAssignmentButton({
  assignmentId,
}: DeleteAssignmentButtonProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        router.push('/dashboard/assignments')
        router.refresh()
      }
    } catch {
      // Silently handle -- user can retry
    } finally {
      setIsDeleting(false)
      setConfirmOpen(false)
    }
  }

  if (confirmOpen) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Delete?</span>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
          className="gap-1"
        >
          {isDeleting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Trash2 className="size-3.5" />
          )}
          Confirm
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirmOpen(false)}
          disabled={isDeleting}
        >
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setConfirmOpen(true)}
      className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
    >
      <Trash2 className="size-3.5" />
      Delete
    </Button>
  )
}
