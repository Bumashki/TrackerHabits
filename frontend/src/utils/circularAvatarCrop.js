/**
 * Рисует круглую область превью в canvas и масштабирует до outputSize — JPEG data URL.
 */
export function exportCircularJpegDataUrl(
  img,
  offsetX,
  offsetY,
  dw,
  dh,
  viewSize,
  outputSize = 256,
  quality = 0.88
) {
  const canvas = document.createElement('canvas')
  canvas.width = viewSize
  canvas.height = viewSize
  const ctx = canvas.getContext('2d')
  ctx.beginPath()
  ctx.arc(viewSize / 2, viewSize / 2, viewSize / 2, 0, Math.PI * 2)
  ctx.clip()
  ctx.drawImage(img, offsetX, offsetY, dw, dh)

  const out = document.createElement('canvas')
  out.width = outputSize
  out.height = outputSize
  out.getContext('2d').drawImage(canvas, 0, 0, viewSize, viewSize, 0, 0, outputSize, outputSize)
  return out.toDataURL('image/jpeg', quality)
}

export function clampAvatarOffset(ox, oy, dw, dh, viewSize) {
  const minX = viewSize - dw
  const minY = viewSize - dh
  return {
    x: Math.min(0, Math.max(minX, ox)),
    y: Math.min(0, Math.max(minY, oy)),
  }
}

export function computeCoverDimensions(naturalW, naturalH, viewSize, zoom) {
  const base = Math.max(viewSize / naturalW, viewSize / naturalH)
  const coverScale = base * zoom
  const dw = naturalW * coverScale
  const dh = naturalH * coverScale
  return { dw, dh, coverScale }
}
