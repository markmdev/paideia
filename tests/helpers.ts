import type { Mock } from 'vitest'

/**
 * Sets up a mocked auth function to return an authenticated session.
 */
export function mockAuthSession(
  authFn: Mock,
  user: {
    id: string
    role: string
    email: string
    name: string
  }
) {
  authFn.mockResolvedValue({ user })
}

/**
 * Sets up a mocked auth function to return null (unauthenticated).
 */
export function mockNoAuth(authFn: Mock) {
  authFn.mockResolvedValue(null)
}

export const TEST_TEACHER = {
  id: 'teacher-001',
  role: 'teacher',
  email: 'rivera@school.edu',
  name: 'Ms. Rivera',
}

export const TEST_STUDENT = {
  id: 'student-001',
  role: 'student',
  email: 'aisha@student.edu',
  name: 'Aisha Torres',
}

export const TEST_PARENT = {
  id: 'parent-001',
  role: 'parent',
  email: 'sarah.chen@email.com',
  name: 'Sarah Chen',
}

export const TEST_ADMIN = {
  id: 'admin-001',
  role: 'admin',
  email: 'admin@school.edu',
  name: 'Admin User',
}

export const TEST_SPED_TEACHER = {
  id: 'sped-001',
  role: 'sped_teacher',
  email: 'rodriguez@school.edu',
  name: 'Ms. Rodriguez',
}

/**
 * Creates a mock Request object with the given URL and options.
 */
export function createRequest(
  url: string,
  options?: RequestInit
): Request {
  return new Request(url, options)
}

/**
 * Creates a GET request with optional search params.
 */
export function createGetRequest(
  path: string,
  params?: Record<string, string>
): Request {
  const url = new URL(path, 'http://localhost:3000')
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
  }
  return new Request(url.toString())
}

/**
 * Creates a POST request with JSON body.
 */
export function createPostRequest(
  path: string,
  body: unknown
): Request {
  return new Request(`http://localhost:3000${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
