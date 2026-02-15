import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getBaseUrl } from '@/lib/url'
import { Building2, Users, GraduationCap, BookOpen, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface SchoolData {
  id: string
  name: string
  district: string | null
  address: string | null
  classCount: number
  teacherCount: number
  studentCount: number
  assignmentCount: number
  avgScore: number | null
}

const plural = (n: number, word: string, pluralForm?: string) =>
  `${n} ${n === 1 ? word : (pluralForm ?? word + 's')}`

export default async function SchoolsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  if (session.user.role !== 'admin' && session.user.role !== 'district_admin') {
    redirect('/dashboard')
  }

  const baseUrl = await getBaseUrl()
  const cookieStore = await cookies()
  const res = await fetch(`${baseUrl}/api/admin/schools`, {
    headers: { cookie: cookieStore.toString() },
    cache: 'no-store',
  })

  const data: { schools: SchoolData[] } = res.ok
    ? await res.json()
    : { schools: [] }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
          Schools
        </h1>
        <p className="text-stone-500 text-sm mt-1">
          Manage schools and view building-level performance metrics.
        </p>
      </div>

      {data.schools.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-amber-50 p-6 mb-4">
            <Building2 className="size-10 text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-stone-800 mb-1">
            No schools found
          </h3>
          <p className="text-sm text-stone-500 max-w-md">
            Schools will appear here once they are added to the district.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.schools.map((school) => (
            <Link
              key={school.id}
              href={`/dashboard/schools/${school.id}`}
            >
              <Card className="group relative overflow-hidden transition-all hover:shadow-md hover:border-amber-200 cursor-pointer h-full bg-stone-50/50">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="rounded-md bg-amber-50 p-1.5">
                        <Building2 className="size-4 text-amber-600" />
                      </div>
                      <CardTitle className="text-sm font-semibold leading-tight text-stone-900">
                        {school.name}
                      </CardTitle>
                    </div>
                    {school.avgScore !== null && (
                      <Badge className="shrink-0 text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 border-0">
                        {Math.round(school.avgScore)}% avg
                      </Badge>
                    )}
                  </div>
                  {school.address && (
                    <p className="text-xs text-stone-500 mt-1">{school.address}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div className="flex items-center gap-1.5 text-stone-600">
                      <Users className="size-3 text-stone-400" />
                      <span>{plural(school.teacherCount, 'Teacher')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-stone-600">
                      <GraduationCap className="size-3 text-stone-400" />
                      <span>{plural(school.studentCount, 'Student')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-stone-600">
                      <BookOpen className="size-3 text-stone-400" />
                      <span>{plural(school.classCount, 'Class', 'Classes')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-stone-600">
                      <FileText className="size-3 text-stone-400" />
                      <span>{plural(school.assignmentCount, 'Assignment')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
