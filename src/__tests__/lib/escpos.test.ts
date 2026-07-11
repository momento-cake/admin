import { describe, it, expect } from 'vitest'
import {
  EscPos,
  LINE_WIDTH,
  encodeText,
  padLR,
  wrapText,
  rasterize,
} from '@/lib/escpos'

// --- encodeText -------------------------------------------------------------

describe('encodeText', () => {
  it('passes ASCII through unchanged', () => {
    expect(encodeText('ABC 123')).toEqual([65, 66, 67, 32, 49, 50, 51])
  })

  it('maps pt-BR accents to CP850 byte values', () => {
    expect(encodeText('á')).toEqual([0xa0])
    expect(encodeText('ç')).toEqual([0x87])
    expect(encodeText('ã')).toEqual([0xc6])
    expect(encodeText('é')).toEqual([0x82])
    expect(encodeText('õ')).toEqual([0xe4])
    expect(encodeText('Ç')).toEqual([0x80])
    expect(encodeText('º')).toEqual([0xa7])
  })

  it('encodes a newline as LF', () => {
    expect(encodeText('A\nB')).toEqual([65, 0x0a, 66])
  })

  it('replaces unmapped characters with "?"', () => {
    expect(encodeText('€')).toEqual([0x3f])
  })

  it('keeps every char to exactly one byte (column == byte)', () => {
    const s = 'Pão Nº 5 çãé'
    expect(encodeText(s)).toHaveLength(s.length)
  })
})

// --- padLR ------------------------------------------------------------------

describe('padLR', () => {
  it('pads label and value to the full width', () => {
    const out = padLR('Subtotal', 'R$ 10,00', 20)
    expect(out).toHaveLength(20)
    expect(out.startsWith('Subtotal')).toBe(true)
    expect(out.endsWith('R$ 10,00')).toBe(true)
  })

  it('keeps at least one space between columns', () => {
    const out = padLR('123456', '789', 10)
    expect(out).toBe('123456 789')
  })

  it('truncates the label so the value is always visible', () => {
    const out = padLR('A very long label that overflows', 'R$ 9,99', 20)
    expect(out).toHaveLength(20)
    expect(out.endsWith('R$ 9,99')).toBe(true)
  })
})

// --- wrapText ---------------------------------------------------------------

describe('wrapText', () => {
  it('wraps on word boundaries', () => {
    expect(wrapText('one two three four', 9)).toEqual(['one two', 'three', 'four'])
  })

  it('hard-breaks words longer than the width', () => {
    expect(wrapText('abcdefghij', 4)).toEqual(['abcd', 'efgh', 'ij'])
  })

  it('returns a single empty line for empty input', () => {
    expect(wrapText('', 10)).toEqual([''])
  })
})

// --- rasterize --------------------------------------------------------------

function makeImage(width: number, height: number, fill: [number, number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = fill[0]
    data[i * 4 + 1] = fill[1]
    data[i * 4 + 2] = fill[2]
    data[i * 4 + 3] = fill[3]
  }
  return { width, height, data, colorSpace: 'srgb' } as unknown as ImageData
}

describe('rasterize', () => {
  it('emits a GS v 0 header with correct row/height dimensions', () => {
    const img = makeImage(16, 3, [0, 0, 0, 255]) // all black
    const bytes = rasterize(img)
    // header: GS(0x1d) 0x76 0x30 0x00 xL xH yL yH
    expect(bytes.slice(0, 4)).toEqual([0x1d, 0x76, 0x30, 0x00])
    expect(bytes[4]).toBe(2) // bytesPerRow = 16/8 = 2 (xL)
    expect(bytes[5]).toBe(0) // xH
    expect(bytes[6]).toBe(3) // height (yL)
    expect(bytes[7]).toBe(0) // yH
    // body = bytesPerRow(2) * height(3) = 6 bytes, all black => 0xff
    expect(bytes.length).toBe(8 + 6)
    expect(bytes.slice(8)).toEqual([0xff, 0xff, 0xff, 0xff, 0xff, 0xff])
  })

  it('pads row width to a multiple of 8', () => {
    const img = makeImage(10, 1, [0, 0, 0, 255])
    const bytes = rasterize(img)
    expect(bytes[4]).toBe(2) // ceil(10/8) = 2 bytes per row
  })

  it('treats white and transparent pixels as blank', () => {
    const white = rasterize(makeImage(8, 1, [255, 255, 255, 255]))
    const transparent = rasterize(makeImage(8, 1, [0, 0, 0, 0]))
    expect(white.slice(8)).toEqual([0x00])
    expect(transparent.slice(8)).toEqual([0x00])
  })

  it('sets the MSB for the leftmost black pixel', () => {
    const data = new Uint8ClampedArray(8 * 1 * 4)
    // only x=0 black, rest transparent
    data[3] = 255 // alpha of pixel 0
    const img = { width: 8, height: 1, data, colorSpace: 'srgb' } as unknown as ImageData
    expect(rasterize(img).slice(8)).toEqual([0x80])
  })
})

// --- EscPos builder ---------------------------------------------------------

describe('EscPos', () => {
  it('emits control sequences in order', () => {
    const bytes = new EscPos().init().codepage().align('center').bold(true).encode()
    expect(Array.from(bytes)).toEqual([
      0x1b, 0x40, // init
      0x1b, 0x74, 0x02, // codepage CP850
      0x1b, 0x61, 0x01, // align center
      0x1b, 0x45, 0x01, // bold on
    ])
  })

  it('encodes size multipliers into a single GS ! byte', () => {
    expect(Array.from(new EscPos().size(2, 2).encode())).toEqual([0x1d, 0x21, 0x11])
    expect(Array.from(new EscPos().size(1, 1).encode())).toEqual([0x1d, 0x21, 0x00])
  })

  it('clamps size to the 1..8 range', () => {
    expect(Array.from(new EscPos().size(99, 0).encode())).toEqual([0x1d, 0x21, 0x70])
  })

  it('appends text with and without line feeds', () => {
    expect(Array.from(new EscPos().text('Hi').encode())).toEqual([72, 105])
    expect(Array.from(new EscPos().line('Hi').encode())).toEqual([72, 105, 0x0a])
  })

  it('produces a full-width rule', () => {
    const bytes = new EscPos().rule().encode()
    expect(bytes.length).toBe(LINE_WIDTH + 1) // dashes + LF
    expect(bytes[0]).toBe(0x2d) // '-'
    expect(bytes[bytes.length - 1]).toBe(0x0a)
  })

  it('emits feed and cut commands', () => {
    expect(Array.from(new EscPos().feed(3).encode())).toEqual([0x1b, 0x64, 0x03])
    expect(Array.from(new EscPos().cut().encode())).toEqual([0x1d, 0x56, 0x00])
    expect(Array.from(new EscPos().cut(true).encode())).toEqual([0x1d, 0x56, 0x01])
  })

  it('embeds a raster image', () => {
    const img = makeImage(8, 1, [0, 0, 0, 255])
    const bytes = new EscPos().image(img).encode()
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x1d, 0x76, 0x30, 0x00])
  })
})
