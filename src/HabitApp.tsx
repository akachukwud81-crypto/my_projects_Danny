import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import {
  Activity, Archive, BarChart3, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight,
  ClipboardCheck, CloudSun, Code2, Copy, Download, Flame, Focus, Gauge, Home, Leaf, Menu,
  Moon, MoreHorizontal, Pencil, Plus, Search, Settings, Sparkles, Sun, Target, Trash2,
  TrendingUp, Upload, X, Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { AppView, Habit, HabitDraft, HabitPeriod } from './types'
import { buildPrompt } from './lib/buildPrompt'
import { defaultHabits, loadHabits, loadTheme, parseHabitImport, saveHabits, saveTheme } from './lib/storage'
import {
  addDays, calculateStreak, cn, currentPeriodCount, dateKey, formatShortDate, fromDateKey,
  getTrailingDates, getWeekDates, longestStreak, progressForHabit, uid,
} from './lib/utils'

const iconMap: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  focus: Focus,
  activity: Activity,
  book: BookOpen,
  leaf: Leaf,
  target: Target,
}

const navItems: Array<{ id: AppView; label: string; icon: LucideIcon }> = [
  { id: 'dashboard', label: 'Today', icon: Home },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
  { id: 'history', label: 'History', icon: CalendarDays },
  { id: 'settings', label: 'Settings', icon: Settings },
]

const categoryColors: Record<string, string> = {
  Mindfulness: '#7C6FF2',
  Productivity: '#EA7D55',
  Health: '#36A987',
  Learning: '#E6AE45',
}

const emptyDraft: HabitDraft = {
  name: '', category: 'Mindfulness', color: '#7C6FF2', icon: 'sparkles', target: 1, period: 'daily', reminder: '',
}

