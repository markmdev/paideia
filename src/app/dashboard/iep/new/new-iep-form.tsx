'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface NewIepFormProps {
  students: { id: string; name: string }[]
  teacherId: string
}

const DISABILITY_CATEGORIES = [
  'Specific Learning Disability',
  'Speech or Language Impairment',
  'Other Health Impairment',
  'Autism',
  'Emotional Disturbance',
  'Intellectual Disability',
  'Developmental Delay',
  'Multiple Disabilities',
  'Hearing Impairment',
  'Orthopedic Impairment',
  'Visual Impairment',
  'Traumatic Brain Injury',
  'Deaf-Blindness',
]

export function NewIepForm({ students, teacherId }: NewIepFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const studentId = formData.get('studentId') as string
    const disabilityCategory = formData.get('disabilityCategory') as string
    const startDate = formData.get('startDate') as string
    const endDate = formData.get('endDate') as string

    try {
      const res = await fetch('/api/iep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          disabilityCategory,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to create IEP')
      }

      const iep = await res.json()
      router.push(`/dashboard/iep/${iep.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="studentId">Student</Label>
        <select
          id="studentId"
          name="studentId"
          required
          className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">Select a student</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="disabilityCategory">Disability Category</Label>
        <select
          id="disabilityCategory"
          name="disabilityCategory"
          required
          className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">Select category</option>
          {DISABILITY_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input id="startDate" name="startDate" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <Input id="endDate" name="endDate" type="date" />
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Creating...' : 'Create IEP'}
      </Button>
    </form>
  )
}
