import { useState, useEffect } from 'react'
import {
  getStatsSummary,
  getStatsCalendar,
  getStatsWeekly,
  getStatsMonthly,
  getStatsHeatmap,
} from '../api/statsApi'

export function useStats(year = 2026, month = 4) {
  const [summary, setSummary]       = useState(null)
  const [calendarData, setCalendar] = useState({})
  const [weeklyData, setWeekly]     = useState([])
  const [monthlyData, setMonthly]   = useState([])
  const [heatmapData, setHeatmap]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [sum, cal, week, monthly, heat] = await Promise.all([
          getStatsSummary(),
          getStatsCalendar(year, month),
          getStatsWeekly(),
          getStatsMonthly(year),
          getStatsHeatmap(year),
        ])
        setSummary(sum)
        setCalendar(cal)
        setWeekly(week)
        setMonthly(monthly)
        setHeatmap(heat)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [year, month])

  return { summary, calendarData, weeklyData, monthlyData, heatmapData, loading, error }
}
