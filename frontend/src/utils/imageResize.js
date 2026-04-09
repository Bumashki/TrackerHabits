/** Сжимает изображение до квадрата maxSize и возвращает JPEG data URL (для аватара). */
export function resizeImageFileToJpegDataUrl(file, maxSize = 160, quality = 0.88) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const w = img.naturalWidth
        const h = img.naturalHeight
        if (!w || !h) {
          reject(new Error('Пустое изображение'))
          return
        }
        const scale = Math.min(maxSize / w, maxSize / h, 1)
        const cw = Math.round(w * scale)
        const ch = Math.round(h * scale)
        const canvas = document.createElement('canvas')
        canvas.width = cw
        canvas.height = ch
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, cw, ch)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = () => reject(new Error('Не удалось прочитать изображение'))
      img.src = reader.result
    }
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'))
    reader.readAsDataURL(file)
  })
}
