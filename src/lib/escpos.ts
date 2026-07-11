/**
 * Minimal, dependency-free ESC/POS command builder for 80mm thermal printers
 * (Elgin i9 and other standard ESC/POS devices).
 *
 * Hand-rolled — consistent with the repo's dependency-light style and fully
 * unit-testable without a DOM. The text path needs no canvas; only `image()`
 * consumes an `ImageData` (produced in the browser from the logo).
 *
 * Column model: at 80mm / Font A the printer fits 48 characters per line, and
 * every character (ASCII or CP850 accent) encodes to exactly one byte, so
 * string length == column count == byte count. `padLR`/`rule` rely on this.
 */

/** Printable characters per line at 80mm, Font A. */
export const LINE_WIDTH = 48

// --- Control bytes ----------------------------------------------------------
const ESC = 0x1b
const GS = 0x1d
const LF = 0x0a

/**
 * CP850 (PC-850, Multilingual Latin-1) byte values for the pt-BR accented
 * characters we emit. The Elgin i9 selects CP850 via `ESC t 2`.
 */
const CP850: Record<string, number> = {
  'á': 0xa0, 'à': 0x85, 'â': 0x83, 'ã': 0xc6, 'ä': 0x84,
  'é': 0x82, 'è': 0x8a, 'ê': 0x88, 'ë': 0x89,
  'í': 0xa1, 'ì': 0x8d, 'î': 0x8c, 'ï': 0x8b,
  'ó': 0xa2, 'ò': 0x95, 'ô': 0x93, 'õ': 0xe4, 'ö': 0x94,
  'ú': 0xa3, 'ù': 0x97, 'û': 0x96, 'ü': 0x81,
  'ç': 0x87,
  'Á': 0xb5, 'À': 0xb7, 'Â': 0xb6, 'Ã': 0xc7, 'Ä': 0x8e,
  'É': 0x90, 'Ê': 0xd2, 'Ë': 0xd3, 'È': 0xd4,
  'Í': 0xd6, 'Ì': 0xde, 'Î': 0xd7, 'Ï': 0xd8,
  'Ó': 0xe0, 'Ò': 0xe3, 'Ô': 0xe2, 'Õ': 0xe5, 'Ö': 0x99,
  'Ú': 0xe9, 'Ù': 0xeb, 'Û': 0xea, 'Ü': 0x9a,
  'Ç': 0x80,
  'º': 0xa7, 'ª': 0xa6, '°': 0xf8, '·': 0xfa,
}

/** Encode a string to CP850 bytes; ASCII passes through, unknown → '?'. */
export function encodeText(str: string): number[] {
  const out: number[] = []
  for (const ch of str) {
    const code = ch.charCodeAt(0)
    if (code >= 0x20 && code <= 0x7e) {
      out.push(code)
    } else if (ch === '\n') {
      out.push(LF)
    } else if (CP850[ch] !== undefined) {
      out.push(CP850[ch])
    } else {
      out.push(0x3f) // '?'
    }
  }
  return out
}

/**
 * Compose a two-column line (label left, value right) padded to `width`
 * columns. If the two don't fit, the left side is truncated so the value is
 * always fully visible.
 */
export function padLR(left: string, right: string, width = LINE_WIDTH): string {
  let l = left
  const gap = width - l.length - right.length
  if (gap >= 1) return l + ' '.repeat(gap) + right
  const maxLeft = Math.max(0, width - right.length - 1)
  l = l.slice(0, maxLeft)
  const pad = Math.max(1, width - l.length - right.length)
  return (l + ' '.repeat(pad) + right).slice(0, width)
}

/** Word-wrap a string to `width` columns, breaking overly long words. */
export function wrapText(str: string, width = LINE_WIDTH): string[] {
  const words = str.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    let w = word
    while (w.length > width) {
      if (line) { lines.push(line); line = '' }
      lines.push(w.slice(0, width))
      w = w.slice(width)
    }
    if (!line) line = w
    else if (line.length + 1 + w.length <= width) line += ' ' + w
    else { lines.push(line); line = w }
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

/**
 * Convert an ImageData to an ESC/POS raster bit-image (`GS v 0`). Pixels darker
 * than `threshold` (and non-transparent) print black. Row width is padded to a
 * multiple of 8; MSB is the leftmost pixel.
 */
export function rasterize(image: ImageData, threshold = 128): number[] {
  const { width, height, data } = image
  const bytesPerRow = Math.ceil(width / 8)
  const body = new Uint8Array(bytesPerRow * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const a = data[idx + 3]
      const lum = a === 0 ? 255 : 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
      if (lum < threshold) {
        body[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7)
      }
    }
  }
  return [
    GS, 0x76, 0x30, 0x00,
    bytesPerRow & 0xff, (bytesPerRow >> 8) & 0xff,
    height & 0xff, (height >> 8) & 0xff,
    ...body,
  ]
}

type Align = 'left' | 'center' | 'right'
const ALIGN: Record<Align, number> = { left: 0, center: 1, right: 2 }

/** Chainable ESC/POS builder. Call `.encode()` for the final `Uint8Array`. */
export class EscPos {
  private buf: number[] = []

  /** ESC @ — reset to defaults. */
  init(): this {
    this.buf.push(ESC, 0x40)
    return this
  }

  /** ESC t n — select character code page (default CP850 = 2). */
  codepage(n = 2): this {
    this.buf.push(ESC, 0x74, n & 0xff)
    return this
  }

  /** ESC a n — text justification. */
  align(a: Align): this {
    this.buf.push(ESC, 0x61, ALIGN[a])
    return this
  }

  /** ESC E n — emphasized (bold) on/off. */
  bold(on: boolean): this {
    this.buf.push(ESC, 0x45, on ? 1 : 0)
    return this
  }

  /** GS ! n — character size multiplier (1..8 in each axis). */
  size(width = 1, height = 1): this {
    const w = Math.min(8, Math.max(1, width)) - 1
    const h = Math.min(8, Math.max(1, height)) - 1
    this.buf.push(GS, 0x21, (w << 4) | h)
    return this
  }

  /** Append text (no line feed). */
  text(str: string): this {
    this.buf.push(...encodeText(str))
    return this
  }

  /** Append text followed by a line feed. */
  line(str = ''): this {
    this.buf.push(...encodeText(str), LF)
    return this
  }

  /** A full-width horizontal rule of '-'. */
  rule(width = LINE_WIDTH): this {
    return this.line('-'.repeat(width))
  }

  /** ESC d n — feed n blank lines. */
  feed(n = 1): this {
    this.buf.push(ESC, 0x64, n & 0xff)
    return this
  }

  /** Bare line feed. */
  newline(): this {
    this.buf.push(LF)
    return this
  }

  /** GS v 0 — raster bit-image. */
  image(image: ImageData, threshold = 128): this {
    this.buf.push(...rasterize(image, threshold))
    return this
  }

  /** GS V n — paper cut (full by default, partial when `partial`). */
  cut(partial = false): this {
    this.buf.push(GS, 0x56, partial ? 0x01 : 0x00)
    return this
  }

  encode(): Uint8Array {
    return Uint8Array.from(this.buf)
  }
}
