import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register, user, ready } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
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
    if (password.length < 8) {
      setError('Пароль не короче 8 символов')
      return
    }
    const nick = nickname.trim().toLowerCase()
    if (!/^[a-z0-9_]{3,32}$/.test(nick)) {
      setError('Никнейм: 3–32 символа, латиница, цифры и подчёркивание')
      return
    }
    setPending(true)
    try {
      await register(email.trim(), password, name.trim(), nick)
    } catch (err) {
      setError(err.message || 'Ошибка регистрации')
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
        <h1 className="auth-title">Регистрация</h1>
        <p className="auth-sub">Создайте аккаунт — данные хранятся на вашем сервере</p>

        <form className="auth-form" onSubmit={onSubmit}>
          {error && <div className="auth-error">{error}</div>}
          <div className="form-group full">
            <label className="form-label" htmlFor="reg-name">Имя</label>
            <input
              id="reg-name"
              className="form-input"
              type="text"
              autoComplete="name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group full">
            <label className="form-label" htmlFor="reg-nick">Никнейм</label>
            <input
              id="reg-nick"
              className="form-input"
              type="text"
              autoComplete="username"
              placeholder="anna_m"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              required
              minLength={3}
              maxLength={32}
              pattern="[a-zA-Z0-9_]{3,32}"
              title="Латиница, цифры, подчёркивание, 3–32 символа"
            />
            <span style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4, display: 'block' }}>
              Уникальный логин для поиска друзей (латиница, цифры, _)
            </span>
          </div>
          <div className="form-group full">
            <label className="form-label" htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              className="form-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group full">
            <label className="form-label" htmlFor="reg-pass">Пароль (от 8 символов)</label>
            <input
              id="reg-pass"
              className="form-input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={pending}>
            {pending ? 'Создание…' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="auth-footer">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </div>
    </div>
  )
}
