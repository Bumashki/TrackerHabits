import { useHabits } from '../context/HabitsContext'
import { useStats } from '../hooks/useStats'
import KpiCard from '../components/KpiCard'
import BarChart from '../components/BarChart'
import MiniCalendar from '../components/MiniCalendar'

const MONTH_LABELS = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек']
const TODAY_STR    = new Date().toISOString().split('T')[0]

export default function Stats() {
  const { habits }                                            = useHabits()
  const { summary, calendarData, monthlyData, heatmapData }  = useStats(2026, 4)

  const monthBars = monthlyData.map((value, i) => ({
    label: MONTH_LABELS[i],
    value: value || 0,
    muted: value === 0,
  }))

  return (
    <div className="page">

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Статистика</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-sm">Неделя</button>
          <button className="btn btn-primary btn-sm">Месяц</button>
          <button className="btn btn-ghost btn-sm">Год</button>
        </div>
      </div>

      {summary && (
        <div className="kpi-row" style={{ marginBottom: 20 }}>
          <KpiCard label="Лучшая серия"   value={summary.bestStreak}   sub="Медитация" />
          <KpiCard label="Среднее/день"   value={summary.avgPerDay}    sub="+0.3 к прошлому мес." />
          <KpiCard label="Успешность"     value={`${summary.monthlyRate}%`} sub="+5%" />
          <KpiCard label="Идеальных дней" value={summary.perfectDays}  sub="из 31" />
        </div>
      )}

      <div className="stats-grid-pair">

        {/* По привычкам */}
        <div className="card" style={{ padding: 16 }}>
          <div className="section-title">По привычкам — апрель</div>
          {habits.map(habit => (
            <div key={habit.id} className="stat-row-item">
              <i className={`fa-solid ${habit.icon}`} style={{ color: habit.color, width: 14 }} />
              <span className="name">{habit.name}</span>
              <div className="stat-prog">
                <div className="stat-prog-fill" style={{ width: `${habit.completionRate}%`, background: habit.color }} />
              </div>
              <span className="pct">{habit.completionRate}%</span>
            </div>
          ))}
        </div>

        {/* По месяцам */}
        <div className="card" style={{ padding: 16 }}>
          <div className="section-title">По месяцам — 2026</div>
          {monthBars.length > 0 && <BarChart data={monthBars} height={120} />}
        </div>

      </div>

      <div className="stats-grid-pair stats-heatmap-calendar">
        <div className="card stats-compact-card stats-heatmap-card">
          <div className="section-title stats-compact-title">Карта активности — 2026</div>
          <div className="heatmap heatmap-stats-compact">
            {heatmapData.map((level, i) => (
              <div key={i} className={`hm ${level}`} />
            ))}
          </div>
          <div className="stats-heatmap-legend-wrap">
            <HeatmapLegend />
          </div>
        </div>

        <div className="card stats-compact-card stats-calendar-card">
          <div className="section-title stats-compact-title">Апрель 2026</div>
          <div className="stats-calendar-compact">
            <MiniCalendar year={2026} month={4} data={calendarData} todayStr={TODAY_STR} />
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
        <div key={l} className={`hm ${l}`} />
      ))}
      много
    </div>
  )
}
