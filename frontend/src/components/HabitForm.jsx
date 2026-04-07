import { useState } from 'react'

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

const ICONS = [
  { value: 'fa-spa',            label: 'Медитация' },
  { value: 'fa-person-running', label: 'Спорт' },
  { value: 'fa-book-open',      label: 'Чтение' },
  { value: 'fa-droplet',        label: 'Вода' },
  { value: 'fa-guitar',         label: 'Музыка' },
  { value: 'fa-note-sticky',    label: 'Письмо' },
  { value: 'fa-dumbbell',       label: 'Тренировка' },
  { value: 'fa-apple-whole',    label: 'Питание' },
]

const CATEGORIES = ['Здоровье', 'Спорт', 'Саморазвитие', 'Творчество', 'Питание']

const EMPTY_FORM = {
  name: '',
  icon: 'fa-spa',
  color: '#2d6a4f',
  category: 'Здоровье',
  schedule: ['mon', 'tue', 'wed', 'thu', 'fri'],
  reminderTime: '08:00',
  goal: '',
}

export default function HabitForm({ habit, onSubmit, onClose }) {
  const [form, setForm] = useState(
    habit
      ? { name: habit.name, icon: habit.icon, color: habit.color, category: habit.category, schedule: habit.schedule, reminderTime: habit.reminderTime, goal: habit.goal ?? '' }
      : EMPTY_FORM
  )

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleDay(key) {
    set('schedule',
      form.schedule.includes(key)
        ? form.schedule.filter(d => d !== key)
        : [...form.schedule, key]
    )
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">

        <div className="form-group full">
          <label className="form-label">Название</label>
          <input
            className="form-input"
            type="text"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Например: утренняя зарядка"
            required
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">Иконка</label>
          <select className="form-select" value={form.icon} onChange={e => set('icon', e.target.value)}>
            {ICONS.map(ic => (
              <option key={ic.value} value={ic.value}>{ic.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Категория</label>
          <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="form-group full">
          <label className="form-label">Дни недели</label>
          <div className="toggle-row">
            {DAYS.map((d, i) => (
              <button
                key={i}
                type="button"
                className={`day-btn ${form.schedule.includes(DAY_KEYS[i]) ? 'on' : ''}`}
                onClick={() => toggleDay(DAY_KEYS[i])}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Напоминание</label>
          <input
            className="form-input"
            type="time"
            value={form.reminderTime}
            onChange={e => set('reminderTime', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Цель</label>
          <input
            className="form-input"
            type="text"
            value={form.goal}
            onChange={e => set('goal', e.target.value)}
            placeholder="20 мин, 2 л, 20 стр..."
          />
        </div>

      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          Отмена
        </button>
        <button type="submit" className="btn btn-primary btn-sm">
          <i className="fa-solid fa-plus" /> {habit ? 'Сохранить' : 'Создать'}
        </button>
      </div>
    </form>
  )
}
