import { readLenHeader, writeLenHeader } from '@bits/lengths'
import { fromBcd, toBcd } from '@internals/bcd'
import { toAsciiBuffer, toHex, toHexBuffer } from '../utils'

vi.mock('@internals/bcd', () => ({
  fromBcd: vi.fn(),
  toBcd: vi.fn(),
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('lengths', () => {
  describe('writeLenHeader', () => {
    const toBcdMocked = vi.mocked(toBcd)
    describe('ascii encoding', () => {
      it('returns 0 padded ascii buffer when input is single digit, max digits is 2 and encoding is ascii', () => {
        const ret = writeLenHeader(1, 2, 'ascii')
        expect(ret).toEqual(toAsciiBuffer('01'))
        expect(toBcdMocked).not.toHaveBeenCalled()
      })

      it('returns 00 padded ascii buffer when input is single digit, max digits is 3 and encoding is ascii', () => {
        const ret = writeLenHeader(1, 3, 'ascii')
        expect(ret).toEqual(toAsciiBuffer('001'))
        expect(toBcdMocked).not.toHaveBeenCalled()
      })
    })

    describe('bcd encoding', () => {
      it('returns BCD encoded buffer when encoding is bcd', () => {
        toBcdMocked.mockReturnValue(toHexBuffer('01'))
        const ret = writeLenHeader(1, 2, 'bcd')
        expect(toHex(ret)).toEqual('01')
        expect(toBcdMocked).toHaveBeenCalled()
      })
    })
  })

  describe('readLenHeader', () => {
    const fromBcdMocked = vi.mocked(fromBcd)
    describe('ascii encoding', () => {
      it('throws if the sliced length is less than expected length', () => {
        expect(() => readLenHeader(toAsciiBuffer('1'), 0, 2, 'ascii')).toThrow(/Length header underrun/)
      })

      it('throws if length is not a number', () => {
        expect(() => readLenHeader(toAsciiBuffer('A1BCD'), 0, 2, 'ascii')).toThrow(/Invalid ASCII length header/)
        expect(fromBcdMocked).not.toHaveBeenCalled()
      })

      it('returns correct length and the number of digits read', () => {
        const resp = readLenHeader(toAsciiBuffer('02ABCDEF'), 0, 2, 'ascii')
        expect(resp).to.deep.equal({ len: 2, read: 2 })
        expect(fromBcdMocked).not.toHaveBeenCalled()
      })
    })
    describe('bcd encoding', () => {
      it('throws if the sliced length is less than expected length', () => {
        expect(() => readLenHeader(toHexBuffer('1'), 0, 2, 'bcd')).toThrow(/Length header underrun/)
      })

      it('returns correct length and the number of digits read', () => {
        fromBcdMocked.mockReturnValue('02')
        const resp = readLenHeader(toHexBuffer('02ABCDEF'), 0, 2, 'bcd')
        expect(resp).to.deep.equal({ len: 2, read: 1 })
        expect(fromBcdMocked).toHaveBeenCalled()
      })
    })
  })
})
