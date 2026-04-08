import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { HabitsProvider } from './context/HabitsContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Today   from './pages/Today'
import Habits  from './pages/Habits'
import Stats   from './pages/Stats'
import Friends from './pages/Friends'
import Chat    from './pages/Chat'
import Profile from './pages/Profile'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute />}>
            <Route
              element={(
                <HabitsProvider>
                  <Layout />
                </HabitsProvider>
              )}
            >
              <Route index element={<Navigate to="/today" replace />} />
              <Route path="today"   element={<Today />} />
              <Route path="habits"  element={<Habits />} />
              <Route path="stats"   element={<Stats />} />
              <Route path="friends" element={<Friends />} />
              <Route path="chat"    element={<Chat />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
