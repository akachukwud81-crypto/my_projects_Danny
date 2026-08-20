import type { Habit } from '../types'
import { addDays, dateKey, uid } from './utils'

const HABITS_KEY = 'ritual-habits-v1'
const THEME_KEY = 'ritual-theme-v1'

const seededCompletions = (offsets: number[]) => offsets.map((offset) => dateKey(addDays(new Date(), offset)))

export const defaultHabits: Habit[] = [
  {
    id: uid(),
    name: 'Morning meditation',
    category: 'Mindfulness',
    color: '#7C6FF2',
    icon: 'sparkles',
    target: 1,
    period: 'daily',
    reminder: '7:30 AM',
    completions: seededCompletions([-8, -7, -6, -5, -4, -3, -2, -1, 0]),
    createdAt: new Date().toISOString(),
  },
  {
    id: uid(),
    name: 'Deep work session',
    category: 'Productivity',
    color: '#EA7D55',
    icon: 'focus',
    target: 5,
    period: 'weekly',
    reminder: '9:00 AM',
    completions: seededCompletions([-11, -9, -7, -4, -2, -1]),
    createdAt: new Date().toISOString(),
  },
  {
    id: uid(),
    name: 'Move for 30 minutes',
    category: 'Health',
    color: '#36A987',
    icon: 'activity',
    target: 5,
    period: 'weekly',
    reminder: '5:30 PM',
    completions: seededCompletions([-10, -8, -5, -3, -2, 0]),
    createdAt: new Date().toISOString(),
  },
  {
    id: uid(),
    name: 'Read 20 pages',
    category: 'Learning',
    color: '#E6AE45',
    icon: 'book',
    target: 1,
    period: 'daily',
    reminder: '9:30 PM',
    completions: seededCompletions([-12, -11, -8, -7, -6, -4, -3, -1]),
    createdAt: new Date().toISOString(),
  },
]

const isHabit = (value: unknown): value is Habit => {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<Habit>
  return Boolean(
    typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      typeof item.category === 'string' &&
      typeof item.color === 'string' &&
      typeof item.target === 'number' &&
      ['daily', 'weekly', 'monthly'].includes(item.period ?? '') &&
      Array.isArray(item.completions) &&
      item.completions.every((entry) => typeof entry === 'string'),
  )
}

export const loadHabits = (): Habit[] => {
  try {
    const stored = localStorage.getItem(HABITS_KEY)
    if (!stored) return defaultHabits
    const parsed: unknown = JSON.parse(stored)
    return Array.isArray(parsed) && parsed.every(isHabit) ? parsed : defaultHabits
  } catch {
    return defaultHabits
  }
}

export const saveHabits = (habits: Habit[]) => {
  localStorage.setItem(HABITS_KEY, JSON.stringify(habits))
}

export const parseHabitImport = (text: string): Habit[] => {
  const parsed: unknown = JSON.parse(text)
  if (!Array.isArray(parsed) || !parsed.every(isHabit)) {
    throw new Error('This file does not contain a valid Ritual habit backup.')
  }
  return parsed
}

export const loadTheme = () => localStorage.getItem(THEME_KEY) === 'dark'
export const saveTheme = (dark: boolean) => localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light')
