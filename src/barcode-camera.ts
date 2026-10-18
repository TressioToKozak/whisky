import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { expandUpce, normalizeBarcode } from './barcode'

const createReader = () => new BrowserMultiFormatReader(new Map<DecodeHintType, unknown>([
  [DecodeHintType.TRY_HARDER, true],
  [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]],
]), { delayBetweenScanAttempts: 180, delayBetweenScanSuccess: 200, tryPlayVideoTimeout: 10000 })

function decoded(text: string, format: BarcodeFormat) {
  const raw = format === BarcodeFormat.UPC_E ? expandUpce(text) : text
  return raw && normalizeBarcode(raw) ? raw : null
}

export async function startBarcodeCamera(video: HTMLVideoElement, signal: AbortSignal, onCode: (code: string) => void) {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new DOMException('Camera unavailable', 'NotSupportedError')
  const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } })
  const stopStream = () => { stream.getTracks().forEach(track => track.stop()); video.srcObject = null }
  if (signal.aborted) { stopStream(); throw new DOMException('Cancelled', 'AbortError') }
  signal.addEventListener('abort', stopStream, { once: true })
  let previous = '', previousTime = 0, finished = false
  try {
    const controls = await createReader().decodeFromStream(stream, video, (result, _error, controls) => {
      if (!result || signal.aborted || finished) return
      const raw = decoded(result.getText(), result.getBarcodeFormat())
      if (!raw) return
      const code = normalizeBarcode(raw)!, now = Date.now()
      // Require two consistent observations to suppress occasional single-frame errors.
      if (code === previous && now - previousTime < 1800) {
        finished = true; controls.stop(); stopStream(); onCode(raw)
      } else { previous = code; previousTime = now }
    })
    const stop = () => { finished = true; controls.stop(); stopStream(); signal.removeEventListener('abort', stopStream) }
    if (signal.aborted || finished) stop()
    else signal.addEventListener('abort', stop, { once: true })
    return stop
  } catch (error) { stopStream(); signal.removeEventListener('abort', stopStream); throw error }
}

export async function readBarcodePhoto(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    // Native loading rejects corrupt files immediately, before ZXing's load timeout.
    await image.decode()
    const result = await createReader().decodeFromImageElement(image)
    return decoded(result.getText(), result.getBarcodeFormat())
  } finally { URL.revokeObjectURL(url) }
}