type Toast = { id: string; message: string; action?: { label: string; run: () => void } }

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function HabitApp() {
  const [habits, setHabits] = useState<Habit[]>(loadHabits)
  const [activeView, setActiveView] = useState<AppView>('dashboard')
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()))
  const [category, setCategory] = useState('All habits')
  const [darkMode, setDarkMode] = useState(loadTheme)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [draft, setDraft] = useState<HabitDraft>(emptyDraft)
  const [formError, setFormError] = useState('')
  const [menuHabitId, setMenuHabitId] = useState<string | null>(null)
  const [deleteHabit, setDeleteHabit] = useState<Habit | null>(null)
  const [briefOpen, setBriefOpen] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showToast = (message: string, action?: Toast['action']) => {
    const id = uid()
    setToasts((current) => [...current, { id, message, action }])
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4800)
  }

  useEffect(() => {
    try { saveHabits(habits) } catch { /* The in-memory app remains usable. */ }
  }, [habits])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light'
    saveTheme(darkMode)
  }, [darkMode])

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setEditorOpen(false); setBriefOpen(false); setDeleteHabit(null); setMenuHabitId(null); setMobileMenuOpen(false)
    }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [])

  const weekDates = useMemo(() => getWeekDates(fromDateKey(selectedDate)), [selectedDate])
  const categories = useMemo(() => ['All habits', ...Array.from(new Set(habits.map((habit) => habit.category)))], [habits])
  const visibleHabits = category === 'All habits' ? habits : habits.filter((habit) => habit.category === category)
  const selectedCompletions = habits.filter((habit) => habit.completions.includes(selectedDate)).length
  const todayRate = habits.length ? Math.round((selectedCompletions / habits.length) * 100) : 0
  const totalCheckIns = habits.reduce((sum, habit) => sum + habit.completions.length, 0)
  const bestStreak = Math.max(0, ...habits.map(longestStreak))
  const currentBestStreak = Math.max(0, ...habits.map((habit) => calculateStreak(habit)))
  const weekStats = weekDates.map((date) => habits.filter((habit) => habit.completions.includes(dateKey(date))).length)
  const weekCompleted = weekStats.reduce((sum, value) => sum + value, 0)
  const weekGoal = habits.reduce((sum, habit) => habit.period === 'daily' ? sum + habit.target * 7 : habit.period === 'weekly' ? sum + habit.target : sum + Math.max(1, Math.round(habit.target / 4)), 0)
  const weekRate = weekGoal ? Math.min(100, Math.round((weekCompleted / weekGoal) * 100)) : 0

  const openNewHabit = () => {
    setEditingHabit(null); setDraft(emptyDraft); setFormError(''); setEditorOpen(true)
  }

  const openEditHabit = (habit: Habit) => {
    setEditingHabit(habit)
    setDraft({ name: habit.name, category: habit.category, color: habit.color, icon: habit.icon, target: habit.target, period: habit.period, reminder: habit.reminder })
    setMenuHabitId(null); setFormError(''); setEditorOpen(true)
  }

  const saveHabit = (event: FormEvent) => {
    event.preventDefault()
    const name = draft.name.trim()
    if (name.length < 2) { setFormError('Give your habit a name with at least 2 characters.'); return }
    if (draft.target < 1 || draft.target > 31) { setFormError('Choose a goal between 1 and 31.'); return }
    if (editingHabit) {
      setHabits((current) => current.map((habit) => habit.id === editingHabit.id ? { ...habit, ...draft, name } : habit))
      showToast(`${name} was updated.`)
    } else {
      setHabits((current) => [...current, { ...draft, name, id: uid(), completions: [], createdAt: new Date().toISOString() }])
      showToast(`${name} was added to your rituals.`)
    }
    setEditorOpen(false)
  }

  const toggleCompletion = (habitId: string, key: string) => {
    const targetDate = fromDateKey(key)
    const now = new Date(); now.setHours(23, 59, 59, 999)
    if (targetDate > now) return
    let completed = false
    setHabits((current) => current.map((habit) => {
      if (habit.id !== habitId) return habit
      const exists = habit.completions.includes(key)
      completed = !exists
      return { ...habit, completions: exists ? habit.completions.filter((entry) => entry !== key) : [...habit.completions, key].sort() }
    }))
    if (completed) showToast('Nice work — one more promise kept.')
  }

  const confirmDelete = () => {
    if (!deleteHabit) return
    const removed = deleteHabit
    const index = habits.findIndex((habit) => habit.id === removed.id)
    setHabits((current) => current.filter((habit) => habit.id !== removed.id)); setDeleteHabit(null)
    showToast(`${removed.name} was deleted.`, { label: 'Undo', run: () => setHabits((current) => [...current.slice(0, index), removed, ...current.slice(index)]) })
  }

  const changeView = (view: AppView) => {
    setActiveView(view); setMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify(habits, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `ritual-backup-${dateKey(new Date())}.json`; anchor.click(); URL.revokeObjectURL(url)
    showToast('Your habit backup was exported.')
  }

  const importData = (file?: File) => {
    if (!file) return
    if (file.size > 2_000_000) { showToast('That file is too large. Choose a backup under 2 MB.'); return }
    const reader = new FileReader()
    reader.onload = () => {
      try { const imported = parseHabitImport(String(reader.result)); setHabits(imported); showToast(`${imported.length} habits were imported successfully.`) }
      catch (error) { showToast(error instanceof Error ? error.message : 'The backup could not be imported.') }
    }
    reader.onerror = () => showToast('The selected file could not be read.')
    reader.readAsText(file)
  }

  const downloadBrief = () => {
    const blob = new Blob([buildPrompt], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'habit-tracker-development-prompt.md'; anchor.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <aside className={cn('sidebar', mobileMenuOpen && 'sidebar-open')} aria-label="Primary sidebar">
        <div className="brand"><span className="brand-mark"><ClipboardCheck size={19} strokeWidth={2.4} /></span><span>Ritual</span></div>
        <nav className="primary-nav" aria-label="Primary navigation">
          <p className="nav-label">Workspace</p>
          {navItems.map((item) => { const Icon = item.icon; return (
            <button key={item.id} className={cn('nav-item', activeView === item.id && 'active')} onClick={() => changeView(item.id)} aria-current={activeView === item.id ? 'page' : undefined}>
              <Icon size={18} /><span>{item.label}</span>{item.id === 'dashboard' && <span className="nav-count">{habits.length}</span>}
            </button>
          ) })}
        </nav>
        <div className="category-nav">
          <div className="category-heading"><p className="nav-label">Collections</p><button className="mini-icon-button" onClick={openNewHabit} aria-label="Add a habit"><Plus size={15} /></button></div>
          {categories.slice(1).map((item) => (
            <button key={item} className={cn('category-link', category === item && activeView === 'dashboard' && 'selected')} onClick={() => { setCategory(item); changeView('dashboard') }}>
              <span className="category-dot" style={{ background: categoryColors[item] ?? '#7C6FF2' }} /><span>{item}</span><span>{habits.filter((habit) => habit.category === item).length}</span>
            </button>
          ))}
        </div>
        <div className="weekly-goal-card">
          <div className="goal-card-heading"><Target size={16} /><span>Weekly goal</span></div><strong>{weekRate}%</strong>
          <div className="progress-track" role="progressbar" aria-label="Weekly goal" aria-valuemin={0} aria-valuemax={100} aria-valuenow={weekRate}><span style={{ width: `${weekRate}%` }} /></div>
          <p>{weekCompleted} of {weekGoal} check-ins</p>
        </div>
        <button className="profile-card" onClick={() => changeView('settings')}><span className="avatar">AK</span><span><strong>Alex Kim</strong><small>Personal workspace</small></span><MoreHorizontal size={17} /></button>
      </aside>

      <header className="mobile-header">
        <div className="brand"><span className="brand-mark"><ClipboardCheck size={18} /></span><span>Ritual</span></div>
        <div><button className="icon-button" onClick={() => setDarkMode((value) => !value)} aria-label="Toggle color theme">{darkMode ? <Sun size={19} /> : <Moon size={19} />}</button><button className="icon-button" onClick={() => setMobileMenuOpen((value) => !value)} aria-label="Open navigation" aria-expanded={mobileMenuOpen}><Menu size={20} /></button></div>
      </header>

      <main id="main-content" className="main-content">
        <div className="topbar">
          <div className="page-intro">
            <p className="eyebrow">{new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}</p>
            <h1>{activeView === 'dashboard' ? `${getGreeting()}, Alex.` : navItems.find((item) => item.id === activeView)?.label}</h1>
            <p>{activeView === 'dashboard' ? 'Small steps, thoughtfully repeated.' : getViewSubtitle(activeView)}</p>
          </div>
          <div className="top-actions">
            <button className="search-button" onClick={() => { setCategory('All habits'); changeView('dashboard') }}><Search size={17} /><span>Find a habit</span><kbd>⌘ K</kbd></button>
            <button className="icon-button desktop-only" onClick={() => setDarkMode((value) => !value)} aria-label={darkMode ? 'Use light mode' : 'Use dark mode'}>{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button className="brief-button" onClick={() => setBriefOpen(true)}><Code2 size={17} /><span>Build brief</span></button>
            {activeView === 'dashboard' && <button className="primary-button" onClick={openNewHabit}><Plus size={18} /><span>New habit</span></button>}
          </div>
        </div>

        {activeView === 'dashboard' && <DashboardView habits={visibleHabits} allHabits={habits} categories={categories} category={category} setCategory={setCategory} selectedDate={selectedDate} setSelectedDate={setSelectedDate} weekDates={weekDates} weekStats={weekStats} todayRate={todayRate} weekRate={weekRate} currentBestStreak={currentBestStreak} totalCheckIns={totalCheckIns} onToggle={toggleCompletion} onEdit={openEditHabit} onDelete={setDeleteHabit} menuHabitId={menuHabitId} setMenuHabitId={setMenuHabitId} onNew={openNewHabit} />}
        {activeView === 'insights' && <InsightsView habits={habits} weekDates={weekDates} weekStats={weekStats} bestStreak={bestStreak} totalCheckIns={totalCheckIns} />}
        {activeView === 'history' && <HistoryView habits={habits} onToggle={toggleCompletion} />}
        {activeView === 'settings' && <SettingsView darkMode={darkMode} setDarkMode={setDarkMode} exportData={exportData} importData={() => fileInputRef.current?.click()} resetData={() => { setHabits(defaultHabits); showToast('Demo habits were restored.') }} openBrief={() => setBriefOpen(true)} />}
      </main>

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {navItems.map((item) => { const Icon = item.icon; return <button key={item.id} className={cn(activeView === item.id && 'active')} onClick={() => changeView(item.id)} aria-current={activeView === item.id ? 'page' : undefined}><Icon size={20} /><span>{item.label}</span></button> })}
      </nav>
      <button className="mobile-add" onClick={openNewHabit} aria-label="Create a new habit"><Plus size={24} /></button>
      <input ref={fileInputRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={(event) => { importData(event.target.files?.[0]); event.target.value = '' }} />

      {editorOpen && <HabitEditor draft={draft} setDraft={setDraft} editing={Boolean(editingHabit)} error={formError} onClose={() => setEditorOpen(false)} onSubmit={saveHabit} />}
      {deleteHabit && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDeleteHabit(null)}>
          <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><span className="danger-icon"><Trash2 size={22} /></span><h2 id="delete-title">Delete “{deleteHabit.name}”?</h2><p>This removes the habit and its check-in history. You can undo immediately afterward.</p><div className="dialog-actions"><button className="secondary-button" onClick={() => setDeleteHabit(null)}>Cancel</button><button className="danger-button" onClick={confirmDelete}>Delete habit</button></div></section>
        </div>
      )}
      {briefOpen && (
        <div className="modal-backdrop brief-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setBriefOpen(false)}>
          <section className="brief-dialog" role="dialog" aria-modal="true" aria-labelledby="brief-title">
            <header><div><span className="code-icon"><Code2 size={20} /></span><div><p className="eyebrow">Implementation-ready</p><h2 id="brief-title">Vanilla habit tracker build brief</h2></div></div><button className="icon-button" onClick={() => setBriefOpen(false)} aria-label="Close development brief"><X size={20} /></button></header>
            <div className="brief-toolbar"><p>HTML5 · CSS3 · Vanilla JavaScript · Zero dependencies</p><div><button className="secondary-button compact" onClick={() => { navigator.clipboard.writeText(buildPrompt); showToast('Development prompt copied.') }}><Copy size={15} />Copy</button><button className="primary-button compact" onClick={downloadBrief}><Download size={15} />Download .md</button></div></div>
            <pre className="prompt-content">{buildPrompt}</pre>
          </section>
        </div>
      )}
      <div className="toast-region" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => <div className="toast" key={toast.id}><span className="toast-check"><Check size={15} /></span><p>{toast.message}</p>{toast.action && <button onClick={() => { toast.action?.run(); setToasts((current) => current.filter((item) => item.id !== toast.id)) }}>{toast.action.label}</button>}<button className="toast-close" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} aria-label="Dismiss notification"><X size={15} /></button></div>)}
      </div>
    </div>
  )
}

