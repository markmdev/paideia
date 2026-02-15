import { headers } from 'next/headers'

export async function getBaseUrl(): Promise<string> {
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const proto = headersList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}
