// Миникалендарь на один месяц
// Props:
//   year, month (1–12)
//   data     — объект { 'YYYY-MM-DD': 'done' | 'partial' | '' }
//   todayStr — строка 'YYYY-MM-DD' для подсветки текущего дня

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export default function MiniCalendar({ year, month, data = {}, todayStr }) {
  const firstDate    = new Date(year, month - 1, 1)
  const firstDayOfWeek = (firstDate.getDay() + 6) % 7  // Пн = 0
  const daysInMonth  = new Date(year, month, 0).getDate()

  const todayDay = todayStr ? parseInt(todayStr.split('-')[2]) : null
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}-`

  const cells = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div>
      <div className="cal-grid">
        {DAY_NAMES.map(n => (
          <div key={n} className="cal-dname">{n}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="cal-cell empty" />

          const dateStr = `${monthPrefix}${String(d).padStart(2, '0')}`
          const isToday  = d === todayDay
          const isFuture = todayDay !== null && d > todayDay
          const status   = data[dateStr] || ''

          return (
            <div
              key={i}
              className={[
                'cal-cell',
                isToday  ? 'today'   : '',
                isFuture ? 'future'  : '',
                status,
              ].filter(Boolean).join(' ')}
            >
              {d}
            </div>
          )
        })}
      </div>
    </div>
  )
}
