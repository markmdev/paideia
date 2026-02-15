'use client'

import { BookOpen } from 'lucide-react'
import Link from 'next/link'
import {
  Sidebar,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SidebarRail,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { SidebarNav } from '@/components/dashboard/sidebar-nav'
import { UserMenu } from '@/components/dashboard/user-menu'
import { Badge } from '@/components/ui/badge'

const roleLabels: Record<string, string> = {
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent',
  sped_teacher: 'SPED Teacher',
  admin: 'Admin',
  district_admin: 'District Admin',
}

interface DashboardShellProps {
  user: {
    id: string
    name?: string | null
    email?: string | null
    role: string
  }
  children: React.ReactNode
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-2 py-1.5"
          >
            <BookOpen className="size-5 shrink-0 text-primary" />
            <span className="font-semibold text-sm group-data-[collapsible=icon]:hidden">
              Paideia
            </span>
          </Link>
        </SidebarHeader>
        <SidebarNav role={user.role} />
        <SidebarFooter>
          <div className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:justify-center">
            <div className="flex flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
              <span className="text-xs font-medium truncate">{user.name}</span>
              <span className="text-xs text-muted-foreground truncate">{user.email}</span>
            </div>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {roleLabels[user.role] ?? user.role}
              </Badge>
            </div>
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
