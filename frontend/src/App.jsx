import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { HabitsProvider } from './context/HabitsContext'
import Layout from './components/Layout'
import Today   from './pages/Today'
import Habits  from './pages/Habits'
import Stats   from './pages/Stats'
import Friends from './pages/Friends'
import Chat    from './pages/Chat'
import Profile from './pages/Profile'

export default function App() {
  return (
    // HabitsProvider — один источник данных для всех страниц
    <HabitsProvider>
      <BrowserRouter>
        <Routes>
          {/* Layout — общая оболочка: sidebar + topbar + модальное окно */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/today" replace />} />
            <Route path="today"   element={<Today />} />
            <Route path="habits"  element={<Habits />} />
            <Route path="stats"   element={<Stats />} />
            <Route path="friends" element={<Friends />} />
            <Route path="chat"    element={<Chat />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </HabitsProvider>
  )
}
