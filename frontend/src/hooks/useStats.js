import { useState, useEffect } from 'react'
import {
  getStatsSummary,
  getStatsCalendar,
  getStatsWeekly,
  getStatsMonthly,
  getStatsHeatmap,
} from '../api/statsApi'

/** heatmapYear — год для heatmap и «по месяцам» (может отличаться от year календаря в режиме «год»). */
export function useStats(year, month, heatmapYear = year) {
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
        const hy = heatmapYear ?? year
        const [sum, cal, week, monthly, heat] = await Promise.all([
          getStatsSummary(year, month),
          getStatsCalendar(year, month),
          getStatsWeekly(),
          getStatsMonthly(hy),
          getStatsHeatmap(hy),
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
  }, [year, month, heatmapYear])

  return { summary, calendarData, weeklyData, monthlyData, heatmapData, loading, error }
}
