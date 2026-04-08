import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFriends } from '../hooks/useFriends'
import { useAuth } from '../context/AuthContext'
import { inviteFriend, searchFriendsByNickname, addFriendRequest } from '../api/friendsApi'

export default function Friends() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { friends, feed, cheer, loading, error, refetch } = useFriends()

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteErr, setInviteErr] = useState(null)
  const [inviteOk, setInviteOk] = useState(null)

  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchBusy, setSearchBusy] = useState(false)
  const [searchErr, setSearchErr] = useState(null)
  const [addBusyId, setAddBusyId] = useState(null)

  useEffect(() => {
    let cancelled = false
    const q = searchQ.trim().toLowerCase()
    if (q.length < 2 || !/^[a-z0-9_]+$/.test(q)) {
      setSearchResults([])
      setSearchBusy(false)
      return undefined
    }
    const t = setTimeout(async () => {
      setSearchBusy(true)
      setSearchErr(null)
      try {
        const rows = await searchFriendsByNickname(q)
        if (!cancelled) setSearchResults(rows)
      } catch (e) {
        if (!cancelled) {
          setSearchResults([])
          setSearchErr(e.message)
        }
      } finally {
        if (!cancelled) setSearchBusy(false)
      }
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [searchQ])

  async function handleAddFriend(friendId) {
    setAddBusyId(friendId)
    setSearchErr(null)
    try {
      await addFriendRequest(friendId)
      await refetch()
      setSearchResults(prev => prev.filter(r => r.id !== friendId))
    } catch (e) {
      setSearchErr(e.message)
    } finally {
      setAddBusyId(null)
    }
  }

  const me =
    user &&
    ({
      id: user.id,
      name: `${user.name} (вы)`,
      nickname: user.nickname,
      initials: user.initials || user.name?.slice(0, 2) || '?',
      color: null,
      xpThisWeek: user.xpThisWeek ?? user.xpPoints ?? 0,
      isMe: true,
    })

  const leaderboard = me ? [me, ...friends].sort((a, b) => b.xpThisWeek - a.xpThisWeek) : [...friends]

  async function onInviteSubmit(e) {
    e.preventDefault()
    setInviteErr(null)
    setInviteOk(null)
    const em = inviteEmail.trim()
    if (!em) return
    setInviteBusy(true)
    try {
      await inviteFriend(em)
      setInviteOk(`Приглашение отправлено на ${em}`)
      setInviteEmail('')
      await refetch()
    } catch (err) {
      setInviteErr(err.message || 'Не удалось отправить')
    } finally {
      setInviteBusy(false)
    }
  }

  return (
    <div className="page">

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Друзья</div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => {
            setInviteErr(null)
            setInviteOk(null)
            setInviteOpen(true)
          }}
        >
          <i className="fa-solid fa-user-plus" /> Пригласить
        </button>
      </div>

      {error && (
        <div className="auth-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div className="section-title">Найти по никнейму</div>
        <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
          Введите от 2 символов: латиница, цифры, подчёркивание (как при регистрации).
        </p>
        <input
          className="form-input"
          type="text"
          placeholder="anna, katya, misha…"
          value={searchQ}
          onChange={e => setSearchQ(e.target.value)}
          autoComplete="off"
          style={{ maxWidth: 360 }}
        />
        {searchBusy && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8 }}>Поиск…</div>}
        {searchErr && <div className="auth-error" style={{ marginTop: 10 }}>{searchErr}</div>}
        {searchResults.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {searchResults.map(row => (
              <div
                key={row.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r)',
                }}
              >
                <FriendAvatar friend={row} size={32} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{row.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>@{row.nickname}</div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={addBusyId === row.id}
                  onClick={() => handleAddFriend(row.id)}
                >
                  {addBusyId === row.id ? '…' : 'В друзья'}
                </button>
              </div>
            ))}
          </div>
        )}
        {(() => {
          const q = searchQ.trim().toLowerCase()
          const qOk = /^[a-z0-9_]{2,32}$/.test(q)
          return !searchBusy && qOk && searchResults.length === 0 && !searchErr
        })() && (
          <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 10 }}>Никого не найдено.</p>
        )}
      </div>

      {loading && friends.length === 0 && feed.length === 0 && !error && (
        <div className="auth-loading-inner" style={{ padding: 24 }}>
          Загрузка…
        </div>
      )}

      <div className="friends-page-grid">

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div className="card" style={{ padding: 16 }}>
            <div className="section-title">Список друзей</div>

            {friends.length === 0 && !loading ? (
              <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 8 }}>
                Пока нет друзей. Найдите по никнейму выше или отправьте приглашение по email.
              </p>
            ) : (
              friends.map(friend => (
                <div key={friend.id} className="friend-row">
                  <FriendAvatar friend={friend} />
                  <div className="friend-info">
                    <div className="friend-name-row">
                      {friend.name}
                      {friend.nickname && (
                        <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 400 }}>
                          {' '}@{friend.nickname}
                        </span>
                      )}
                      <div className={friend.isOnline ? 'online' : 'offline'} />
                      <span style={{ fontSize: 11, color: friend.isOnline ? '#16a34a' : 'var(--text2)', fontWeight: 400 }}>
                        {friend.isOnline ? 'онлайн' : friend.lastSeen}
                      </span>
                    </div>
                    <div className="friend-sub">
                      <i className="fa-solid fa-fire" style={{ color: 'var(--warn)' }} />
                      {' '}{friend.streak} {friend.streak === 1 ? 'день' : 'дней'}
                      {' '}&middot; {friend.completedToday}/{friend.totalToday} сегодня
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => cheer(friend.id)}>
                      <i className="fa-regular fa-thumbs-up" /> Похвалить
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => navigate('/chat', { state: { friendId: friend.id } })}
                      title="Написать в чате"
                    >
                      <i className="fa-regular fa-comment" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div className="section-title">Лента активности</div>
            {feed.length === 0 && !loading ? (
              <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 8 }}>Событий пока нет.</p>
            ) : (
              feed.map(item => (
                <div key={item.id} className="feed-item">
                  <FriendAvatar friend={{ initials: item.initials, color: item.color }} size={28} />
                  <div style={{ flex: 1 }}>
                    <div>{item.text}</div>
                    <div className="feed-time">
                      {item.time}
                      {item.streak != null && item.streak > 0 && (
                        <> &middot; <i className="fa-solid fa-fire" style={{ color: 'var(--warn)' }} /> {item.streak}</>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="section-title">Рейтинг недели</div>

          {!me ? (
            <p style={{ color: 'var(--text2)', fontSize: 13 }}>Войдите, чтобы видеть свой рейтинг.</p>
          ) : (
            leaderboard.map((person, i) => (
              <div
                key={person.id}
                className="lb-row"
                style={person.isMe ? { background: 'var(--accent-bg)', borderRadius: 4, padding: '8px 4px' } : {}}
              >
                <span className="lb-pos" style={i === 0 ? { color: 'var(--warn)' } : {}}>
                  {i + 1}
                </span>
                <FriendAvatar friend={person} size={28} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{person.name}</div>
                  {person.nickname && (
                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>@{person.nickname}</div>
                  )}
                </div>
                <span className="lb-score" style={person.isMe ? { color: 'var(--accent)' } : {}}>
                  {person.xpThisWeek}
                </span>
              </div>
            ))
          )}
        </div>

      </div>

      {inviteOpen && (
        <div className="overlay open" role="presentation" onClick={() => !inviteBusy && setInviteOpen(false)}>
          <div className="modal" role="dialog" aria-labelledby="invite-title" onClick={e => e.stopPropagation()}>
            <h2 id="invite-title" className="modal-title">Пригласить друга</h2>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
              Укажите email — мы отправим приглашение (демо: запрос на сервер).
            </p>
            <form onSubmit={onInviteSubmit}>
              <label className="form-label" htmlFor="invite-email">Email</label>
              <input
                id="invite-email"
                className="form-input"
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="friend@example.com"
                required
                autoFocus
              />
              {inviteErr && <div className="auth-error" style={{ marginTop: 10 }}>{inviteErr}</div>}
              {inviteOk && <div className="auth-success" style={{ marginTop: 10 }}>{inviteOk}</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setInviteOpen(false)} disabled={inviteBusy}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={inviteBusy}>
                  {inviteBusy ? 'Отправка…' : 'Отправить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function FriendAvatar({ friend, size = 34 }) {
  const style = {
    width: size,
    height: size,
    fontSize: size < 34 ? 10 : 11,
    flexShrink: 0,
  }
  if (friend.color) {
    return (
      <div className="friend-ava" style={{ ...style, background: friend.color }}>
        {friend.initials}
      </div>
    )
  }
  return <div className="ava" style={style}>{friend.initials}</div>
}
