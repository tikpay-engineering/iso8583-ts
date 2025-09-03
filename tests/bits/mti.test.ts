import { assertMTI, decodeMTI, encodeMTI } from '../../src/bits/mti'
import { readAscii } from '../../src/internals/ascii'
import { fromBcd, toBcd } from '../../src/internals/bcd'
import { toAsciiBuffer, toHexBuffer } from '../utils'

vi.mock('../../src/internals/bcd', () => ({
  toBcd: vi.fn(),
  fromBcd: vi.fn(),
}))

vi.mock('../../src/internals/ascii', () => ({
  readAscii: vi.fn(),
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('mti', () => {
  describe('encodeMTI', () => {
    it('encodes MTI string into ascii buffer when encoding is ascii', () => {
      const resp = encodeMTI('1200', 'ascii')

      expect(resp).toEqual(toAsciiBuffer('1200'))
      expect(toBcd).not.toHaveBeenCalled()
    })

    it('encodes MTI string into bcd encoded buffer when encoding is bcd', () => {
      const mocked = vi.mocked(toBcd)
      mocked.mockReturnValue(toHexBuffer('1210'))

      const resp = encodeMTI('1210', 'bcd')

      expect(resp).toEqual(toHexBuffer('1210'))
      expect(mocked).toHaveBeenCalledTimes(1)
      expect(mocked).toHaveBeenCalledWith('1210')
    })
  })

  describe('decodeMTI', () => {
    it('decodes MTI from ascii buffer into string when encoding is ascii', () => {
      vi.mocked(readAscii).mockReturnValue('1200')
      const resp = decodeMTI(toAsciiBuffer('1200'), 0, 'ascii')

      expect(resp).to.deep.equal({ mti: '1200', read: 4 })
      expect(fromBcd).not.toHaveBeenCalled()
    })

    it('decodes MTI from bcd buffer into string when encoding is bcd', () => {
      vi.mocked(fromBcd).mockReturnValue('1200')
      const resp = decodeMTI(toAsciiBuffer('1200'), 0, 'bcd')

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
