import { useNavigate } from 'react-router-dom'
import { useFriends } from '../hooks/useFriends'
import { useHabits } from '../context/HabitsContext'

export default function Friends() {
  const navigate = useNavigate()
  const { friends, feed, cheer } = useFriends()
  const { habits } = useHabits()

  // Рейтинг: текущий пользователь + друзья, сортировка по xpThisWeek
  const me = { id: 0, name: 'Анна М. (вы)', initials: 'АМ', color: null, xpThisWeek: 38, isMe: true }
  const leaderboard = [me, ...friends]
    .sort((a, b) => b.xpThisWeek - a.xpThisWeek)

  return (
    <div className="page">

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Друзья</div>
        <button className="btn btn-primary btn-sm">
          <i className="fa-solid fa-user-plus" /> Пригласить
        </button>
      </div>

      <div className="friends-page-grid">

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Список друзей */}
          <div className="card" style={{ padding: 16 }}>
            <div className="section-title">Список друзей</div>

            {friends.map(friend => (
              <div key={friend.id} className="friend-row">
                <FriendAvatar friend={friend} />
                <div className="friend-info">
                  <div className="friend-name-row">
                    {friend.name}
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
                  <button className="btn btn-ghost btn-sm" onClick={() => cheer(friend.id)}>
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
            ))}
          </div>

          {/* Лента */}
          <div className="card" style={{ padding: 16 }}>
            <div className="section-title">Лента активности</div>
            {feed.map(item => (
              <div key={item.id} className="feed-item">
                <FriendAvatar friend={item} size={28} />
                <div style={{ flex: 1 }}>
                  <div>{item.text}</div>
                  <div className="feed-time">
                    {item.time}
                    {item.streak && (
                      <> &middot; <i className="fa-solid fa-fire" style={{ color: 'var(--warn)' }} /> {item.streak}</>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Рейтинг */}
        <div className="card" style={{ padding: 16 }}>
          <div className="section-title">Рейтинг недели</div>

          {leaderboard.map((person, i) => (
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
              </div>
              <span className="lb-score" style={person.isMe ? { color: 'var(--accent)' } : {}}>
                {person.xpThisWeek}
              </span>
            </div>
          ))}
        </div>

      </div>
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
  // Текущий пользователь — использует стандартный класс ava
  return <div className="ava" style={style}>{friend.initials}</div>
}
