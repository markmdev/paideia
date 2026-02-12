import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import {
  TeacherDashboard,
  StudentDashboard,
  ParentDashboard,
  AdminDashboard,
} from '@/components/dashboard/role-dashboards'

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const { role, name } = session.user
  const firstName = name?.split(' ')[0] ?? 'there'

  switch (role) {
    case 'student':
      return <StudentDashboard firstName={firstName} />
    case 'parent':
      return <ParentDashboard firstName={firstName} />
    case 'admin':
    case 'district_admin':
      return <AdminDashboard firstName={firstName} />
    case 'teacher':
    case 'sped_teacher':
    default:
      return <TeacherDashboard firstName={firstName} role={role} />
  }
}
