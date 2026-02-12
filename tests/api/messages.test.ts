import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mockAuthSession,
  mockNoAuth,
  TEST_TEACHER,
  TEST_PARENT,
  createPostRequest,
} from '../helpers'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

function createChainMock(result: unknown = []) {
  const chain: Record<string, any> = {}
  const methods = [
    'select', 'from', 'leftJoin', 'innerJoin', 'where',
    'orderBy', 'limit', 'insert', 'values', 'returning',
    'update', 'set', 'delete', 'groupBy',
  ]
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain)
  }
  chain.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
    return Promise.resolve(result).then(resolve, reject)
  }
  return chain
}

let selectCallIndex = 0
let selectResults: unknown[][] = [[]]
let insertResult: unknown = []

vi.mock('@/lib/db', () => {
  return {
    db: {
      select: vi.fn(() => {
        const result = selectResults[selectCallIndex] ?? []
        selectCallIndex++
        return createChainMock(result)
      }),
      insert: vi.fn(() => createChainMock(insertResult)),
      query: {},
    },
  }
})

import { GET, POST } from '@/app/api/messages/route'
import { auth } from '@/lib/auth'

describe('Messages API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectCallIndex = 0
    selectResults = [[]]
    insertResult = []
  })

  describe('GET /api/messages', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const response = await GET()
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns messages for authenticated user with sender/receiver names', async () => {
      mockAuthSession(vi.mocked(auth), TEST_PARENT)

      const mockMessages = [
        {
          id: 'msg-1',
          senderId: TEST_PARENT.id,
          receiverId: TEST_TEACHER.id,
          subject: 'Question about homework',
          content: 'How is Aisha doing?',
          type: 'general',
          language: 'en',
          isAIGenerated: false,
          status: 'sent',
          metadata: null,
          createdAt: new Date().toISOString(),
        },
      ]

      const mockUsers = [
        { id: TEST_PARENT.id, name: 'Sarah Chen' },
        { id: TEST_TEACHER.id, name: 'Ms. Rivera' },
      ]

      // 1st select: messages query
      // 2nd select: user names lookup
      selectResults = [mockMessages, mockUsers]

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(1)
      expect(data[0].id).toBe('msg-1')
      expect(data[0].senderName).toBe('Sarah Chen')
      expect(data[0].receiverName).toBe('Ms. Rivera')
      expect(data[0].isFromMe).toBe(true)
    })

    it('returns empty array when user has no messages', async () => {
      mockAuthSession(vi.mocked(auth), TEST_PARENT)

      selectResults = [[]]

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(0)
    })

    it('marks received messages with isFromMe false', async () => {
      mockAuthSession(vi.mocked(auth), TEST_PARENT)

      const mockMessages = [
        {
          id: 'msg-2',
          senderId: TEST_TEACHER.id,
          receiverId: TEST_PARENT.id,
          subject: 'Progress update',
          content: 'Aisha is doing great!',
          type: 'progress',
          language: 'en',
          isAIGenerated: true,
          status: 'sent',
          metadata: null,
          createdAt: new Date().toISOString(),
        },
      ]

      const mockUsers = [
        { id: TEST_PARENT.id, name: 'Sarah Chen' },
        { id: TEST_TEACHER.id, name: 'Ms. Rivera' },
      ]

      selectResults = [mockMessages, mockUsers]

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data[0].isFromMe).toBe(false)
      expect(data[0].isAIGenerated).toBe(true)
    })
  })

  describe('POST /api/messages', () => {
    it('returns 401 when not authenticated', async () => {
      mockNoAuth(vi.mocked(auth))
      const req = createPostRequest('/api/messages', {
        receiverId: TEST_TEACHER.id,
        content: 'Hello',
      })

      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 400 when receiverId is missing', async () => {
      mockAuthSession(vi.mocked(auth), TEST_PARENT)
      const req = createPostRequest('/api/messages', {
        content: 'Hello',
      })

      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toContain('receiverId and content are required')
    })

    it('returns 400 when content is missing', async () => {
      mockAuthSession(vi.mocked(auth), TEST_PARENT)
      const req = createPostRequest('/api/messages', {
        receiverId: TEST_TEACHER.id,
      })

      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toContain('receiverId and content are required')
    })

    it('returns 404 when receiver does not exist', async () => {
      mockAuthSession(vi.mocked(auth), TEST_PARENT)

      // Receiver lookup returns empty
      selectResults = [[]]

      const req = createPostRequest('/api/messages', {
        receiverId: 'nonexistent-user',
        content: 'Hello',
      })

      const response = await POST(req)
      const data = await response.json()
      expect(response.status).toBe(404)
      expect(data.error).toContain('Receiver not found')
    })

    it('creates a message when request is valid', async () => {
      mockAuthSession(vi.mocked(auth), TEST_PARENT)

      // Receiver lookup finds the teacher
      selectResults = [[{ id: TEST_TEACHER.id }]]

      const createdMessage = {
        id: 'msg-new',
        senderId: TEST_PARENT.id,
        receiverId: TEST_TEACHER.id,
        subject: 'Question',
        content: 'How is Aisha doing in class?',
        type: 'general',
        isAIGenerated: false,
        status: 'sent',
        metadata: null,
        createdAt: new Date().toISOString(),
      }
      insertResult = [createdMessage]

      const req = createPostRequest('/api/messages', {
        receiverId: TEST_TEACHER.id,
        subject: 'Question',
        content: 'How is Aisha doing in class?',
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe('msg-new')
      expect(data.senderId).toBe(TEST_PARENT.id)
      expect(data.receiverId).toBe(TEST_TEACHER.id)
      expect(data.status).toBe('sent')
    })

    it('creates a message with AI-generated flag and metadata', async () => {
      mockAuthSession(vi.mocked(auth), TEST_TEACHER)

      selectResults = [[{ id: TEST_PARENT.id }]]

      const createdMessage = {
        id: 'msg-ai',
        senderId: TEST_TEACHER.id,
        receiverId: TEST_PARENT.id,
        subject: 'Weekly Progress',
        content: 'AI-generated progress summary for Aisha.',
        type: 'progress',
        isAIGenerated: true,
        status: 'sent',
        metadata: JSON.stringify({ source: 'weekly_digest' }),
        createdAt: new Date().toISOString(),
      }
      insertResult = [createdMessage]

      const req = createPostRequest('/api/messages', {
        receiverId: TEST_PARENT.id,
        subject: 'Weekly Progress',
        content: 'AI-generated progress summary for Aisha.',
        type: 'progress',
        isAIGenerated: true,
        metadata: { source: 'weekly_digest' },
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe('msg-ai')
      expect(data.isAIGenerated).toBe(true)
      expect(data.type).toBe('progress')
    })
  })
})
