// ── Image helpers for the photo-to-recipe feature ───────────────────
// Phone photos are often 3–10 MB. We downscale to a sane max dimension and
// re-encode as JPEG to keep the upload small and the vision call fast.
//
// Size matters a LOT here: vision models bill tokens by image resolution, and
// Groq's free tier allows only 8,000 tokens/minute. A 1024px photo can cost
// ~3,000+ tokens on its own, which blows the budget in a single request. 768px
// is still plenty of detail to identify a dish and roughly halves the cost.

const MAX_DIMENSION = 768    // px, longest edge
const JPEG_QUALITY  = 0.72

/**
 * Takes a File (from <input type="file"> or camera) and returns a compressed
 * JPEG data URL (string starting with "data:image/jpeg;base64,").
 */
export function fileToCompressedDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      reject(new Error('Please choose an image file'))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read that file'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Could not load that image'))
      img.onload = () => {
        let { width, height } = img
        if (width > height && width > MAX_DIMENSION) {
          height = Math.round(height * (MAX_DIMENSION / width))
          width = MAX_DIMENSION
        } else if (height >= width && height > MAX_DIMENSION) {
          width = Math.round(width * (MAX_DIMENSION / height))
          height = MAX_DIMENSION
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        try {
          resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
        } catch (e) {
          reject(new Error('Could not process that image'))
        }
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}
