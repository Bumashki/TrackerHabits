import { useLocation } from 'react-router-dom'

const TITLES = {
  '/today':   'Сегодня',
  '/habits':  'Привычки',
  '/stats':   'Статистика',
  '/friends': 'Друзья',
  '/chat':    'Чат',
  '/profile': 'Профиль',
}

const RU_DAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']
const RU_MON  = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

function formatDate(d) {
  return `${RU_DAYS[d.getDay()]}, ${d.getDate()} ${RU_MON[d.getMonth()]} ${d.getFullYear()}`
}

// Props:
//   onNewHabit() — открывает форму создания привычки (передаётся из Layout)
export default function Topbar({ onNewHabit, onOpenNav }) {
  const { pathname } = useLocation()
  const title = TITLES[pathname] ?? 'Habits'

  return (
    <div className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="topbar-menu-btn"
          aria-label="Открыть меню"
          onClick={onOpenNav}
        >
          <i className="fa-solid fa-bars" />
        </button>
        <span className="topbar-title">{title}</span>
        <span className="topbar-date">{formatDate(new Date())}</span>
      </div>
      <button className="btn btn-primary btn-sm topbar-new-habit" onClick={onNewHabit}>
        <i className="fa-solid fa-plus" /> <span className="topbar-new-label">Новая привычка</span>
      </button>
    </div>
  )
}