type DashboardProps = {
  habits: Habit[]; allHabits: Habit[]; categories: string[]; category: string; setCategory: (category: string) => void;
  selectedDate: string; setSelectedDate: (date: string) => void; weekDates: Date[]; weekStats: number[];
  todayRate: number; weekRate: number; currentBestStreak: number; totalCheckIns: number;
  onToggle: (id: string, date: string) => void; onEdit: (habit: Habit) => void; onDelete: (habit: Habit) => void;
  menuHabitId: string | null; setMenuHabitId: (id: string | null) => void; onNew: () => void;
}

function DashboardView(props: DashboardProps) {
  const selected = fromDateKey(props.selectedDate)
  const isToday = props.selectedDate === dateKey(new Date())
  const metricCards = [
    { label: isToday ? 'Today' : formatShortDate(selected), value: `${props.todayRate}%`, note: `${props.allHabits.filter((habit) => habit.completions.includes(props.selectedDate)).length} of ${props.allHabits.length} completed`, icon: Gauge, color: 'violet' },
    { label: 'This week', value: `${props.weekRate}%`, note: props.weekRate >= 60 ? 'On pace for your goal' : 'Keep your rhythm going', icon: TrendingUp, color: 'green' },
    { label: 'Current streak', value: `${props.currentBestStreak}`, note: props.currentBestStreak === 1 ? 'day in a row' : 'days in a row', icon: Flame, color: 'coral' },
    { label: 'All check-ins', value: String(props.totalCheckIns), note: 'Small wins recorded', icon: Zap, color: 'gold' },
  ]
  return <>
    <section className="date-rail" aria-label="Select a date">
      <button className="rail-arrow" onClick={() => props.setSelectedDate(dateKey(addDays(selected, -7)))} aria-label="Previous week"><ChevronLeft size={18} /></button>
      <div className="date-days">{props.weekDates.map((date) => { const key = dateKey(date); const completed = props.allHabits.filter((habit) => habit.completions.includes(key)).length; return (
        <button key={key} className={cn('date-day', props.selectedDate === key && 'selected', key === dateKey(new Date()) && 'today')} onClick={() => props.setSelectedDate(key)} aria-pressed={props.selectedDate === key}><span>{new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date).slice(0, 2)}</span><strong>{date.getDate()}</strong><i style={{ '--dot-width': `${Math.min(100, (completed / Math.max(1, props.allHabits.length)) * 100)}%` } as CSSProperties} /></button>
      ) })}</div>
      <button className="rail-arrow" onClick={() => props.setSelectedDate(dateKey(addDays(selected, 7)))} aria-label="Next week"><ChevronRight size={18} /></button>
      {!isToday && <button className="today-button" onClick={() => props.setSelectedDate(dateKey(new Date()))}>Today</button>}
    </section>
    <section className="metrics-grid" aria-label="Habit statistics">{metricCards.map((metric) => { const Icon = metric.icon; return <article className="metric-card" key={metric.label}><div><p>{metric.label}</p><span className={cn('metric-icon', metric.color)}><Icon size={18} /></span></div><strong>{metric.value}</strong><small>{metric.note}</small></article> })}</section>
    <div className="dashboard-grid">
      <section className="habits-section" aria-labelledby="habits-heading">
        <div className="section-heading"><div><h2 id="habits-heading">Your habits</h2><p>{isToday ? 'What deserves your attention today?' : `Check-ins for ${formatShortDate(selected)}`}</p></div><div className="habit-filters"><select value={props.category} onChange={(event) => props.setCategory(event.target.value)} aria-label="Filter habits by category">{props.categories.map((item) => <option key={item}>{item}</option>)}</select><button className="small-add" onClick={props.onNew}><Plus size={16} />Add</button></div></div>
        <div className="habit-list">{props.habits.length ? props.habits.map((habit) => <HabitCard key={habit.id} habit={habit} weekDates={props.weekDates} selectedDate={props.selectedDate} onToggle={props.onToggle} onEdit={props.onEdit} onDelete={props.onDelete} menuOpen={props.menuHabitId === habit.id} setMenuOpen={(open) => props.setMenuHabitId(open ? habit.id : null)} />) : <div className="empty-state"><span><Leaf size={25} /></span><h3>No habits here yet</h3><p>Start with one small ritual you can repeat.</p><button className="primary-button" onClick={props.onNew}><Plus size={17} />Create a habit</button></div>}</div>
      </section>
      <aside className="insights-rail" aria-label="Weekly overview">
        <article className="momentum-card"><div className="card-heading"><div><h2>Weekly momentum</h2><p>Check-ins by day</p></div><span className="up-badge"><TrendingUp size={13} />12%</span></div><div className="bar-chart" aria-label={`Daily check-ins this week: ${props.weekStats.join(', ')}`}>{props.weekStats.map((value, index) => { const max = Math.max(1, ...props.weekStats, props.allHabits.length); return <div className="bar-column" key={props.weekDates[index].toISOString()}><div><span style={{ height: `${Math.max(8, (value / max) * 100)}%` }} title={`${value} check-ins`} /></div><small>{new Intl.DateTimeFormat('en-US', { weekday: 'narrow' }).format(props.weekDates[index])}</small></div> })}</div><div className="chart-summary"><span><i />This week</span><strong>{props.weekStats.reduce((sum, value) => sum + value, 0)} check-ins</strong></div></article>
        <article className="focus-card"><span className="quote-mark">“</span><blockquote>We are what we repeatedly do. Excellence, then, is not an act, but a habit.</blockquote><p>— Will Durant</p><div className="focus-decoration"><span /><span /><span /></div></article>
        <article className="consistency-card"><div className="card-heading"><div><h2>Consistency</h2><p>Last 28 days</p></div><span className="ring-small" style={{ background: `conic-gradient(#7C6FF2 ${props.weekRate}%, var(--ring-track) 0)` }}><i>{props.weekRate}</i></span></div><div className="mini-heatmap">{getTrailingDates(28).map((date) => { const count = props.allHabits.filter((habit) => habit.completions.includes(dateKey(date))).length; return <span key={date.toISOString()} className={cn(count > 0 && 'heat-1', count > 1 && 'heat-2', count > 2 && 'heat-3')} title={`${formatShortDate(date)}: ${count} check-ins`} /> })}</div></article>
      </aside>
    </div>
  </>
}

