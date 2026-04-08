import { NavLink } from 'react-router-dom'
import { useHabits } from '../context/HabitsContext'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/today',   icon: 'fa-regular fa-circle-check', label: 'Сегодня' },
  { to: '/habits',  icon: 'fa-solid fa-list-ul',        label: 'Привычки' },
  { to: '/stats',   icon: 'fa-solid fa-chart-bar',      label: 'Статистика' },
  { to: '/friends', icon: 'fa-solid fa-users',          label: 'Друзья' },
  { to: '/chat',    icon: 'fa-regular fa-comments',       label: 'Чат' },
  { to: '/profile', icon: 'fa-regular fa-user',         label: 'Профиль' },
]

export default function Sidebar({ onNavigate, open }) {
  const { habits } = useHabits()
  const todayHabits  = habits.filter(h => h.isScheduledToday)
  const doneCount    = todayHabits.filter(h => h.completedToday).length

  return (
    <aside className={`sidebar${open ? ' sidebar-open' : ''}`}>
      <div className="brand">
        <i className="fa-solid fa-leaf" />
        Habits
      </div>

      <nav>
        {NAV.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onNavigate?.()}
          >
            <i className={icon} />
            {label}
            {to === '/today' && todayHabits.length > 0 && (
              <span className="nav-count">{doneCount}/{todayHabits.length}</span>
            )}
            {to === '/habits' && habits.length > 0 && (
              <span className="nav-count">{habits.length}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <SidebarUser habits={habits} onNavigate={onNavigate} />
    </aside>
  )
}

function SidebarUser({ habits, onNavigate }) {
  const { user, logout } = useAuth()
  const streak = habits.reduce((max, h) => Math.max(max, h.streak), 0)
  const initials = user?.initials || user?.name?.slice(0, 2) || '—'
  const name = user?.name || 'Профиль'

  return (
    <div className="sidebar-footer-user">
      <NavLink to="/profile" className="sidebar-user" style={{ textDecoration: 'none' }} onClick={() => onNavigate?.()}>
        <div className="ava">{initials}</div>
        <div>
          <div className="user-name">{name}</div>
          <div className="user-meta">
            <i className="fa-solid fa-fire" style={{ color: 'var(--warn)', fontSize: 10 }} />
            {' '}{streak} {streak === 1 ? 'день' : 'дней'}
          </div>
        </div>
      </NavLink>
      <button type="button" className="sidebar-logout btn btn-ghost btn-sm" onClick={() => { logout(); onNavigate?.() }} title="Выйти">
        <i className="fa-solid fa-arrow-right-from-bracket" />
      </button>
    </div>
  )
}
