import { assertMTI, decodeMTI, encodeMTI } from '@bits/mti'
import { readAscii } from '@internals/ascii'
import { fromBcd, toBcd } from '@internals/bcd'
import { NumericEncoding } from '@internals/formats'
import { toAsciiBuffer, toHexBuffer } from '../utils'

vi.mock('@internals/bcd', () => ({
  toBcd: vi.fn(),
  fromBcd: vi.fn(),
}))

vi.mock('@internals/ascii', () => ({
  readAscii: vi.fn(),
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('mti', () => {
  describe('encodeMTI', () => {
    it('encodes MTI string into ascii buffer when encoding is ascii', () => {
      const resp = encodeMTI('1200', NumericEncoding.ASCII)

      expect(resp).toEqual(toAsciiBuffer('1200'))
      expect(toBcd).not.toHaveBeenCalled()
    })

    it('encodes MTI string into bcd encoded buffer when encoding is bcd', () => {
      const mocked = vi.mocked(toBcd)
      mocked.mockReturnValue(toHexBuffer('1210'))

      const resp = encodeMTI('1210', NumericEncoding.BCD)

      expect(resp).toEqual(toHexBuffer('1210'))
      expect(mocked).toHaveBeenCalledTimes(1)
      expect(mocked).toHaveBeenCalledWith('1210')
    })
  })

  describe('decodeMTI', () => {
    it('decodes MTI from ascii buffer into string when encoding is ascii', () => {
      vi.mocked(readAscii).mockReturnValue('1200')
      const resp = decodeMTI(toAsciiBuffer('1200'), 0, NumericEncoding.ASCII)

      expect(resp).to.deep.equal({ mti: '1200', read: 4 })
      expect(fromBcd).not.toHaveBeenCalled()
    })

    it('decodes MTI from bcd buffer into string when encoding is bcd', () => {
      vi.mocked(fromBcd).mockReturnValue('1200')
      const resp = decodeMTI(toAsciiBuffer('1200'), 0, NumericEncoding.BCD)

      expect(resp).to.deep.equal({ mti: '1200', read: 2 })
      expect(readAscii).not.toHaveBeenCalled()
    })
  })

  describe('assertMTI', () => {
    it('throws if MTI is invalid', () => {
      expect(() => assertMTI('12A0')).toThrow(/Invalid MTI/)
    })
  })
})
