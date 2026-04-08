import { api } from './client'

// GET /stats/summary
export function getStatsSummary() {
  return api.get('/stats/summary')
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
