'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export function LessonPlanActions({ planId }: { planId: string }) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/lesson-plans/${planId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete lesson plan')
      }

      toast.success('Lesson plan deleted.')
      router.push('/dashboard/lesson-plans')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete lesson plan.'
      )
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push(`/dashboard/lesson-plans/${planId}/edit`)}
      >
        <Pencil className="size-4 mr-1" />
        Edit
      </Button>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
            <Trash2 className="size-4 mr-1" />
            Delete
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete lesson plan?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The lesson plan will be permanently
              removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 mr-1 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
