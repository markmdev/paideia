import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatGradeLevel(gradeLevel: string): string {
  if (/grade/i.test(gradeLevel)) return gradeLevel
  const num = parseInt(gradeLevel, 10)
  if (isNaN(num)) return `${gradeLevel} Grade`
  const suffix =
    num === 1 ? 'st' :
    num === 2 ? 'nd' :
    num === 3 ? 'rd' :
    'th'
  return `${num}${suffix} Grade`
}
