import { useState, useEffect, useRef } from 'react'
import Modal from './Modal'
import {
  exportCircularJpegDataUrl,
  clampAvatarOffset,
  computeCoverDimensions,
} from '../utils/circularAvatarCrop'

const VIEW_SIZE = 300
const OUTPUT_SIZE = 256
const ZOOM_MIN = 1
const ZOOM_MAX = 3

export default function AvatarCropModal({ open, file, onClose, onConfirm, busy }) {
  const imgRef = useRef(null)
  const [objectUrl, setObjectUrl] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [natural, setNatural] = useState({ w: 0, h: 0 })
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragRef = useRef(null)

  useEffect(() => {
    if (!open || !file) {
      setObjectUrl(null)
      setLoadError(null)
      setNatural({ w: 0, h: 0 })
      setZoom(1)
      return
    }
    setLoadError(null)
    const url = URL.createObjectURL(file)
    setObjectUrl(url)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [open, file])

  const { dw, dh } =
    natural.w && natural.h
      ? computeCoverDimensions(natural.w, natural.h, VIEW_SIZE, zoom)
      : { dw: 0, dh: 0 }

  useEffect(() => {
    if (!natural.w || !natural.h) return
    const d = computeCoverDimensions(natural.w, natural.h, VIEW_SIZE, zoom)
    setOffset(
      clampAvatarOffset(
        (VIEW_SIZE - d.dw) / 2,
        (VIEW_SIZE - d.dh) / 2,
        d.dw,
        d.dh,
        VIEW_SIZE
      )
    )
  }, [natural.w, natural.h, zoom])

  function onImageLoad(e) {
    const w = e.target.naturalWidth
    const h = e.target.naturalHeight
    if (!w || !h) {
      setLoadError('Пустое изображение')
      return
    }
    setNatural({ w, h })
  }

  const onPointerDown = e => {
    if (busy || !natural.w) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      pid: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      ox: offset.x,
      oy: offset.y,
    }
  }

  const onPointerMove = e => {
    const d = dragRef.current
    if (!d || d.pid !== e.pointerId || !natural.w || !natural.h) return
    const dim = computeCoverDimensions(natural.w, natural.h, VIEW_SIZE, zoom)
    const nx = d.ox + (e.clientX - d.sx)
    const ny = d.oy + (e.clientY - d.sy)
    setOffset(clampAvatarOffset(nx, ny, dim.dw, dim.dh, VIEW_SIZE))
  }

  const onPointerUp = e => {
    const dr = dragRef.current
    if (dr && dr.pid === e.pointerId) dragRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  async function handleSave() {
    const img = imgRef.current
    if (!img?.naturalWidth || !natural.w) return
    const dim = computeCoverDimensions(natural.w, natural.h, VIEW_SIZE, zoom)
    const dataUrl = exportCircularJpegDataUrl(
      img,
      offset.x,
      offset.y,
      dim.dw,
      dim.dh,
      VIEW_SIZE,
      OUTPUT_SIZE,
      0.88
    )
    await onConfirm(dataUrl)
  }

  const close = busy ? () => {} : onClose

  if (!open) return null

  return (
    <Modal title="Фото для аватара" open={open} onClose={close} className="modal-avatar-crop">
      <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14 }}>
        Перетащите фото в круге, чтобы выбрать область. Масштаб — ползунок ниже.
      </p>

      {loadError && (
        <div className="auth-error" style={{ marginBottom: 12, fontSize: 13 }}>
          {loadError}
        </div>
      )}

      <div className="avatar-crop-stage">
        <div
          className="avatar-crop-ring"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ touchAction: 'none', cursor: busy || !natural.w ? 'default' : 'grab' }}
        >
          {objectUrl && (
            <img
              key={objectUrl}
              ref={imgRef}
              alt=""
              src={objectUrl}
              draggable={false}
              className="avatar-crop-img"
              style={{
                width: dw || undefined,
                height: dh || undefined,
                left: offset.x,
                top: offset.y,
              }}
              onLoad={onImageLoad}
              onError={() => setLoadError('Не удалось открыть файл. Выберите JPEG или PNG.')}
            />
          )}
        </div>
      </div>

      <div className="avatar-crop-zoom">
        <span className="avatar-crop-zoom-label">Масштаб</span>
        <input
          type="range"
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={0.02}
          value={zoom}
          disabled={busy || !natural.w}
          onChange={e => setZoom(Number(e.target.value))}
        />
      </div>

      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={close}>
          Отмена
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy || !natural.w || !!loadError}
          onClick={handleSave}
        >
          {busy ? 'Сохранение…' : 'Сохранить'}
        </button>
      </div>
    </Modal>
  )
}
