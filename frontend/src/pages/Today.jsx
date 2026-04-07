import { useHabits } from '../context/HabitsContext'
import { useStats } from '../hooks/useStats'
import HabitItem from '../components/HabitItem'
import KpiCard from '../components/KpiCard'
import BarChart from '../components/BarChart'
import MiniCalendar from '../components/MiniCalendar'

const WEEK_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const TODAY_STR   = new Date().toISOString().split('T')[0]

export default function Today() {
  const { habits, complete, uncomplete } = useHabits()
  const { summary, calendarData, weeklyData } = useStats(2026, 4)

  const todayHabits = habits.filter(h => h.isScheduledToday)
  const doneCount   = todayHabits.filter(h => h.completedToday).length
  const pct         = todayHabits.length
    ? Math.round(doneCount / todayHabits.length * 100)
    : 0

  function handleToggle(habit) {
    habit.completedToday ? uncomplete(habit.id) : complete(habit.id)
  }

  const weekBars = weeklyData.map((value, i) => ({
    label: WEEK_LABELS[i],
    value,
    muted: i === 6,          // воскресенье — ещё не закончилось
    highlight: i === 0,      // сегодня понедельник в демо
  }))

  return (
    <div className="page">

      {summary && (
        <div className="kpi-row">
          <KpiCard label="Серия"     value={summary.currentStreak} sub="лучший результат" icon="fa-fire" />
          <KpiCard label="Сегодня"   value={`${doneCount} / ${todayHabits.length}`} sub={`осталось ${todayHabits.length - doneCount}`} />
          <KpiCard label="За месяц"  value={`${summary.monthlyRate}%`} sub="+5% к прошлому" />
          <KpiCard label="Очки XP"   value={summary.xpPoints.toLocaleString()} sub="+40 сегодня" />
        </div>
      )}

      <div className="two-col">

        {/* Список привычек */}
        <div className="card">
          <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Привычки</span>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>{pct}%</span>
          </div>
          <div style={{ padding: '0 16px' }}>
            <div className="prog-wrap">
              <div className="prog-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {todayHabits.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>
              Нет привычек на сегодня
            </div>
          )}

          {todayHabits.map(habit => (
            <HabitItem key={habit.id} habit={habit} onToggle={handleToggle} />
          ))}
        </div>

        {/* Боковая колонка */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div className="card" style={{ padding: 16 }}>
            <div className="section-title">Апрель 2026</div>
            <MiniCalendar year={2026} month={4} data={calendarData} todayStr={TODAY_STR} />
          </div>

          {weekBars.length > 0 && (
            <div className="card" style={{ padding: 16 }}>
              <div className="section-title">Эта неделя</div>
              <BarChart data={weekBars} height={80} />
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