type HabitCardProps = { habit: Habit; weekDates: Date[]; selectedDate: string; onToggle: (id: string, date: string) => void; onEdit: (habit: Habit) => void; onDelete: (habit: Habit) => void; menuOpen: boolean; setMenuOpen: (open: boolean) => void }
function HabitCard({ habit, weekDates, selectedDate, onToggle, onEdit, onDelete, menuOpen, setMenuOpen }: HabitCardProps) {
  const Icon = iconMap[habit.icon] ?? Target
  const completedSelected = habit.completions.includes(selectedDate)
  const streak = calculateStreak(habit)
  const progress = progressForHabit(habit, fromDateKey(selectedDate))
  const count = currentPeriodCount(habit, fromDateKey(selectedDate))
  return <article className={cn('habit-card', completedSelected && 'completed')} style={{ '--habit-color': habit.color, '--progress': `${progress}%` } as CSSProperties}>
    <button className="habit-check-main" onClick={() => onToggle(habit.id, selectedDate)} aria-pressed={completedSelected} aria-label={`${completedSelected ? 'Mark incomplete' : 'Complete'} ${habit.name} for ${selectedDate}`}>{completedSelected ? <Check size={20} strokeWidth={2.7} /> : <Icon size={20} />}</button>
    <div className="habit-info"><h3>{habit.name}</h3><p><span>{habit.category}</span><i />{habit.target}× {habit.period === 'daily' ? 'a day' : `a ${habit.period.replace('ly', '')}`}{habit.reminder && <><i />{habit.reminder}</>}</p></div>
    <div className="week-checks" aria-label={`${habit.name} weekly check-ins`}>{weekDates.map((date) => { const key = dateKey(date); const checked = habit.completions.includes(key); const future = date > new Date(); return <button key={key} disabled={future} className={cn(checked && 'checked', key === selectedDate && 'selected')} onClick={() => onToggle(habit.id, key)} aria-label={`${checked ? 'Remove' : 'Add'} check-in for ${formatShortDate(date)}`} aria-pressed={checked}><span>{new Intl.DateTimeFormat('en-US', { weekday: 'narrow' }).format(date)}</span><i>{checked ? <Check size={13} /> : date.getDate()}</i></button> })}</div>
    <div className="habit-progress"><span className="progress-ring" style={{ background: `conic-gradient(${habit.color} ${progress}%, var(--ring-track) 0)` }}><i>{progress}%</i></span><div><strong>{count}/{habit.target}</strong><small>{habit.period}</small></div></div>
    <div className="streak-label"><Flame size={14} /><strong>{streak}</strong><span>day{streak === 1 ? '' : 's'}</span></div>
    <div className="habit-menu-wrap"><button className="menu-trigger" onClick={() => setMenuOpen(!menuOpen)} aria-label={`Actions for ${habit.name}`} aria-expanded={menuOpen}><MoreHorizontal size={19} /></button>{menuOpen && <div className="habit-menu" role="menu"><button role="menuitem" onClick={() => onEdit(habit)}><Pencil size={15} />Edit habit</button><button className="delete" role="menuitem" onClick={() => { onDelete(habit); setMenuOpen(false) }}><Trash2 size={15} />Delete habit</button></div>}</div>
  </article>
}

