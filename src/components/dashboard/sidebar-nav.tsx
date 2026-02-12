'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  GraduationCap,
  FileText,
  BookOpen,
  ClipboardList,
  BarChart3,
  Users,
  MessageSquare,
  TrendingUp,
  ShieldCheck,
  School,
  UserCheck,
  Bot,
  Building2,
  type LucideIcon,
} from 'lucide-react'
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'

interface NavItem {
  title: string
  href: string
  icon: LucideIcon
}

interface NavGroup {
  label: string
  items: NavItem[]
}

function getNavGroups(role: string): NavGroup[] {
  const teacherGroups: NavGroup[] = [
    {
      label: 'Overview',
      items: [
        { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { title: 'My Classes', href: '/dashboard/classes', icon: GraduationCap },
      ],
    },
    {
      label: 'Instructional Design',
      items: [
        { title: 'Assignments', href: '/dashboard/assignments', icon: FileText },
        { title: 'Lesson Plans', href: '/dashboard/lesson-plans', icon: BookOpen },
        { title: 'Rubrics', href: '/dashboard/rubrics', icon: ClipboardList },
      ],
    },
    {
      label: 'Assessment',
      items: [
        { title: 'Assessment & Grading', href: '/dashboard/grading', icon: BarChart3 },
        { title: 'Reports', href: '/dashboard/reports', icon: TrendingUp },
        { title: 'Report Cards', href: '/dashboard/report-cards', icon: FileText },
      ],
    },
  ]

  const spedTeacherGroups: NavGroup[] = [
    ...teacherGroups,
    {
      label: 'Special Education',
      items: [
        { title: 'IEP Management', href: '/dashboard/iep', icon: ShieldCheck },
        { title: 'Progress Monitoring', href: '/dashboard/progress-monitoring', icon: TrendingUp },
        { title: 'Compliance', href: '/dashboard/compliance', icon: UserCheck },
      ],
    },
  ]

  const parentGroups: NavGroup[] = [
    {
      label: 'Overview',
      items: [
        { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { title: 'My Children', href: '/dashboard/children', icon: Users },
      ],
    },
    {
      label: 'Engagement',
      items: [
        { title: 'Progress', href: '/dashboard/progress', icon: TrendingUp },
        { title: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
      ],
    },
  ]

  const studentGroups: NavGroup[] = [
    {
      label: 'Overview',
      items: [
        { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { title: 'My Classes', href: '/dashboard/classes', icon: GraduationCap },
      ],
    },
    {
      label: 'Learning',
      items: [
        { title: 'Assignments', href: '/dashboard/assignments', icon: FileText },
        { title: 'AI Tutor', href: '/dashboard/tutor', icon: Bot },
        { title: 'Progress', href: '/dashboard/progress', icon: TrendingUp },
      ],
    },
  ]

  const adminGroups: NavGroup[] = [
    {
      label: 'Overview',
      items: [
        { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      label: 'Management',
      items: [
        { title: 'Schools', href: '/dashboard/schools', icon: Building2 },
        { title: 'Teachers', href: '/dashboard/teachers', icon: Users },
        { title: 'Students', href: '/dashboard/students', icon: GraduationCap },
      ],
    },
    {
      label: 'Intelligence',
      items: [
        { title: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
        { title: 'SPED Compliance', href: '/dashboard/compliance', icon: ShieldCheck },
      ],
    },
  ]

  switch (role) {
    case 'sped_teacher':
      return spedTeacherGroups
    case 'parent':
      return parentGroups
    case 'student':
      return studentGroups
    case 'admin':
    case 'district_admin':
      return adminGroups
    default:
      return teacherGroups
  }
}

export function SidebarNav({ role }: { role: string }) {
  const pathname = usePathname()
  const groups = getNavGroups(role)

  return (
    <SidebarContent>
      {groups.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive = item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href)

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </SidebarContent>
  )
}
