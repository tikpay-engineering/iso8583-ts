import { BitmapConstraint, ERR } from '../internals/constants'
import { BitmapEncoding } from '../internals/formats'

export const buildBitmap = (present: number[], constraint: BitmapConstraint, encoding?: BitmapEncoding): Buffer => {
  const needsSecondary = present.some(n => n > 64)
  if (constraint === 64 && needsSecondary) throw new Error(ERR.BITMAP_64_CONSTRAINT)

  const size = needsSecondary ? 16 : 8
  const bitmap = Buffer.alloc(size)

  for (const de of present) {
    if (de < 2 || de > 128) throw new Error(ERR.DE_RANGE)
    const bitIndex = de - 1
    const byteIndex = Math.floor(bitIndex / 8)
    const bitMask = 1 << (7 - (bitIndex % 8))
    bitmap[byteIndex] |= bitMask
  }
  if (needsSecondary) bitmap[0] |= 0x80

  if (encoding === BitmapEncoding.HexAscii) {
    return Buffer.from(bitmap.toString('hex').toUpperCase(), 'ascii')
  }
  return bitmap
}

export const parseBitmap = (bitmap: Buffer, constraint: BitmapConstraint, encoding?: BitmapEncoding): number[] => {
  let bm = bitmap
  if (encoding === BitmapEncoding.HexAscii) {
    if (bm.length !== 16 && bm.length !== 32) throw new Error(ERR.BITMAP_HEX_SIZE)
    const hex = bm.toString('ascii')
    if (!/^[0-9A-Fa-f]+$/.test(hex)) throw new Error(ERR.BITMAP_HEX_INVALID)
    bm = Buffer.from(hex, 'hex')
  }

  if (bm.length !== 8 && bm.length !== 16) throw new Error(ERR.BITMAP_SIZE)
  if (constraint === 64 && bm.length === 16) throw new Error(ERR.SEC_BITMAP_CONSTRAINED)

  const present: number[] = []
  for (let i = 0; i < bm.length * 8; i++) {
    const byte = bm[Math.floor(i / 8)]
    if ((byte & (1 << (7 - (i % 8)))) !== 0) present.push(i + 1)
  }
  return present.filter(n => n !== 1)
}
