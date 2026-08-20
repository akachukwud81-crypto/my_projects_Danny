export type HabitPeriod = 'daily' | 'weekly' | 'monthly'

export type Habit = {
  id: string
  name: string
  category: string
  color: string
  icon: string
  target: number
  period: HabitPeriod
  reminder: string
  completions: string[]
  createdAt: string
}

export type HabitDraft = Omit<Habit, 'id' | 'completions' | 'createdAt'>

export type AppView = 'dashboard' | 'insights' | 'history' | 'settings'
