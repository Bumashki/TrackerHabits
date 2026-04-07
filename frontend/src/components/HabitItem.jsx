// Строка привычки в списке «Сегодня»
// Props:
//   habit   — объект привычки
//   onToggle(habit) — вызывается при клике на чекбокс
export default function HabitItem({ habit, onToggle }) {
  return (
    <div className="habit-row">
      <div
        className={`check-box ${habit.completedToday ? 'done' : ''}`}
        onClick={() => onToggle(habit)}
        role="checkbox"
        aria-checked={habit.completedToday}
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onToggle(habit)}
      >
        {habit.completedToday && <i className="fa-solid fa-check" />}
      </div>

      <div className="habit-dot" style={{ background: habit.color }} />

      <div style={{ flex: 1 }}>
        <div className={`habit-name ${habit.completedToday ? 'done' : ''}`}>
          {habit.name}
        </div>
        <div className="habit-meta">
          {habit.goal && <>{habit.goal} &middot; </>}
          {habit.reminderTime || 'каждый день'}
        </div>
      </div>

      <div className="streak">
        {habit.streak > 0
          ? <><i className="fa-solid fa-fire" /> {habit.streak}</>
          : <span style={{ color: 'var(--text3)' }}>— 0</span>
        }
      </div>
    </div>
  )
}
