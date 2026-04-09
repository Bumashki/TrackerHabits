import { useMemo, useState } from 'react'
import { useHabits } from '../context/HabitsContext'
import { useStats } from '../hooks/useStats'
import KpiCard from '../components/KpiCard'
import BarChart from '../components/BarChart'
import MiniCalendar from '../components/MiniCalendar'
import { localDateISO } from '../utils/dateLocal'

const MONTH_LABELS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function daysInMonth(y, m) {
  return new Date(y, m, 0).getDate()
}

function monthTitle(y, m) {
  return `${MONTH_LABELS[m - 1]} ${y}`
}

export default function Stats() {
  const now = new Date()
  const todayY = now.getFullYear()
  const todayM = now.getMonth() + 1
  const todayStr = localDateISO(now)

  const [period, setPeriod] = useState('month')
  const [viewYear, setViewYear] = useState(todayY)
  const [viewMonth, setViewMonth] = useState(todayM)
  const [heatmapYear, setHeatmapYear] = useState(todayY)
  const [yearCalMonth, setYearCalMonth] = useState(todayM)

  const summaryYear =
    period === 'week' ? todayY : period === 'year' ? heatmapYear : viewYear
  const summaryMonth =
    period === 'week' ? todayM : period === 'year' ? yearCalMonth : viewMonth

  const heatmapY = period === 'year' ? heatmapYear : summaryYear

  const calYear = period === 'year' ? heatmapYear : viewYear
  const calMonth = period === 'year' ? yearCalMonth : viewMonth

  const { summary, calendarData, weeklyData, monthlyData, heatmapData, loading, error } = useStats(
    summaryYear,
    summaryMonth,
    heatmapY
  )

  const { habits } = useHabits()

  const dim = daysInMonth(summaryYear, summaryMonth)

  const monthBars = useMemo(
    () =>
      (monthlyData || []).map((value, i) => ({
        label: MONTH_LABELS[i],
        value: value || 0,
        muted: value === 0,
      })),
    [monthlyData]
  )

  const weekBars = useMemo(() => {
    const wk = (new Date().getDay() + 6) % 7
    return (weeklyData || []).map((value, i) => ({
      label: WEEKDAY_LABELS[i],
      value: value || 0,
      muted: value === 0,
      highlight: i === wk,
    }))
  }, [weeklyData])

  function shiftMonth(delta) {
    const d = new Date(viewYear, viewMonth - 1 + delta, 1)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth() + 1)
  }

  function shiftYearCalMonth(delta) {
    let m = yearCalMonth + delta
    let y = heatmapYear
    while (m > 12) {
      m -= 12
      y += 1
    }
    while (m < 1) {
      m += 12
      y -= 1
    }
    setHeatmapYear(y)
    setYearCalMonth(m)
  }

  const habitTitle =
    period === 'week'
      ? 'По привычкам — последние 30 дн.'
      : period === 'year'
        ? `По привычкам — ${heatmapY}`
        : `По привычкам — ${monthTitle(viewYear, viewMonth)}`

  const secondCardTitle =
    period === 'week'
      ? 'По дням недели (28 дн.)'
      : period === 'year'
        ? `По месяцам — ${heatmapY}`
        : `По месяцам — ${viewYear}`

  if (loading && !summary) {
    return (
      <div className="page">
        <div className="auth-loading-inner" style={{ padding: 40 }}>
          Загрузка статистики…
        </div>
      </div>
    )
  }

  return (
    <div className="page">

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Статистика</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className={`btn btn-sm ${period === 'week' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setPeriod('week')}
          >
            Неделя
          </button>
          <button
            type="button"
            className={`btn btn-sm ${period === 'month' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setPeriod('month')}
          >
            Месяц
          </button>
          <button
            type="button"
            className={`btn btn-sm ${period === 'year' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => {
              setPeriod('year')
              setHeatmapYear(viewYear)
              setYearCalMonth(viewMonth)
            }}
          >
            Год
          </button>
        </div>
      </div>

      {period === 'month' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => shiftMonth(-1)} aria-label="Предыдущий месяц">
            <i className="fa-solid fa-chevron-left" />
          </button>
          <span style={{ fontWeight: 600, minWidth: 140, textAlign: 'center' }}>{monthTitle(viewYear, viewMonth)}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => shiftMonth(1)}
            disabled={viewYear > todayY || (viewYear === todayY && viewMonth >= todayM)}
            aria-label="Следующий месяц"
          >
            <i className="fa-solid fa-chevron-right" />
          </button>
        </div>
      )}

      {period === 'year' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setHeatmapYear(y => y - 1)}>
              <i className="fa-solid fa-chevron-left" />
            </button>
            <span style={{ fontWeight: 600, minWidth: 56, textAlign: 'center' }}>{heatmapYear}</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setHeatmapYear(y => y + 1)}
              disabled={heatmapYear >= todayY}
            >
              <i className="fa-solid fa-chevron-right" />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => shiftYearCalMonth(-1)}>
              <i className="fa-solid fa-chevron-left" />
            </button>
            <span style={{ fontWeight: 600 }}>{monthTitle(heatmapYear, yearCalMonth)}</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => shiftYearCalMonth(1)}
              disabled={heatmapYear > todayY || (heatmapYear === todayY && yearCalMonth >= todayM)}
            >
              <i className="fa-solid fa-chevron-right" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="auth-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {summary && (
        <div className="kpi-row" style={{ marginBottom: 20 }}>
          <KpiCard label="Лучшая серия" value={summary.bestStreak} sub="дней подряд" />
          <KpiCard label="Среднее/день" value={summary.avgPerDay} sub={`за ${monthTitle(summaryYear, summaryMonth)}`} />
          <KpiCard label="Успешность" value={`${summary.monthlyRate}%`} sub="выполнено слотов" />
          <KpiCard label="Идеальных дней" value={summary.perfectDays} sub={`из ${dim} дн.`} />
        </div>
      )}

      <div className="stats-grid-pair">

        <div className="card" style={{ padding: 16 }}>
          <div className="section-title">{habitTitle}</div>
          {habits.length === 0 ? (
            <p style={{ color: 'var(--text2)', fontSize: 13 }}>Добавьте привычки на странице «Привычки».</p>
          ) : (
            habits.map(habit => (
              <div key={habit.id} className="stat-row-item">
                <i className={`fa-solid ${habit.icon}`} style={{ color: habit.color, width: 14 }} />
                <span className="name">{habit.name}</span>
                <div className="stat-prog">
                  <div className="stat-prog-fill" style={{ width: `${habit.completionRate}%`, background: habit.color }} />
                </div>
                <span className="pct">{habit.completionRate}%</span>
              </div>
            ))
          )}
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="section-title">{secondCardTitle}</div>
          {period === 'week' && weekBars.length > 0 && <BarChart data={weekBars} height={120} />}
          {period !== 'week' && monthBars.length > 0 && <BarChart data={monthBars} height={120} />}
        </div>

      </div>

      <div className="stats-grid-pair stats-heatmap-calendar">
        <div className="card stats-compact-card stats-heatmap-card">
          <div className="section-title stats-compact-title">
            Карта активности — {heatmapY}
            {' '}
            ({(heatmapData || []).length || '…'} дн.)
          </div>
          <div
            className={`heatmap heatmap-stats-compact${(heatmapData || []).length > 100 ? ' heatmap-year-full' : ''}`}
          >
            {(heatmapData || []).map((level, i) => (
              <div key={i} className={`hm ${level}`} />
            ))}
          </div>
          <div className="stats-heatmap-legend-wrap">
            <HeatmapLegend />
          </div>
        </div>

        <div className="card stats-compact-card stats-calendar-card">
          <div className="section-title stats-compact-title">{monthTitle(calYear, calMonth)}</div>
          <div className="stats-calendar-compact">
            <MiniCalendar year={calYear} month={calMonth} data={calendarData} todayStr={todayStr} />
          </div>
        </div>
      </div>

    </div>
  )
}

function HeatmapLegend() {
  return (
    <div className="stats-heatmap-legend">
      нет
      {['', 'l1', 'l2', 'l3', 'l4'].map(l => (
        <div key={l || 'empty'} className={`hm ${l}`.trim()} />
      ))}
      много
    </div>
  )
}
