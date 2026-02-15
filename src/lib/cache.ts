import { db } from '@/lib/db'
import { cacheEntries } from '@/lib/db/schema'
import { eq, lte } from 'drizzle-orm'

export async function getCached<T>(key: string): Promise<T | null> {
  const [row] = await db
    .select({ value: cacheEntries.value, expiresAt: cacheEntries.expiresAt })
    .from(cacheEntries)
    .where(eq(cacheEntries.key, key))

  if (!row) return null

  if (row.expiresAt <= new Date()) {
    await db.delete(cacheEntries).where(eq(cacheEntries.key, key))
    return null
  }

  return JSON.parse(row.value) as T
}

export async function setCache(key: string, value: unknown, ttlMs: number): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlMs)
  const jsonValue = JSON.stringify(value)

  // Upsert: insert or update on conflict
  await db
    .insert(cacheEntries)
    .values({ key, value: jsonValue, expiresAt })
    .onConflictDoUpdate({
      target: cacheEntries.key,
      set: { value: jsonValue, expiresAt, createdAt: new Date() },
    })
}

export async function cleanExpiredCache(): Promise<void> {
  await db.delete(cacheEntries).where(lte(cacheEntries.expiresAt, new Date()))
}
