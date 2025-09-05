import { decodeBinary, encodeBinary } from '@encodings/binary'
import { BFormat, Kind } from '@internals/formats'

describe('binary', () => {
  const de = 48
  const format: BFormat = { kind: Kind.Binary, length: 4 }

  describe('encodeBinary', () => {
    it('returns the same Buffer instance when length matches', () => {
      const buf = Buffer.from('ABCDEFFEDCBAABCD', 'hex')
      const ret = encodeBinary(de, { ...format, length: 8 }, buf)
      expect(ret).toBe(buf)
    })

    it('accepts a hex string of exact length and returns equivalent Buffer', () => {
      const hex = 'ABCDEFFEDCBAABCD'
      const ret = encodeBinary(de, { ...format, length: 8 }, hex)
      expect(ret.equals(Buffer.from(hex, 'hex'))).toBe(true)
    })

    it('throws when hex string contains non-hex characters', () => {
      expect(() => encodeBinary(de, format, 'zzzzzzzz')).toThrow(/Invalid hex for/)
      expect(() => encodeBinary(de, format, '01xz')).toThrow(/Invalid hex for/)
    })

    it('throws when hex string decodes to the wrong byte length', () => {
      expect(() => encodeBinary(de, format, 'ABCDEF')).toThrow(/must be 4 bytes/)
    })

    it('throws when Buffer length is wrong', () => {
      const short = Buffer.from('ABCDEF', 'hex')
      expect(() => encodeBinary(de, format, short)).toThrow(/must be 4 bytes/)
    })

    it('works for empty payloads when expected length is 0', () => {
      const b = Buffer.alloc(0)
      expect(encodeBinary(de, { ...format, length: 0 }, b)).toBe(b)
      expect(encodeBinary(de, { ...format, length: 0 }, '')).toEqual(Buffer.alloc(0))
    })
  })

  describe('decodeBinary', () => {
    it('throws if sliced length is less than expected length', () => {
      const buf = Buffer.from('ABCDEFFEDCBAABCD', 'hex')
      expect(() => decodeBinary(de, format, buf, 5)).toThrow(/underrun/)
    })

    it('returns decoded binary with read length', () => {
      const buf = Buffer.from('AAAABCDEFFEDCBAABCDFFF', 'hex')
      const ret = decodeBinary(de, format, buf, 3)
      expect(ret).toStrictEqual({ value: buf.subarray(3, 7), read: 4 })
    })
  })
})
