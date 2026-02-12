export function formatGradeLevel(grade: string | number | null): string {
  if (!grade) return 'N/A'
  const n = typeof grade === 'string' ? parseInt(grade, 10) : grade
  if (isNaN(n)) return String(grade)
  const suffixes: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' }
  const suffix = (n % 100 >= 11 && n % 100 <= 13) ? 'th' : (suffixes[n % 10] || 'th')
  return `${n}${suffix} Grade`
}
