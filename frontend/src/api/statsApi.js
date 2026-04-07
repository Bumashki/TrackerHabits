import { api } from './client'

// ── Моковые данные ───────────────────────────────────────────────────

const MOCK_SUMMARY = {
  currentStreak: 23,
  completedToday: 4,
  totalToday: 6,
  monthlyRate: 82,
  xpPoints: 1240,
  bestStreak: 31,
  avgPerDay: 4.8,
  perfectDays: 8,
}

// Ключ: 'YYYY-MM-DD', значение: 'done' | 'partial' | ''
const MOCK_CALENDAR = {
  '2026-04-01': 'done',
  '2026-04-02': 'done',
  '2026-04-03': 'done',
  '2026-04-04': 'partial',
  '2026-04-05': 'done',
  '2026-04-06': 'done',
}

// % выполнения за каждый день недели (пн–вс)
const MOCK_WEEKLY = [72, 50, 85, 60, 95, 33, 67]

// % выполнения за каждый месяц года (янв–дек). 0 = ещё не наступил.
const MOCK_MONTHLY = [65, 78, 70, 85, 0, 0, 0, 0, 0, 0, 0, 0]

// ── API-функции ──────────────────────────────────────────────────────

// GET /stats/summary
export function getStatsSummary() {
  return Promise.resolve(MOCK_SUMMARY)
  // return api.get('/stats/summary')
}

// GET /stats/calendar?year=2026&month=4
export function getStatsCalendar(year, month) {
  return Promise.resolve(MOCK_CALENDAR)
  // return api.get(`/stats/calendar?year=${year}&month=${month}`)
}

// GET /stats/weekly
export function getStatsWeekly() {
  return Promise.resolve(MOCK_WEEKLY)
  // return api.get('/stats/weekly')
}

// GET /stats/monthly?year=2026
export function getStatsMonthly(year) {
  return Promise.resolve(MOCK_MONTHLY)
  // return api.get(`/stats/monthly?year=${year}`)
}

// GET /stats/heatmap?year=2026
export function getStatsHeatmap(year) {
  // Генерируем случайные данные для демо
  const cells = Array.from({ length: 91 }, () => {
    const r = Math.random()
    if (r > 0.8) return 'l4'
    if (r > 0.6) return 'l3'
    if (r > 0.4) return 'l2'
    if (r > 0.25) return 'l1'
    return ''
  })
  return Promise.resolve(cells)
  // return api.get(`/stats/heatmap?year=${year}`)
}
