/**
 * Круглый аватар: картинка (data URL или URL) или инициалы на цветном фоне.
 */
export default function UserAvatar({ src, initials, color = '#2d6a4f', size = 34, className = '' }) {
  const s = {
    width: size,
    height: size,
    fontSize: Math.max(9, Math.round(size * 0.32)),
  }
  const cls = className ? ` ${className}` : ''

  if (src) {
    return (
      <div className={`user-avatar${cls}`} style={s}>
        <img src={src} alt="" />
      </div>
    )
  }

  return (
    <div className={`friend-ava user-avatar-fallback${cls}`} style={{ ...s, background: color }}>
      {initials || '?'}
    </div>
  )
}
