import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { auth } from '@/lib/auth'
import { getBaseUrl } from '@/lib/url'
import { GraduationCap } from 'lucide-react'
import { StudentTable } from '@/components/admin/student-table'

interface StudentData {
  id: string
  name: string | null
  email: string
  gradeLevel: string | null
  classesEnrolled: number
  avgScore: number | null
  mastery: Record<string, number>
}

export default async function StudentsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  if (session.user.role !== 'admin' && session.user.role !== 'district_admin') {
    redirect('/dashboard')
  }

  const baseUrl = await getBaseUrl()
  const cookieStore = await cookies()
  const res = await fetch(`${baseUrl}/api/admin/students`, {
    headers: { cookie: cookieStore.toString() },
    cache: 'no-store',
  })

  const data: { students: StudentData[] } = res.ok
    ? await res.json()
    : { students: [] }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
          Students
        </h1>
        <p className="text-stone-500 text-sm mt-1">
          Student directory with performance metrics and standards mastery overview.
        </p>
      </div>

      {data.students.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-amber-50 p-6 mb-4">
            <GraduationCap className="size-10 text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-stone-800 mb-1">
            No students found
          </h3>
          <p className="text-sm text-stone-500 max-w-md">
            Students will appear here once they are enrolled in the platform.
          </p>
        </div>
      ) : (
        <StudentTable students={data.students} />
      )}
    </div>
  )
}
