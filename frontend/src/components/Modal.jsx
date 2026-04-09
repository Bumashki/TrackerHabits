import { useEffect } from 'react'

export default function Modal({ title, open, onClose, children, className = '' }) {
  // Закрытие по Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="overlay open"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className={`modal ${className}`.trim()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose} aria-label="Закрыть">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
