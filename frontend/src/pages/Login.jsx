import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, user, ready } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (ready && user) navigate('/today', { replace: true })
  }, [ready, user, navigate])

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      await login(email.trim(), password)
    } catch (err) {
      setError(err.message || 'Ошибка входа')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <i className="fa-solid fa-leaf" />
          <span>Habits</span>
        </div>
        <h1 className="auth-title">Вход</h1>
        <p className="auth-sub">Войдите, чтобы продолжить отслеживать привычки</p>

        <form className="auth-form" onSubmit={onSubmit}>
          {error && <div className="auth-error">{error}</div>}
          <div className="form-group full">
            <label className="form-label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              className="form-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group full">
            <label className="form-label" htmlFor="login-pass">Пароль</label>
            <input
              id="login-pass"
              className="form-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={pending}>
            {pending ? 'Вход…' : 'Войти'}
          </button>
        </form>

        <p className="auth-footer">
          Нет аккаунта? <Link to="/register">Регистрация</Link>
        </p>
      </div>
    </div>
  )
}
