import { fromBcd, toBcd } from '../../src/internals/bcd'
import { digitsOnly } from '../../src/internals/digits'
import { toHexBuffer } from '../utils'

vi.mock('../../src/internals/digits', () => ({
  digitsOnly: vi.fn(),
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('bcd', () => {
  describe('toBcd', () => {
    it('encodes an even length digit string to BCD', () => {
      vi.mocked(digitsOnly).mockReturnValue('1234567890')
      const buf = toBcd('1234567890')
      expect(buf.equals(toHexBuffer('1234567890'))).toBe(true)
    })

    it('left-pads a leading 0 for odd length strings', () => {
      vi.mocked(digitsOnly).mockReturnValue('123')
      const buf = toBcd('123')
      expect(buf.equals(toHexBuffer('0123'))).toBe(true)
    })

    it('returns an empty buffer for empty input', () => {
      vi.mocked(digitsOnly).mockReturnValue('')
      const buf = toBcd('')
      expect(buf.length).toBe(0)
    })

    it('throws early if input contains non-digits', () => {
      vi.mocked(digitsOnly).mockImplementation(() => {
        throw new Error('digitsOnly rejected')
      })
      expect(() => toBcd('12345A')).toThrow(/digitsOnly rejected/)
    })
  })

  describe('fromBcd', () => {
    it('decodes when digits equals total length', () => {
      expect(fromBcd(toHexBuffer('1234567890'), 10)).toBe('1234567890')
    })

    it('returns last N digits', () => {
      expect(fromBcd(toHexBuffer('1234567890'), 6)).toBe('567890')
    })

    it('handles leading zeros', () => {
      expect(fromBcd(toHexBuffer('0009'), 4)).toBe('0009')
    })
  })
})
