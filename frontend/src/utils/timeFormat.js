/** Отображение дат/времени в часовом поясе Москвы (как у целевой аудитории РФ). */
export const APP_TIMEZONE = 'Europe/Moscow'

/**
 * Парсит ISO из API: naive UTC без Z трактуем как UTC (как на бэкенде).
 * Дата без времени (YYYY-MM-DD) — для отображения месяца/года.
 */
export function parseApiDateTime(iso) {
  if (!iso || typeof iso !== 'string') return new Date(NaN)
  const s = iso.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T12:00:00Z`)
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(s) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) {
    return new Date(`${s}Z`)
  }
  return new Date(s)
}

export function formatTimeMoscow(iso) {
  const d = parseApiDateTime(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('ru-RU', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** «в Habits с апреля 2026» — месяц и год по Москве */
export function formatMonthYearJoinedMoscow(isoDate) {
  const d = parseApiDateTime(isoDate)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('ru-RU', {
    timeZone: APP_TIMEZONE,
    month: 'long',
    year: 'numeric',
  })
}

/** Строка даты в шапке (день недели и дата по Москве) */
export function formatTopbarDateMoscow() {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: APP_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
}
