import { buildBitmap, parseBitmap } from '@bits/bitmap'
import { BitmapConstraint } from '@internals/constants'
import { toHex } from '../utils'

describe('bitmap', () => {
  describe('buildBitmap', () => {
    it('builds a primary-only bitmap (8 bytes) for DEs <= 64', () => {
      const buf = buildBitmap([2, 3, 64], 64 as BitmapConstraint)
      expect(buf.length).toBe(8)
      expect(toHex(buf)).toBe('6000000000000001')
    })

    it('is order-insensitive', () => {
      const a = buildBitmap([2, 3, 64], 64 as BitmapConstraint)
      const b = buildBitmap([64, 3, 2], 64 as BitmapConstraint)
      expect(toHex(a)).toBe(toHex(b))
    })

    it('sets secondary indicator and returns 16 bytes when any DE > 64', () => {
      const buf = buildBitmap([2, 65], 128 as BitmapConstraint)
      expect(buf.length).toBe(16)
      expect(toHex(buf)).toBe('c0000000000000008000000000000000')
    })

    it('throws if constrained to 64 bits and a DE > 64 is present', () => {
      expect(() => buildBitmap([65], 64 as BitmapConstraint)).toThrow(/64 bits/)
    })

    it('throws for DE out of range (<2 or >128)', () => {
      expect(() => buildBitmap([1], 64 as BitmapConstraint)).toThrow(/DE must be 2..128/)
      expect(() => buildBitmap([129], 128 as BitmapConstraint)).toThrow(/DE must be 2..128/)
    })

    it('round-trips with parseBitmap', () => {
      const present = [2, 3, 4, 63, 64]
      const bm = buildBitmap(present, 64 as BitmapConstraint)
      const parsed = parseBitmap(bm, 64 as BitmapConstraint)
      expect(parsed).toEqual(present)
    })

    it('round-trips with parseBitmap when secondary is present', () => {
      const present = [2, 38, 65, 100, 128]
      const bm = buildBitmap(present, 128 as BitmapConstraint)
      const parsed = parseBitmap(bm, 128 as BitmapConstraint)
      expect(parsed).toEqual(present)
    })
  })

  describe('parseBitmap', () => {
    it('parses a primary-only bitmap (8 bytes) correctly', () => {
      const bm = Buffer.from('6000000000000001', 'hex')
      const present = parseBitmap(bm, 64 as BitmapConstraint)
      expect(present).toEqual([2, 3, 64])
    })

    it('ignores bit 1 (secondary-indicator) if set but no secondary bytes are provided (8 bytes)', () => {
      const bm = Buffer.from('e000000000000001', 'hex')
      const present = parseBitmap(bm, 64 as BitmapConstraint)
      expect(present).toEqual([2, 3, 64])
    })

    it('parses a secondary-present bitmap (16 bytes) and filters bit 1 from the primary only', () => {
      const bm = Buffer.from('c0000000000000008000000000000000', 'hex')
      const present = parseBitmap(bm, 128 as BitmapConstraint)
      expect(present).toEqual([2, 65])
    })

    it('throws when given 16 bytes under a 64-bit constraint', () => {
      const bm16 = Buffer.alloc(16)
      expect(() => parseBitmap(bm16, 64 as BitmapConstraint)).toThrow(/Secondary bitmap present/i)
    })

    it('throws for invalid bitmap sizes', () => {
      expect(() => parseBitmap(Buffer.alloc(7), 64 as BitmapConstraint)).toThrow(/must be 8 or 16 bytes/i)
      expect(() => parseBitmap(Buffer.alloc(9), 64 as BitmapConstraint)).toThrow(/must be 8 or 16 bytes/i)
      expect(() => parseBitmap(Buffer.alloc(15), 128 as BitmapConstraint)).toThrow(/must be 8 or 16 bytes/i)
    })

    it('round-trips with buildBitmap for primary-only sets', () => {
      const present = [2, 3, 4, 63, 64]
      const bm = buildBitmap(present, 64 as BitmapConstraint)
      expect(toHex(bm).length).toBe(16)
      const parsed = parseBitmap(bm, 64 as BitmapConstraint)
      expect(parsed).toEqual(present)
    })

    it('round-trips with buildBitmap when secondary is present', () => {
      const present = [2, 38, 65, 100, 128]
      const bm = buildBitmap(present, 128 as BitmapConstraint)
      expect(toHex(bm).length).toBe(32)
      const parsed = parseBitmap(bm, 128 as BitmapConstraint)
      expect(parsed).toEqual(present)
    })
  })
})
