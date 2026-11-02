// Browser only. Shrinks a photo from the camera or gallery to a small JPEG data URL, so it can be
// saved with the record itself: no file storage needed, and a 4 MB phone photo becomes about 10 KB.
export async function resizeImage(file: File, maxSide = 192, quality = 0.75): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('not an image')
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('no canvas')
  // White behind transparent PNGs, since JPEG has no transparency.
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', quality)
}
