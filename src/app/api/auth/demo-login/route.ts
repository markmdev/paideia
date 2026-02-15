import { NextRequest, NextResponse } from 'next/server'
import { DEMO_ENTRY_EMAILS } from '@/lib/demo-constants'
import { cloneDemoData, cleanupExpiredDemoSessions } from '@/lib/demo-clone'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || !DEMO_ENTRY_EMAILS.has(email)) {
      return NextResponse.json(
        { error: 'Invalid demo email' },
        { status: 400 }
      )
    }

    // Fire-and-forget cleanup of expired sessions
    cleanupExpiredDemoSessions().catch(console.error)

    const result = await cloneDemoData(email)

    return NextResponse.json({ email: result.email })
  } catch (error) {
    console.error('Demo login failed:', error)
    return NextResponse.json(
      { error: 'Failed to create demo session' },
      { status: 500 }
    )
  }
}