function InsightsView({ habits, weekDates, weekStats, bestStreak, totalCheckIns }: { habits: Habit[]; weekDates: Date[]; weekStats: number[]; bestStreak: number; totalCheckIns: number }) {
  const trailing = getTrailingDates(30)
  const completedLast30 = habits.reduce((sum, habit) => sum + habit.completions.filter((key) => trailing.some((date) => dateKey(date) === key)).length, 0)
  const rate = Math.min(100, Math.round((completedLast30 / Math.max(1, habits.length * 30)) * 100))
  const categoryStats = Array.from(new Set(habits.map((habit) => habit.category))).map((category) => ({ category, count: habits.filter((habit) => habit.category === category).reduce((sum, habit) => sum + habit.completions.length, 0) }))
  const maxWeek = Math.max(1, ...weekStats)
  return <div className="view-stack">
    <section className="insight-kpis" aria-label="All-time insights">
      <article><span className="metric-icon violet"><Gauge size={18} /></span><p>30-day completion</p><strong>{rate}%</strong><small>{completedLast30} recorded check-ins</small></article>
      <article><span className="metric-icon coral"><Flame size={18} /></span><p>Longest streak</p><strong>{bestStreak} days</strong><small>Your personal best</small></article>
      <article><span className="metric-icon green"><ClipboardCheck size={18} /></span><p>Lifetime check-ins</p><strong>{totalCheckIns}</strong><small>Across {habits.length} active habits</small></article>
    </section>
    <div className="insights-page-grid">
      <section className="large-chart-card"><div className="section-heading"><div><h2>Completion rhythm</h2><p>Your daily check-ins this week</p></div><span className="up-badge"><TrendingUp size={13} />Live</span></div><div className="large-bars">{weekStats.map((value, index) => <div key={dateKey(weekDates[index])}><span style={{ height: `${Math.max(7, (value / maxWeek) * 100)}%` }}><i>{value}</i></span><small>{new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(weekDates[index])}</small></div>)}</div></section>
      <section className="category-breakdown"><div className="section-heading"><div><h2>By collection</h2><p>Where your energy goes</p></div></div>{categoryStats.map((item) => { const max = Math.max(1, ...categoryStats.map((stat) => stat.count)); return <div className="category-stat" key={item.category}><div><span className="category-dot" style={{ background: categoryColors[item.category] ?? '#7C6FF2' }} /><strong>{item.category}</strong><em>{item.count}</em></div><div className="progress-track"><span style={{ width: `${(item.count / max) * 100}%`, background: categoryColors[item.category] ?? '#7C6FF2' }} /></div></div> })}</section>
    </div>
    <section className="achievement-strip"><span><Sparkles size={22} /></span><div><p>Quiet consistency</p><h2>You have shown up {totalCheckIns} times.</h2><small>That is the kind of progress no single day can capture.</small></div></section>
  </div>
}

