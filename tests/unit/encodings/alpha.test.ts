import { decodeAlpha, encodeAlpha } from '@encodings/alpha'
import { Kind } from '@internals/formats'
import { toAsciiBuffer } from '../../utils'

vi.mock('@internals/alpha', () => ({
  validateAlpha: vi.fn(),
}))

describe('alpha', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('encodeAlpha', () => {
    it('throws if given string is longer than provided length', () => {
      expect(() => encodeAlpha(3, { kind: Kind.Alpha, length: 4 }, 'ABCDFR123')).toThrow(/exceeds/)
    })
    it('pads to correct length and encode alpha-numeric-special', () => {
      const ret = encodeAlpha(3, { kind: Kind.AlphaNumericSpecial, length: 10 }, 'ABCD123#')
      expect(ret).toStrictEqual(toAsciiBuffer('ABCD123#  '))
    })
  })

  describe('decodeAlpha', () => {
    it('decodes alpha-numeric-special', () => {
      const ret = decodeAlpha({ kind: Kind.AlphaNumericSpecial, length: 7 }, toAsciiBuffer('12ABCD76#F'), 2)
      expect(ret).toStrictEqual({
        read: 7,
        value: 'ABCD76#',
      })
    })
  })
})
