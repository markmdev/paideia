import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { translateCommunication } from '@/lib/ai/parent-communication'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { text, targetLanguage } = body

    if (!text || !targetLanguage) {
      return NextResponse.json(
        { error: 'text and targetLanguage are required' },
        { status: 400 }
      )
    }

    const result = await translateCommunication({ text, targetLanguage })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to translate:', error)
    return NextResponse.json(
      { error: 'Failed to translate message' },
      { status: 500 }
    )
  }
}