function HistoryView({ habits, onToggle }: { habits: Habit[]; onToggle: (id: string, date: string) => void }) {
  const [cursor, setCursor] = useState(new Date())
  const year = cursor.getFullYear(), month = cursor.getMonth(), first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate(), lead = (first.getDay() + 6) % 7
  const cells = Array.from({ length: lead + daysInMonth }, (_, index) => index < lead ? null : new Date(year, month, index - lead + 1))
  return <div className="history-grid">
    <section className="calendar-card"><div className="calendar-header"><div><h2>{new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(cursor)}</h2><p>Your month, one promise at a time</p></div><div><button className="icon-button" onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="Previous month"><ChevronLeft size={18} /></button><button className="today-button" onClick={() => setCursor(new Date())}>Today</button><button className="icon-button" onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="Next month"><ChevronRight size={18} /></button></div></div>
      <div className="month-calendar">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day) => <span className="weekday" key={day}>{day}</span>)}{cells.map((date, index) => { if (!date) return <span className="blank" key={`blank-${index}`} />; const key = dateKey(date), count = habits.filter((habit) => habit.completions.includes(key)).length, future = date > new Date(); return <button key={key} disabled={future} className={cn(key === dateKey(new Date()) && 'today', count === habits.length && habits.length > 0 && 'perfect')} aria-label={`${formatShortDate(date)}, ${count} of ${habits.length} complete`}><strong>{date.getDate()}</strong><span>{habits.slice(0,4).map((habit) => <i key={habit.id} style={{ background: habit.completions.includes(key) ? habit.color : undefined }} />)}</span><small>{count ? `${count}/${habits.length}` : '—'}</small></button> })}</div>
    </section>
    <aside className="history-list"><div className="section-heading"><div><h2>Habit history</h2><p>Last 4 weeks at a glance</p></div></div>{habits.map((habit) => { const Icon = iconMap[habit.icon] ?? Target; return <article key={habit.id}><div><span className="tiny-icon" style={{ background: `${habit.color}18`, color: habit.color }}><Icon size={16} /></span><div><strong>{habit.name}</strong><small>{habit.completions.length} total check-ins</small></div></div><div className="history-dots">{getTrailingDates(28).map((date) => { const key = dateKey(date); return <button key={key} className={cn(habit.completions.includes(key) && 'done')} style={{ '--habit-color': habit.color } as CSSProperties} onClick={() => onToggle(habit.id, key)} aria-label={`Toggle ${habit.name} on ${formatShortDate(date)}`} /> })}</div></article> })}</aside>
  </div>
}

