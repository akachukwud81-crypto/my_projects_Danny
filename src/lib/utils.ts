import type { Habit } from '../types'

export const dateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const fromDateKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export const addDays = (date: Date, amount: number) => {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

export const startOfWeek = (date: Date) => {
  const result = new Date(date)
  const day = result.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return addDays(result, diff)
}

export const getWeekDates = (date: Date) => {
  const start = startOfWeek(date)
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

export const getTrailingDates = (amount: number, end = new Date()) =>
  Array.from({ length: amount }, (_, index) => addDays(end, index - amount + 1))

export const formatShortDate = (date: Date) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)

export const calculateStreak = (habit: Habit, end = new Date()) => {
  const completionSet = new Set(habit.completions)
  let cursor = new Date(end)
  let streak = 0

  if (!completionSet.has(dateKey(cursor))) cursor = addDays(cursor, -1)
  while (completionSet.has(dateKey(cursor))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

export const longestStreak = (habit: Habit) => {
  if (!habit.completions.length) return 0
  const sorted = [...new Set(habit.completions)].sort()
  let current = 1
  let longest = 1
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = fromDateKey(sorted[index - 1])
    const currentDate = fromDateKey(sorted[index])
    const difference = Math.round((currentDate.getTime() - previous.getTime()) / 86400000)
    current = difference === 1 ? current + 1 : 1
    longest = Math.max(longest, current)
  }
  return longest
}

export const currentPeriodCount = (habit: Habit, reference = new Date()) => {
  if (habit.period === 'daily') return habit.completions.includes(dateKey(reference)) ? 1 : 0

  if (habit.period === 'weekly') {
    const week = new Set(getWeekDates(reference).map(dateKey))
    return habit.completions.filter((entry) => week.has(entry)).length
  }

  return habit.completions.filter((entry) => {
    const date = fromDateKey(entry)
    return date.getMonth() === reference.getMonth() && date.getFullYear() === reference.getFullYear()
  }).length
}

export const progressForHabit = (habit: Habit, reference = new Date()) =>
  Math.min(100, Math.round((currentPeriodCount(habit, reference) / habit.target) * 100))

export const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ')
