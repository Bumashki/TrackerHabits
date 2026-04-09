/**
 * Календарная дата YYYY-MM-DD в часовом поясе Europe/Moscow.
 * Совпадает с отображением времени в чате и «сегодня» для привычек у пользователей РФ.
 * Не использовать toISOString() — он даёт UTC-дату и ломает «сегодня» у границ суток.
 */
export function localDateISO(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}