type SettingsProps = { darkMode: boolean; setDarkMode: (dark: boolean) => void; exportData: () => void; importData: () => void; resetData: () => void; openBrief: () => void }
function SettingsView({ darkMode, setDarkMode, exportData, importData, resetData, openBrief }: SettingsProps) {
  return <div className="settings-layout">
    <section className="settings-card"><div className="settings-heading"><span><CloudSun size={20} /></span><div><h2>Appearance</h2><p>Make Ritual feel at home on your screen.</p></div></div><div className="theme-choices" role="radiogroup" aria-label="Color theme"><button role="radio" aria-checked={!darkMode} className={cn(!darkMode && 'selected')} onClick={() => setDarkMode(false)}><span className="theme-preview light"><i /><i /><i /></span><strong><Sun size={16} />Light</strong></button><button role="radio" aria-checked={darkMode} className={cn(darkMode && 'selected')} onClick={() => setDarkMode(true)}><span className="theme-preview dark-preview"><i /><i /><i /></span><strong><Moon size={16} />Dark</strong></button></div></section>
    <section className="settings-card"><div className="settings-heading"><span><Archive size={20} /></span><div><h2>Your data</h2><p>Portable, private, and stored in this browser.</p></div></div><div className="setting-row"><div><strong>Export backup</strong><p>Download every habit and check-in as JSON.</p></div><button className="secondary-button" onClick={exportData}><Download size={16} />Export</button></div><div className="setting-row"><div><strong>Import backup</strong><p>Restore a validated Ritual JSON backup.</p></div><button className="secondary-button" onClick={importData}><Upload size={16} />Import</button></div><div className="setting-row"><div><strong>Restore demo</strong><p>Replace current data with the starter rituals.</p></div><button className="danger-outline-button" onClick={() => window.confirm('Replace your current habits with the demo set?') && resetData()}>Restore</button></div></section>
    <section className="settings-card brief-setting"><div className="settings-heading"><span><Code2 size={20} /></span><div><h2>Standalone build brief</h2><p>Get the detailed implementation prompt for recreating this product using only HTML5, CSS3, and vanilla JavaScript—no frameworks, libraries, backend, or build tools.</p></div></div><button className="primary-button" onClick={openBrief}><Code2 size={17} />Open development prompt</button></section>
  </div>
}

