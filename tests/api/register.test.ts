import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPostRequest } from '../helpers'

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password_123'),
  },
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

let findFirstResult: unknown = undefined
let insertResult: unknown = []

vi.mock('@/lib/db', () => {
  return {
    db: {
      select: vi.fn(() => createChainMock([])),
      insert: vi.fn(() => createChainMock(insertResult)),
      query: {
        users: {
          findFirst: vi.fn(() => Promise.resolve(findFirstResult)),
        },
      },
    },
  }
})

import { POST } from '@/app/api/auth/register/route'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

describe('Register API - POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    findFirstResult = undefined
    insertResult = []
  })

  it('returns 201 with user data on successful registration', async () => {
    findFirstResult = undefined

    const createdUser = {
      id: 'new-user-id',
      name: 'Test User',
      email: 'test@example.com',
      role: 'teacher',
    }
    insertResult = [createdUser]

    const req = createPostRequest('/api/auth/register', {
      name: 'Test User',
      email: 'test@example.com',
      password: 'securepassword',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.id).toBe('new-user-id')
    expect(data.name).toBe('Test User')
    expect(data.email).toBe('test@example.com')
    expect(data.role).toBe('teacher')
  })

  it('returns 400 when required fields are missing', async () => {
    const cases = [
      { email: 'test@example.com', password: 'password123' },
      { name: 'Test', password: 'password123' },
      { name: 'Test', email: 'test@example.com' },
      {},
    ]

    for (const body of cases) {
      const req = createPostRequest('/api/auth/register', body)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing required fields')
    }
  })

  it('returns 400 when password is shorter than 6 characters', async () => {
    const req = createPostRequest('/api/auth/register', {
      name: 'Test User',
      email: 'test@example.com',
      password: '12345',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Password must be at least 6 characters')
  })

  it('returns 409 when email is already registered', async () => {
    findFirstResult = {
      id: 'existing-user',
      email: 'taken@example.com',
    }

    const req = createPostRequest('/api/auth/register', {
      name: 'Test User',
      email: 'taken@example.com',
      password: 'password123',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toBe('Email already registered')
  })

  it('always assigns role "teacher" even when admin role is requested', async () => {
    findFirstResult = undefined

    const createdUser = {
      id: 'new-user-id',
      name: 'Sneaky Admin',
      email: 'hacker@example.com',
      role: 'teacher',
    }
    insertResult = [createdUser]

    const req = createPostRequest('/api/auth/register', {
      name: 'Sneaky Admin',
      email: 'hacker@example.com',
      password: 'password123',
      role: 'admin',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.role).toBe('teacher')

    // Verify the insert was called with role hardcoded to 'teacher'
    expect(db.insert).toHaveBeenCalled()
    const insertChain = (db.insert as any).mock.results[0].value
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'teacher' })
    )
  })

  it('does not include passwordHash in the response', async () => {
    findFirstResult = undefined

    const createdUser = {
      id: 'new-user-id',
      name: 'Test User',
      email: 'test@example.com',
      role: 'teacher',
      passwordHash: 'hashed_password_123',
    }
    insertResult = [createdUser]

    const req = createPostRequest('/api/auth/register', {
      name: 'Test User',
      email: 'test@example.com',
      password: 'securepassword',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.passwordHash).toBeUndefined()
    expect(data.password).toBeUndefined()
    expect(Object.keys(data)).toEqual(['id', 'name', 'email', 'role'])
  })

  it('hashes the password with bcrypt before storing', async () => {
    findFirstResult = undefined

    const createdUser = {
      id: 'new-user-id',
      name: 'Test User',
      email: 'test@example.com',
      role: 'teacher',
    }
    insertResult = [createdUser]

    const req = createPostRequest('/api/auth/register', {
      name: 'Test User',
      email: 'test@example.com',
      password: 'mypassword',
    })

    await POST(req)

    expect(bcrypt.hash).toHaveBeenCalledWith('mypassword', 12)
    const insertChain = (db.insert as any).mock.results[0].value
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: 'hashed_password_123' })
    )
  })
})
