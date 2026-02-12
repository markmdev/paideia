import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { auth } from '@/lib/auth'
import { Users } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface TeacherData {
  id: string
  name: string | null
  email: string | null
  role: string
  school: string | null
  classesTaught: number
  assignmentsCreated: number
  submissionsGraded: number
  feedbackDraftsCreated: number
}

export default async function TeachersPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  if (session.user.role !== 'admin' && session.user.role !== 'district_admin') {
    redirect('/dashboard')
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const cookieStore = await cookies()
  const res = await fetch(`${baseUrl}/api/admin/teachers`, {
    headers: { cookie: cookieStore.toString() },
    cache: 'no-store',
  })

  const data: { teachers: TeacherData[] } = res.ok
    ? await res.json()
    : { teachers: [] }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
          Teacher Engagement
        </h1>
        <p className="text-stone-500 text-sm mt-1">
          Monitor teacher platform usage and AI feature adoption.
        </p>
      </div>

      {data.teachers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-amber-50 p-6 mb-4">
            <Users className="size-10 text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-stone-800 mb-1">
            No teachers found
          </h3>
          <p className="text-sm text-stone-500 max-w-md">
            Teachers will appear here once they join the platform.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-stone-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-stone-50">
                <TableHead className="text-stone-600">Name</TableHead>
                <TableHead className="text-stone-600">Email</TableHead>
                <TableHead className="text-stone-600 text-center">Classes</TableHead>
                <TableHead className="text-stone-600 text-center">Assignments Created</TableHead>
                <TableHead className="text-stone-600 text-center">Submissions Graded</TableHead>
                <TableHead className="text-stone-600 text-center">AI Feedback Generated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.teachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-stone-900">
                        {teacher.name || 'Unknown'}
                      </span>
                      {teacher.role === 'sped_teacher' && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-violet-100 text-violet-700 border-0">
                          SPED
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-stone-600">
                    {teacher.email}
                  </TableCell>
                  <TableCell className="text-center text-stone-600">
                    {teacher.classesTaught}
                  </TableCell>
                  <TableCell className="text-center text-stone-600">
                    {teacher.assignmentsCreated}
                  </TableCell>
                  <TableCell className="text-center text-stone-600">
                    {teacher.submissionsGraded}
                  </TableCell>
                  <TableCell className="text-center">
                    {teacher.feedbackDraftsCreated > 0 ? (
                      <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-0">
                        {teacher.feedbackDraftsCreated}
                      </Badge>
                    ) : (
                      <span className="text-stone-400">0</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
