import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useFriends } from '../hooks/useFriends'

const ME = { id: 'me', name: 'Вы', initials: 'АМ', color: null }

function seedMessages(friends) {
  const byId = {}
  friends.forEach(f => {
    byId[f.id] = [
      {
        id: `${f.id}-1`,
        authorId: f.id,
        text: 'Привет! Как дела с привычками сегодня?',
        time: '10:12',
      },
      {
        id: `${f.id}-2`,
        authorId: 'me',
        text: 'Привет! Всё отлично, уже почти всё отметила.',
        time: '10:14',
      },
    ]
  })
  return byId
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

export default function Chat() {
  const { friends, loading } = useFriends()
  const location = useLocation()
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState(null)
  const [messagesByFriend, setMessagesByFriend] = useState({})
  const [draft, setDraft] = useState('')
  const [mobileThread, setMobileThread] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!friends.length) return
    setMessagesByFriend(prev => (Object.keys(prev).length ? prev : seedMessages(friends)))
  }, [friends])

  useEffect(() => {
    const id = location.state?.friendId
    if (id && friends.some(f => f.id === id)) {
      setSelectedId(id)
      setMobileThread(true)
    }
  }, [location.state, friends])

  const selected = friends.find(f => f.id === selectedId)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedId, messagesByFriend])

  function send() {
    const t = draft.trim()
    if (!t || !selectedId) return
    const list = messagesByFriend[selectedId] || []
    const next = [
      ...list,
      {
        id: `m-${Date.now()}`,
        authorId: 'me',
        text: t,
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      },
    ]
    setMessagesByFriend(prev => ({ ...prev, [selectedId]: next }))
    setDraft('')
  }

  function openThread(id) {
    setSelectedId(id)
    setMobileThread(true)
  }

  function backToList() {
    setMobileThread(false)
  }

  if (loading && !friends.length) {
    return (
      <div className="page">
        <p className="chat-loading">Загрузка…</p>
      </div>
    )
  }

  return (
    <div className="page chat-page">
      <div className="chat-page-header">
        <div>
          <div className="chat-page-title">Чат с друзьями</div>
          <div className="chat-page-sub">Личные сообщения в одном стиле с приложением</div>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/friends')}>
          <i className="fa-solid fa-users" /> К списку друзей
        </button>
      </div>

      <div className="card chat-layout">
        <div
          className={`chat-list-panel ${selectedId && mobileThread ? 'chat-panel-hidden-mobile' : ''}`}
        >
          <div className="section-title" style={{ padding: '0 4px 8px' }}>
            Диалоги
          </div>
          {friends.map(f => {
            const msgs = messagesByFriend[f.id] || []
            const last = msgs[msgs.length - 1]
            return (
              <button
                key={f.id}
                type="button"
                className={`chat-list-item ${selectedId === f.id ? 'active' : ''}`}
                onClick={() => openThread(f.id)}
              >
                <FriendAvatar friend={f} />
                <div className="chat-list-item-body">
                  <div className="chat-list-item-top">
                    <span className="chat-list-name">{f.name}</span>
                    {last && <span className="chat-list-time">{last.time}</span>}
                  </div>
                  <div className="chat-list-preview">
                    {last ? last.text : 'Написать первой…'}
                  </div>
                </div>
                <div className={f.isOnline ? 'online' : 'offline'} title={f.isOnline ? 'онлайн' : 'офлайн'} />
              </button>
            )
          })}
        </div>

        {/* Окно переписки */}
        <div
          className={`chat-thread-panel ${!selectedId ? 'chat-thread-empty' : ''} ${selectedId && mobileThread ? 'chat-thread-mobile-open' : ''}`}
        >
          {!selectedId && (
            <div className="chat-empty-state">
              <i className="fa-regular fa-comments chat-empty-icon" />
              <p>Выберите диалог слева</p>
              <span className="chat-empty-hint">или откройте чат из раздела «Друзья»</span>
            </div>
          )}

          {selected && (
            <>
              <div className="chat-thread-head">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm chat-back-btn"
                  onClick={backToList}
                  aria-label="Назад к списку"
                >
                  <i className="fa-solid fa-chevron-left" />
                </button>
                <FriendAvatar friend={selected} size={36} />
                <div className="chat-thread-head-info">
                  <div className="chat-thread-name">{selected.name}</div>
                  <div className="chat-thread-status">
                    {selected.isOnline ? (
                      <>
                        <span className="online" /> онлайн
                      </>
                    ) : (
                      selected.lastSeen || 'не в сети'
                    )}
                  </div>
                </div>
              </div>

              <div className="chat-messages">
                {(messagesByFriend[selected.id] || []).map(m => {
                  const isMine = m.authorId === 'me'
                  const author = isMine ? ME : selected
                  return (
                    <div
                      key={m.id}
                      className={`chat-bubble-row ${isMine ? 'mine' : 'theirs'}`}
                    >
                      {!isMine && <FriendAvatar friend={author} size={28} />}
                      <div className="chat-bubble-meta">
                        <div className={`chat-bubble ${isMine ? 'chat-bubble-mine' : ''}`}>
                          {m.text}
                        </div>
                        <span className="chat-bubble-time">{m.time}</span>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              <div className="chat-composer">
                <textarea
                  className="form-input chat-input"
                  rows={2}
                  placeholder="Написать сообщение…"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      send()
                    }
                  }}
                />
                <button type="button" className="btn btn-primary chat-send" onClick={send}>
                  <i className="fa-solid fa-paper-plane" />
                  Отправить
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
