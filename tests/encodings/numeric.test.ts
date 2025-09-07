import { decodeNumeric, encodeNumeric } from '@encodings/numeric'
import { fromBcd, toBcd } from '@internals/bcd'
import { digitsOnly } from '@internals/digits'
import { Kind } from '@internals/formats'

vi.mock('@internals/digits', () => ({
  digitsOnly: vi.fn(),
}))

vi.mock('@internals/bcd', () => ({
  fromBcd: vi.fn(),
  toBcd: vi.fn(),
}))

describe('numeric', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('encodeNumeric', () => {
    it('returns ascii encoded Buffer when encoding is ascii', () => {
      vi.mocked(digitsOnly).mockReturnValue('0012345678')
      const ret = encodeNumeric({ kind: Kind.Numeric, length: 10, encoding: 'ascii' }, '12345678')
      expect(ret).toStrictEqual(Buffer.from('0012345678', 'ascii'))
    })

    describe('bcd encoding', () => {
      it('appends 0 if length is odd', () => {
        vi.mocked(digitsOnly).mockReturnValue('12345')
        encodeNumeric({ kind: Kind.Numeric, length: 5, encoding: 'bcd' }, '12345')
        expect(toBcd).toHaveBeenCalledExactlyOnceWith('012345')
      })
      it('returns BCD encoded as default if encoding is not set', () => {
        encodeNumeric({ kind: Kind.Numeric, length: 5 }, '12345')
        expect(toBcd).toHaveBeenCalled()
      })
    })
  })

  describe('decodeNumeric', () => {
    it('returns decoded ascii value when encoding is ascii', () => {
      const ret = decodeNumeric({ kind: Kind.Numeric, length: 4, encoding: 'ascii' }, Buffer.from('123456', 'ascii'), 0)
      expect(ret).toStrictEqual({ value: '1234', read: 4 })
    })

    it('returns decoded BCD value when encoding is BCD', () => {
      vi.mocked(fromBcd).mockReturnValue('1234')
      const buf = Buffer.from([0x12, 0x34, 0x56, 0x78])
      const ret = decodeNumeric({ kind: Kind.Numeric, length: 4, encoding: 'bcd' }, buf, 0)

      expect(ret).toStrictEqual({ value: '1234', read: 2 })
      expect(fromBcd).toHaveBeenCalledWith(expect.any(Buffer), 4)
      expect(vi.mocked(fromBcd).mock.calls[0][0].length).toBe(2)
    })

    it('defaults to bcd when encoding is not given', () => {
      vi.mocked(fromBcd).mockReturnValue('0000')
      const buf = Buffer.from([0x00, 0x00])
      decodeNumeric({ kind: Kind.Numeric, length: 4 }, buf, 0)
      expect(fromBcd).toHaveBeenCalledTimes(1)
    })

    it('uses ceil for odd digit lengths (bcd)', () => {
      vi.mocked(fromBcd).mockReturnValue('123')
      const buf = Buffer.from([0x12, 0x30])
      const ret = decodeNumeric({ kind: Kind.Numeric, length: 3, encoding: 'bcd' }, buf, 0)
      expect(ret.read).toBe(2)
      expect(fromBcd).toHaveBeenCalledWith(expect.any(Buffer), 3)
    })
  })
})
