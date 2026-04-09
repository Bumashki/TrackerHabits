import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import UserAvatar from '../components/UserAvatar'
import { resizeImageFileToJpegDataUrl } from '../utils/imageResize'

const ACHIEVEMENTS = [
  { icon: 'fa-fire',          label: 'Серия 30+',       unlocked: true },
  { icon: 'fa-person-running',label: '100 пробежек',    unlocked: true },
  { icon: 'fa-book-open',     label: '50 книг',         unlocked: true },
  { icon: 'fa-star',          label: 'Идеальный месяц', unlocked: false },
]

export default function Profile() {
  const { user, saveProfile, saveNotifications } = useAuth()
  const fileInputRef = useRef(null)
  const [avatarBusy, setAvatarBusy] = useState(false)

  const [form, setForm] = useState({
    name: '',
    nickname: '',
    email: '',
    timezone: 'UTC+3',
    language: 'ru',
  })

  useEffect(() => {
    if (!user) return
    setForm({
      name: user.name || '',
      nickname: user.nickname || '',
      email: user.email || '',
      timezone: user.timezone || 'UTC+3',
      language: user.language || 'ru',
    })
  }, [user])

  function handleProfileSubmit(e) {
    e.preventDefault()
    saveProfile(form)
  }

  function handleNotifToggle(key) {
    if (!user) return
    saveNotifications({ [key]: !user.notifications[key] })
  }

  async function handleAvatarFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !file.type.startsWith('image/')) return
    setAvatarBusy(true)
    try {
      const dataUrl = await resizeImageFileToJpegDataUrl(file, 160, 0.88)
      await saveProfile({ avatarUrl: dataUrl })
    } catch (err) {
      alert(err.message || 'Не удалось загрузить фото')
    } finally {
      setAvatarBusy(false)
    }
  }

  async function clearAvatar() {
    setAvatarBusy(true)
    try {
      await saveProfile({ avatarUrl: null })
    } catch (err) {
      alert(err.message || 'Ошибка')
    } finally {
      setAvatarBusy(false)
    }
  }

  if (!user) return null

  return (
    <div className="page">

      {/* Шапка профиля */}
      <div className="profile-header">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handleAvatarFile}
        />
        <UserAvatar
          src={user.avatarUrl}
          initials={user.initials}
          color={user.color || '#2d6a4f'}
          size={56}
        />
        <div>
          <div className="profile-name">{user.name}</div>
          <div className="profile-sub">
            {user.nickname && (
              <>
                @{user.nickname} &middot;{' '}
              </>
            )}
            {user.email} &middot; в Habits с{' '}
            {new Date(user.joinedAt).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <span className="tag tag-green"><i className="fa-solid fa-fire" /> Серия {user.currentStreak ?? 0}+</span>
            <span className="tag tag-neutral"><i className="fa-solid fa-person-running" /> 100 пробежек</span>
            <span className="tag tag-neutral"><i className="fa-solid fa-book-open" /> Читатель</span>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', alignSelf: 'flex-start', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={avatarBusy}
            onClick={() => fileInputRef.current?.click()}
          >
            <i className="fa-regular fa-pen-to-square" /> {avatarBusy ? '…' : 'Изменить фото'}
          </button>
          {user.avatarUrl && (
            <button type="button" className="btn btn-ghost btn-sm" disabled={avatarBusy} onClick={clearAvatar}>
              Убрать фото
            </button>
          )}
        </div>
      </div>

      {/* Цифры */}
      <div className="profile-stats">
        <div className="pstat">
          <div className="pstat-val">{user.currentStreak}</div>
          <div className="pstat-lbl"><i className="fa-solid fa-fire" style={{ color: 'var(--warn)' }} /> Текущая серия</div>
        </div>
        <div className="pstat">
          <div className="pstat-val">{user.bestStreak}</div>
          <div className="pstat-lbl">Лучшая серия</div>
        </div>
        <div className="pstat">
          <div className="pstat-val">{user.xpPoints.toLocaleString()}</div>
          <div className="pstat-lbl">Очки XP</div>
        </div>
        <div className="pstat">
          <div className="pstat-val">{user.successRate}%</div>
          <div className="pstat-lbl">Успешность</div>
        </div>
      </div>

      <div className="page-two-col">

        {/* Форма настроек */}
        <div className="card" style={{ padding: 20 }}>
          <div className="section-title">Настройки</div>
          <form onSubmit={handleProfileSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Имя</label>
                <input className="form-input" type="text" value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Никнейм</label>
                <input
                  className="form-input"
                  type="text"
                  value={form.nickname}
                  placeholder="anna_m"
                  onChange={e => setForm(p => ({ ...p, nickname: e.target.value }))}
                />
                <span style={{ fontSize: 11, color: 'var(--text2)', display: 'block', marginTop: 4 }}>
                  3–32 символа: латиница, цифры, _ (пусто — сбросить ник)
                </span>
              </div>
              <div className="form-group full">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Часовой пояс</label>
                <select className="form-select" value={form.timezone}
                  onChange={e => setForm(p => ({ ...p, timezone: e.target.value }))}>
                  <option value="UTC+3">UTC+3 (Москва)</option>
                  <option value="UTC+5">UTC+5</option>
                  <option value="UTC+0">UTC+0</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Язык</label>
                <select className="form-select" value={form.language}
                  onChange={e => setForm(p => ({ ...p, language: e.target.value }))}>
                  <option value="ru">Русский</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost btn-sm">Отмена</button>
              <button type="submit" className="btn btn-primary btn-sm">Сохранить</button>
            </div>
          </form>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Уведомления */}
          <div className="card" style={{ padding: 16 }}>
            <div className="section-title">Уведомления</div>
            <NotifRow
              label="Ежедневное напоминание"
              sub="09:00 каждый день"
              checked={user.notifications.dailyReminder}
              onChange={() => handleNotifToggle('dailyReminder')}
            />
            <NotifRow
              label="Активность друзей"
              sub="Когда друзья выполняют цели"
              checked={user.notifications.friendActivity}
              onChange={() => handleNotifToggle('friendActivity')}
            />
            <NotifRow
              label="Угроза серии"
              sub="Если день не отмечен к 21:00"
              checked={user.notifications.streakAlert}
              onChange={() => handleNotifToggle('streakAlert')}
            />
          </div>

          {/* Достижения */}
          <div className="card" style={{ padding: 16 }}>
            <div className="section-title">Достижения</div>
            <div className="badge-grid">
              {ACHIEVEMENTS.map((a, i) => (
                <div key={i} className={`badge-item ${a.unlocked ? '' : 'locked'}`}>
                  <div className="badge-icon"><i className={`fa-solid ${a.icon}`} /></div>
                  <div className="badge-name">{a.label}</div>
                  <div className="badge-sub">{a.unlocked ? 'получено' : 'не получено'}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function NotifRow({ label, sub, checked, onChange }) {
  return (
    <div className="notif-row">
      <div className="notif-row-text">
        <b>{label}</b>
        <span>{sub}</span>
      </div>
      <label className="switch">
        <input type="checkbox" checked={checked} onChange={onChange} />
        <span className="slider" />
      </label>
    </div>
  )
}
