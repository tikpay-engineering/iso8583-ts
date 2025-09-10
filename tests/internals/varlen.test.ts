import { fromBcd, toBcd } from '@internals/bcd'
import {
  Kind,
  LLLVARFormat,
  LLVARFormat,
  VarLenCountMode,
  VarLenHeaderEncoding,
  VarPayloadEncoding,
} from '@internals/formats'
import {
  applyVarDefaults,
  buildPayload,
  readLenHeader,
  validateLLLVar,
  validateLLVar,
  writeLenHeader,
} from '@internals/varlen'
import { toAsciiBuffer, toHex, toHexBuffer } from '../utils'

vi.mock('@internals/bcd', () => ({
  fromBcd: vi.fn(),
  toBcd: vi.fn(),
}))

describe('varlen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('applyVarDefaults', () => {
    it('applies given values correctly', () => {
      const ret = applyVarDefaults(12, {
        kind: Kind.LLVARn,
        length: 10,
        lenCountMode: VarLenCountMode.DIGITS,
        lenHeader: VarLenHeaderEncoding.ASCII,
        payload: VarPayloadEncoding.ASCII,
      })
      expect(ret).toStrictEqual({
        kind: Kind.LLVARn,
        length: 10,
        lenCountMode: VarLenCountMode.DIGITS,
        lenHeader: VarLenHeaderEncoding.ASCII,
        payload: VarPayloadEncoding.ASCII,
      })
    })

    describe('payload field', () => {
      it('applies bcd-digits default payload encryption type for VARn', () => {
        const cases = [
          { kind: Kind.LLVARn as const, length: 10 },
          { kind: Kind.LLLVARn as const, length: 10 },
        ]

        for (const input of cases) {
          const ret = applyVarDefaults(12, input)
          expect(ret.payload).toBe(VarPayloadEncoding.BCD_DIGITS)
          expect(ret.kind).toBe(input.kind)
        }
      })
      it('applies ascii default payload encryption for types other than VARn', () => {
        const cases = [
          { kind: Kind.LLVARan as const, length: 10 },
          { kind: Kind.LLLVARan as const, length: 10 },
        ]

        for (const input of cases) {
          const ret = applyVarDefaults(12, input)
          expect(ret.payload).toBe(VarPayloadEncoding.ASCII)
          expect(ret.kind).toBe(input.kind)
        }
      })
    })

    describe('lenHeader field', () => {
      it('applies bcd default payload encoding type if lenHeader is not passed in', () => {
        const ret = applyVarDefaults(12, { kind: Kind.LLVARn as const, length: 10 })
        expect(ret.lenHeader).toBe(VarLenHeaderEncoding.BCD)
        expect(ret.kind).toBe(Kind.LLVARn)
      })
    })

    describe('lenCountMode field', () => {
      it('throws if lenCount is digits but VAR type is not numeric', () => {
        const cases: (LLVARFormat | LLLVARFormat)[] = [
          { kind: Kind.LLVARan, length: 10, lenCountMode: VarLenCountMode.DIGITS },
          { kind: Kind.LLLVARans, length: 10, lenCountMode: VarLenCountMode.DIGITS },
        ]

        for (const input of cases) {
          expect(() => applyVarDefaults(12, input)).toThrow(/invalid lenCountMode=digits for non-n field/)
        }
      })
      it('applies digits default length count mode for VARn', () => {
        const cases: (LLVARFormat | LLLVARFormat)[] = [
          { kind: Kind.LLVARn, length: 10 },
          { kind: Kind.LLLVARn, length: 10 },
        ]

        for (const input of cases) {
          const ret = applyVarDefaults(12, input)
          expect(ret.lenCountMode).toBe(VarLenCountMode.DIGITS)
          expect(ret.kind).toBe(input.kind)
        }
      })
      it('applies bytes defaultlength count mode for types other than VARn', () => {
        const cases: (LLVARFormat | LLLVARFormat)[] = [
          { kind: Kind.LLVARan, length: 10 },
          { kind: Kind.LLLVARan, length: 10 },
        ]

        for (const input of cases) {
          const ret = applyVarDefaults(12, input)
          expect(ret.lenCountMode).toBe(VarLenCountMode.BYTES)
          expect(ret.kind).toBe(input.kind)
        }
      })
    })
  })

  describe('buildPayload', () => {
    describe('ascii', () => {
      it('builds ascii payload when encoding is ascii', () => {
        const ret = buildPayload(VarPayloadEncoding.ASCII, 'ABCD1234')
        const retBuf = toAsciiBuffer('ABCD1234')
        expect(ret).toStrictEqual({ payload: retBuf, byteLen: retBuf.length, digitLen: 0 })
      })
    })

    describe('binary', () => {
      it('builds binary payload when encoding is binary and hex string is passed in', () => {
        const ret = buildPayload(VarPayloadEncoding.BINARY, 'abcd1234')
        const retBuf = toHexBuffer('abcd1234')
        expect(ret).toStrictEqual({ payload: retBuf, byteLen: retBuf.length, digitLen: 0 })
      })
      it('builds binary payload when encoding is binary and a buffer is passed in', () => {
        const retBuf = toHexBuffer('ab12')
        const ret = buildPayload(VarPayloadEncoding.BINARY, retBuf)
        expect(ret).toStrictEqual({ payload: retBuf, byteLen: retBuf.length, digitLen: 0 })
      })
    })

    describe('bcd', () => {
      it('builds bcd encoded payload', () => {
        const hexBuffer = toHexBuffer('123456')
        const toBcdMock = vi.mocked(toBcd).mockReturnValue(hexBuffer)
        const ret = buildPayload(VarPayloadEncoding.BCD_DIGITS, '123456')
        expect(toBcdMock).toHaveBeenCalledTimes(1)
        expect(toBcdMock).toHaveBeenCalledWith('123456')
        expect(ret).toStrictEqual({ payload: hexBuffer, byteLen: hexBuffer.length, digitLen: 6 })
      })
    })
  })

  describe('writeLenHeader', () => {
    const toBcdMocked = vi.mocked(toBcd)
    describe('ascii encoding', () => {
      it('returns 0 padded ascii buffer when input is single digit, max digits is 2 and encoding is ascii', () => {
        const ret = writeLenHeader(1, 2, VarLenHeaderEncoding.ASCII)
        expect(ret).toEqual(toAsciiBuffer('01'))
        expect(toBcdMocked).not.toHaveBeenCalled()
      })

      it('returns 00 padded ascii buffer when input is single digit, max digits is 3 and encoding is ascii', () => {
        const ret = writeLenHeader(1, 3, VarLenHeaderEncoding.ASCII)
        expect(ret).toEqual(toAsciiBuffer('001'))
        expect(toBcdMocked).not.toHaveBeenCalled()
      })
    })

    describe('bcd encoding', () => {
      it('returns BCD encoded buffer when encoding is bcd', () => {
        toBcdMocked.mockReturnValue(toHexBuffer('01'))
        const ret = writeLenHeader(1, 2, VarLenHeaderEncoding.BCD)
        expect(toHex(ret)).toEqual('01')
        expect(toBcdMocked).toHaveBeenCalled()
      })
    })
  })

  describe('readLenHeader', () => {
    const fromBcdMocked = vi.mocked(fromBcd)
    describe('ascii encoding', () => {
      it('throws if the sliced length is less than expected length', () => {
        expect(() => readLenHeader(toAsciiBuffer('1'), 0, 2, VarLenHeaderEncoding.ASCII)).toThrow(
          /Length header underrun/,
        )
      })

      it('throws if length is not a number', () => {
        expect(() => readLenHeader(toAsciiBuffer('A1BCD'), 0, 2, VarLenHeaderEncoding.ASCII)).toThrow(
          /Invalid ASCII length header/,
        )
        expect(fromBcdMocked).not.toHaveBeenCalled()
      })

      it('returns correct length and the number of digits read', () => {
        const resp = readLenHeader(toAsciiBuffer('02ABCDEF'), 0, 2, VarLenHeaderEncoding.ASCII)
        expect(resp).to.deep.equal({ len: 2, read: 2 })
        expect(fromBcdMocked).not.toHaveBeenCalled()
      })
    })
    describe('bcd encoding', () => {
      it('throws if the sliced length is less than expected length', () => {
        expect(() => readLenHeader(toHexBuffer('1'), 0, 2, VarLenHeaderEncoding.BCD)).toThrow(/Length header underrun/)
      })

      it('returns correct length and the number of digits read', () => {
        fromBcdMocked.mockReturnValue('02')
        const resp = readLenHeader(toHexBuffer('02ABCDEF'), 0, 2, VarLenHeaderEncoding.BCD)
        expect(resp).to.deep.equal({ len: 2, read: 1 })
        expect(fromBcdMocked).toHaveBeenCalled()
      })
    })
  })

  describe('validateLLVar', () => {
    it('throws if length is 0', () => {
      expect(() => validateLLVar(Kind.LLVARan, { length: 0 })).toThrow('LLVARan(): length must be > 0')
    })

    it('throws if length is > 99', () => {
      expect(() => validateLLVar(Kind.LLVARan, { length: 110 })).toThrow('LLVARan(): length must be <= 99')
    })

    it('returns kind set to LLVARan', () => {
      expect(validateLLVar(Kind.LLVARan, { length: 99 })).toStrictEqual({
        kind: Kind.LLVARan,
        length: 99,
      })
    })
  })

  describe('validateLLLVar', () => {
    it('throws if length is 0', () => {
      expect(() => validateLLLVar(Kind.LLLVARan, { length: 0 })).toThrow('LLLVARan(): length must be > 0')
    })

    it('throws if length is > 99', () => {
      expect(() => validateLLLVar(Kind.LLLVARan, { length: 1100 })).toThrow('LLLVARan(): length must be <= 999')
    })

    it('returns kind set to LLLVARan', () => {
      expect(validateLLLVar(Kind.LLLVARan, { length: 999 })).toStrictEqual({
        kind: Kind.LLLVARan,
        length: 999,
      })
    })
  })
})
