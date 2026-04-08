import { useOutletContext } from 'react-router-dom'
import { useHabits } from '../context/HabitsContext'

// Теги статуса
function StatusTag({ isActive, streak }) {
  if (!isActive)    return <span className="tag tag-neutral">пауза</span>
  if (streak === 0) return <span className="tag tag-warn">новая</span>
  return <span className="tag tag-green">активна</span>
}

export default function Habits() {
  const { habits, remove } = useHabits()
  const { openEdit }       = useOutletContext()   



  

  return (
    <div className="page">

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Все привычки</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
            {habits.length} {habits.length === 1 ? 'привычка' : 'привычек'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {habits.length === 0 && (
          <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text2)' }}>
            Нет привычек. Нажми «Новая привычка» чтобы добавить.
          </div>
        )}

        {habits.map(habit => (
          <div key={habit.id} className="habit-card">

            <div className="habit-card-icon" style={{ color: habit.color }}>
              <i className={`fa-solid ${habit.icon}`} />
            </div>

            <div className="habit-card-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="habit-card-name">{habit.name}</span>
                <StatusTag isActive={habit.isActive} streak={habit.streak} />
              </div>
              <div className="habit-card-sub">
                {habit.goal && <>{habit.goal} &middot; </>}
                {habit.category}
                {habit.reminderTime && <> &middot; {habit.reminderTime}</>}
              </div>
              <div className="habit-card-bar">
                <div
                  className="habit-card-bar-fill"
                  style={{ width: `${habit.completionRate}%`, background: habit.color }}
                />
              </div>
            </div>

            <div style={{ textAlign: 'right', minWidth: 50 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>
                {habit.streak > 0
                  ? <><i className="fa-solid fa-fire" style={{ color: 'var(--warn)' }} /> {habit.streak}</>
                  : <span style={{ color: 'var(--text3)' }}>— 0</span>
                }
              </div>
              <div style={{ fontSize: 10, color: 'var(--text2)' }}>серия</div>
            </div>

            <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => openEdit(habit)}
                title="Редактировать"
              >
                <i className="fa-regular fa-pen-to-square" />
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => remove(habit.id)}
                title="Удалить"
              >
                <i className="fa-regular fa-trash-can" />
              </button>
            </div>

          </div>
        ))}
      </div>
    </div>
  )
}
