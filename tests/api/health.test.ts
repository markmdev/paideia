import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    execute: vi.fn(),
  },
}))

import { GET } from '@/app/api/health/route'
import { db } from '@/lib/db'

describe('Health API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with healthy status when database is connected', async () => {
    vi.mocked(db.execute).mockResolvedValue([] as any)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('healthy')
    expect(data.database).toBe('connected')
    expect(data.version).toBe('0.1.0')
    expect(data.timestamp).toBeDefined()
  })

  it('returns 500 with unhealthy status when database fails', async () => {
    vi.mocked(db.execute).mockRejectedValue(new Error('Connection refused'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.status).toBe('unhealthy')
    expect(data.error).toContain('Connection refused')
  })
})
