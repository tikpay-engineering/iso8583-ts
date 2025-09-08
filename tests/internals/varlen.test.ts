import { toBcd } from '@internals/bcd'
import { Kind } from '@internals/formats'
import { applyVarDefaults, buildPayload } from '@internals/varlen'
import { toAsciiBuffer, toHexBuffer } from '../utils'

vi.mock('@internals/bcd', () => ({
  toBcd: vi.fn(),
}))

describe('varlen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('applyVarDefaults', () => {
    it('applies given values correctly', () => {
      const ret = applyVarDefaults({
        kind: Kind.LLVARn,
        length: 10,
        lenCounts: 'digits',
        lenHeader: 'ascii',
        payload: 'ascii',
      })
      expect(ret).toStrictEqual({
        kind: Kind.LLVARn,
        length: 10,
        lenCounts: 'digits',
        lenHeader: 'ascii',
        payload: 'ascii',
      })
    })

    describe('payload field', () => {
      it('applies bcd-digits default payload encryption type for VARn', () => {
        const cases = [
          { kind: Kind.LLVARn as const, length: 10 },
          { kind: Kind.LLLVARn as const, length: 10 },
        ]

        for (const input of cases) {
          const ret = applyVarDefaults(input)
          expect(ret.payload).toBe('bcd-digits')
          expect(ret.kind).toBe(input.kind)
        }
      })
      it('applies ascii default payload encryption for types other than VARn', () => {
        const cases = [
          { kind: Kind.LLVARan as const, length: 10 },
          { kind: Kind.LLLVARan as const, length: 10 },
        ]

        for (const input of cases) {
          const ret = applyVarDefaults(input)
          expect(ret.payload).toBe('ascii')
          expect(ret.kind).toBe(input.kind)
        }
      })
    })

    describe('lenHeader field', () => {
      it('applies bcd default payload encoding type if lenHeader is not passed in', () => {
        const ret = applyVarDefaults({ kind: Kind.LLVARn as const, length: 10 })
        expect(ret.lenHeader).toBe('bcd')
        expect(ret.kind).toBe(Kind.LLVARn)
      })
    })

    describe('lenCounts field', () => {
      it('applies digits default length count mode for VARn', () => {
        const cases = [
          { kind: Kind.LLVARn as const, length: 10 },
          { kind: Kind.LLLVARn as const, length: 10 },
        ]

        for (const input of cases) {
          const ret = applyVarDefaults(input)
          expect(ret.lenCounts).toBe('digits')
          expect(ret.kind).toBe(input.kind)
        }
      })
      it('applies bytes defaultlength count mode for types other than VARn', () => {
        const cases = [
          { kind: Kind.LLVARan as const, length: 10 },
          { kind: Kind.LLLVARan as const, length: 10 },
        ]

        for (const input of cases) {
          const ret = applyVarDefaults(input)
          expect(ret.lenCounts).toBe('bytes')
          expect(ret.kind).toBe(input.kind)
        }
      })
    })
  })

  describe('buildPayload', () => {
    describe('ascii', () => {
      it('builds ascii payload when encoding is ascii', () => {
        const ret = buildPayload('ascii', 'ABCD1234')
        const retBuf = toAsciiBuffer('ABCD1234')
        expect(ret).toStrictEqual({ payload: retBuf, byteLen: retBuf.length, digitLen: 0 })
      })
    })

    describe('binary', () => {
      it('builds binary payload when encoding is binary and hex string is passed in', () => {
        const ret = buildPayload('binary', 'abcd1234')
        const retBuf = toHexBuffer('abcd1234')
        expect(ret).toStrictEqual({ payload: retBuf, byteLen: retBuf.length, digitLen: 0 })
      })
      it('builds binary payload when encoding is binary and a buffer is passed in', () => {
        const retBuf = toHexBuffer('ab12')
        const ret = buildPayload('binary', retBuf)
        expect(ret).toStrictEqual({ payload: retBuf, byteLen: retBuf.length, digitLen: 0 })
      })
    })

    describe('bcd', () => {
      it('builds bcd encoded payload', () => {
        const hexBuffer = toHexBuffer('123456')
        const toBcdMock = vi.mocked(toBcd).mockReturnValue(hexBuffer)
        const ret = buildPayload('bcd-digits', '123456')
        expect(toBcdMock).toHaveBeenCalledTimes(1)
        expect(toBcdMock).toHaveBeenCalledWith('123456')
        expect(ret).toStrictEqual({ payload: hexBuffer, byteLen: hexBuffer.length, digitLen: 6 })
      })
    })
  })
})
