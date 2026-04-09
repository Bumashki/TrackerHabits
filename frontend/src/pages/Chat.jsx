import { useState, useEffect, useRef, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useFriends } from '../hooks/useFriends'
import { useAuth } from '../hooks/useAuth'
import { getMessages, sendMessage } from '../api/messagesApi'
import UserAvatar from '../components/UserAvatar'

/** Интервал опроса открытого диалога (входящие без перезагрузки страницы) */
const CHAT_POLL_MS = 3500
/** Реже обновляем остальные диалоги — превью в списке (ограничение числа параллельных запросов) */
const CHAT_SIDEBAR_POLL_MS = 8000
const CHAT_SIDEBAR_POLL_MAX_FRIENDS = 40

/** Превью последнего сообщения в списке диалогов (как в мессенджерах: «Вы: …» для своих) */
const CHAT_PREVIEW_MAX = 80

function chatListPreviewLine(last) {
  if (!last?.text) return ''
  const raw = String(last.text).trim()
  if (!raw) return ''
  const clipped = raw.length > CHAT_PREVIEW_MAX ? `${raw.slice(0, CHAT_PREVIEW_MAX - 1)}…` : raw
  return last.authorId === 'me' ? `Вы: ${clipped}` : clipped
}

function mapMessage(m, myId, friendId) {
  const isMine = m.fromUserId === myId
  return {
    id: String(m.id),
    authorId: isMine ? 'me' : friendId,
    text: m.body,
    time: new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
  }
}

function FriendAvatar({ friend, size = 34 }) {
  return (
    <UserAvatar
      src={friend.avatarUrl}
      initials={friend.initials}
      color={friend.color || '#2d6a4f'}
      size={size}
    />
  )
}

