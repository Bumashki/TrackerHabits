import { api } from './client'

// GET /stats/summary  — опционально ?year=&month= для выбранного месяца
export function getStatsSummary(year, month) {
  const qs =
    year != null && month != null ? `?year=${year}&month=${month}` : ''
  return api.get(`/stats/summary${qs}`)
}

// GET /stats/calendar?year=2026&month=4
export function getStatsCalendar(year, month) {
  return api.get(`/stats/calendar?year=${year}&month=${month}`)
}

// GET /stats/weekly
export function getStatsWeekly() {
  return api.get('/stats/weekly')
}

// GET /stats/monthly?year=2026
export function getStatsMonthly(year) {
  return api.get(`/stats/monthly?year=${year}`)
}

// GET /stats/heatmap?year=2026
export function getStatsHeatmap(year) {
  return api.get(`/stats/heatmap?year=${year}`)
}

/** Один запрос: summary + calendar + weekly + monthly + heatmap */
export function getStatsBundle(year, month, heatmapYear) {
  const hy = heatmapYear ?? year
  const qs = new URLSearchParams({
    year: String(year),
    month: String(month),
    heatmapYear: String(hy),
  })
  return api.get(`/stats/bundle?${qs}`)
}