type HabitEditorProps = { draft: HabitDraft; setDraft: (draft: HabitDraft) => void; editing: boolean; error: string; onClose: () => void; onSubmit: (event: FormEvent) => void }
function HabitEditor({ draft, setDraft, editing, error, onClose, onSubmit }: HabitEditorProps) {
  const colors = ['#7C6FF2','#EA7D55','#36A987','#E6AE45','#4995D1','#D85E8A']
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="editor-dialog" role="dialog" aria-modal="true" aria-labelledby="editor-title"><header><div><p className="eyebrow">{editing ? 'Refine your ritual' : 'Create a ritual'}</p><h2 id="editor-title">{editing ? 'Edit habit' : 'Start a new habit'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close habit editor"><X size={20} /></button></header><form onSubmit={onSubmit} noValidate>
    <label className="field"><span>Habit name</span><input autoFocus maxLength={60} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. Morning walk" aria-describedby={error ? 'form-error' : undefined} /></label>
    <div className="field-row"><label className="field"><span>Collection</span><select value={draft.category} onChange={(event) => { const category = event.target.value; setDraft({ ...draft, category, color: categoryColors[category] ?? draft.color }) }}>{Object.keys(categoryColors).map((item) => <option key={item}>{item}</option>)}</select></label><label className="field"><span>Reminder</span><input type="time" value={toTimeValue(draft.reminder)} onChange={(event) => setDraft({ ...draft, reminder: fromTimeValue(event.target.value) })} /></label></div>
    <fieldset className="field"><legend>Accent color</legend><div className="color-choices">{colors.map((color) => <button type="button" key={color} className={cn(draft.color === color && 'selected')} style={{ background: color }} onClick={() => setDraft({ ...draft, color })} aria-label={`Use ${color} accent`} aria-pressed={draft.color === color}>{draft.color === color && <Check size={15} />}</button>)}</div></fieldset>
    <fieldset className="field"><legend>Icon</legend><div className="icon-choices">{Object.entries(iconMap).map(([name, Icon]) => <button type="button" key={name} className={cn(draft.icon === name && 'selected')} onClick={() => setDraft({ ...draft, icon: name })} aria-label={`Use ${name} icon`} aria-pressed={draft.icon === name}><Icon size={18} /></button>)}</div></fieldset>
    <div className="field-row goal-row"><label className="field"><span>Frequency</span><select value={draft.period} onChange={(event) => { const period = event.target.value as HabitPeriod; setDraft({ ...draft, period, target: period === 'daily' ? 1 : draft.target }) }}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label><label className="field"><span>Target</span><div className="number-input"><input type="number" min="1" max="31" value={draft.target} onChange={(event) => setDraft({ ...draft, target: Number(event.target.value) })} disabled={draft.period === 'daily'} /><span>times</span></div></label></div>
    {error && <p className="form-error" id="form-error" role="alert">{error}</p>}<div className="dialog-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit"><Check size={17} />{editing ? 'Save changes' : 'Create habit'}</button></div>
  </form></section></div>
}

function toTimeValue(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i)
  if (!match) return ''
  let hour = Number(match[1])
  if (match[3].toUpperCase() === 'PM' && hour !== 12) hour += 12
  if (match[3].toUpperCase() === 'AM' && hour === 12) hour = 0
  return `${String(hour).padStart(2, '0')}:${match[2]}`
}
function fromTimeValue(value: string) {
  if (!value) return ''
  const [hourValue, minute] = value.split(':').map(Number), period = hourValue >= 12 ? 'PM' : 'AM', hour = hourValue % 12 || 12
  return `${hour}:${String(minute).padStart(2, '0')} ${period}`
}
function getViewSubtitle(view: AppView) {
  if (view === 'insights') return 'See the patterns behind your progress.'
  if (view === 'history') return 'Every check-in tells part of your story.'
  if (view === 'settings') return 'Shape your workspace and keep your data safe.'
  return ''
}