export default function Chat() {
  const { user } = useAuth()
  const { friends, loading } = useFriends()

  const meInChat = useMemo(
    () => ({
      id: 'me',
      name: 'Вы',
      initials: user?.initials || user?.name?.slice(0, 2) || '?',
      color: user?.color || '#2d6a4f',
      avatarUrl: user?.avatarUrl,
    }),
    [user]
  )
  const location = useLocation()
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState(null)
  const [messagesByFriend, setMessagesByFriend] = useState({})
  const [draft, setDraft] = useState('')
  const [mobileThread, setMobileThread] = useState(false)
  const [msgLoading, setMsgLoading] = useState(false)
  const [msgError, setMsgError] = useState(null)
  const [sendBusy, setSendBusy] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    const id = location.state?.friendId
    if (id && friends.some(f => f.id === id)) {
      setSelectedId(id)
      setMobileThread(true)
    }
  }, [location.state, friends])

  useEffect(() => {
    if (!selectedId || !user?.id) return
    let cancelled = false
    setMsgLoading(true)
    setMsgError(null)
    getMessages(selectedId)
      .then(rows => {
        if (cancelled) return
        setMessagesByFriend(prev => ({
          ...prev,
          [selectedId]: (rows || []).map(m => mapMessage(m, user.id, selectedId)),
        }))
      })
      .catch(e => {
        if (!cancelled) setMsgError(e.message)
      })
      .finally(() => {
        if (!cancelled) setMsgLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedId, user?.id])

  useEffect(() => {
    if (!selectedId || !user?.id) return
    let cancelled = false
    let busy = false

    function mergeIfChanged(prev, friendId, mapped) {
      const cur = prev[friendId] || []
      const lastCur = cur[cur.length - 1]?.id
      const lastNew = mapped[mapped.length - 1]?.id
      if (cur.length === mapped.length && lastCur === lastNew) return prev
      return { ...prev, [friendId]: mapped }
    }

    async function poll() {
      if (cancelled || document.visibilityState !== 'visible' || busy) return
      busy = true
      try {
        const rows = await getMessages(selectedId)
        if (cancelled) return
        const mapped = (rows || []).map(m => mapMessage(m, user.id, selectedId))
        setMessagesByFriend(prev => mergeIfChanged(prev, selectedId, mapped))
      } catch {
        /* тихо: сеть/таймаут — не засыпаем чат ошибками при фоновом опросе */
      } finally {
        busy = false
      }
    }

    const intervalId = setInterval(poll, CHAT_POLL_MS)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') poll()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [selectedId, user?.id])

  useEffect(() => {
    if (!user?.id || friends.length === 0) return
    let cancelled = false
    let busy = false

    async function pollOthers() {
      if (cancelled || document.visibilityState !== 'visible' || busy) return
      const ids = friends
        .map(f => f.id)
        .filter(id => id !== selectedId)
        .slice(0, CHAT_SIDEBAR_POLL_MAX_FRIENDS)
      if (ids.length === 0) return
      busy = true
      try {
        const results = await Promise.all(ids.map(id => getMessages(id).catch(() => [])))
        if (cancelled) return
        setMessagesByFriend(prev => {
          const next = { ...prev }
          let changed = false
          ids.forEach((fid, i) => {
            const mapped = (results[i] || []).map(m => mapMessage(m, user.id, fid))
            const cur = next[fid] || []
            const lastCur = cur[cur.length - 1]?.id
            const lastNew = mapped[mapped.length - 1]?.id
            if (cur.length !== mapped.length || lastCur !== lastNew) {
              next[fid] = mapped
              changed = true
            }
          })
          return changed ? next : prev
        })
      } finally {
        busy = false
      }
    }

    const intervalId = setInterval(pollOthers, CHAT_SIDEBAR_POLL_MS)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') pollOthers()
    }
    document.addEventListener('visibilitychange', onVisibility)
    pollOthers()

    return () => {
      cancelled = true
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [friends, selectedId, user?.id])

  const selected = friends.find(f => f.id === selectedId)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedId, messagesByFriend])

  async function send() {
    const t = draft.trim()
    if (!t || !selectedId || !user?.id) return
    setSendBusy(true)
    setMsgError(null)
    try {
      const m = await sendMessage(selectedId, t)
      const mapped = mapMessage(m, user.id, selectedId)
      setMessagesByFriend(prev => ({
        ...prev,
        [selectedId]: [...(prev[selectedId] || []), mapped],
      }))
      setDraft('')
    } catch (e) {
      setMsgError(e.message)
    } finally {
      setSendBusy(false)
    }
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
          <div className="chat-page-sub">Сообщения сохраняются на сервере</div>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/friends')}>
          <i className="fa-solid fa-users" /> К списку друзей
        </button>
      </div>

      <div className="card chat-layout">
        <div
          className={`chat-list-panel ${selectedId && mobileThread ? 'chat-panel-hidden-mobile' : ''}`}
        >
          <div className="section-title chat-list-section-title">Диалоги</div>
          {friends.map(f => {
            const msgs = messagesByFriend[f.id] || []
            const last = msgs[msgs.length - 1]
            const preview = last ? chatListPreviewLine(last) : ''
            const previewTitle = last?.text?.trim() ? last.text.trim() : undefined
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
                  <div className="chat-list-preview" title={previewTitle}>
                    {preview || 'Написать первой…'}
                  </div>
                </div>
                <div className={f.isOnline ? 'online' : 'offline'} title={f.isOnline ? 'онлайн' : 'офлайн'} />
              </button>
            )
          })}
        </div>

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

              {msgError && (
                <div className="auth-error" style={{ margin: '8px 12px 0', fontSize: 12 }}>
                  {msgError}
                </div>
              )}

              <div className="chat-messages">
                {msgLoading && (
                  <p style={{ color: 'var(--text2)', fontSize: 13, padding: '8px 0' }}>Загрузка сообщений…</p>
                )}
                {!msgLoading &&
                  (messagesByFriend[selected.id] || []).map(m => {
                    const isMine = m.authorId === 'me'
                    const author = isMine ? meInChat : selected
                    return (
                      <div
                        key={m.id}
                        className={`chat-bubble-row ${isMine ? 'mine' : 'theirs'}`}
                      >
                        <FriendAvatar friend={author} size={28} />
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
                  disabled={sendBusy}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      send()
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-primary chat-send"
                  onClick={send}
                  disabled={sendBusy || !draft.trim()}
                >
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
