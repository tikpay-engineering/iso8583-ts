import { decodeVar, encodeVar } from '@encodings/varlen'
import { Kind, VarLenCount, VarLenHeaderEncoding, VarPayloadEncoding } from '@internals/formats'
import { applyVarDefaults, buildPayload, readLenHeader, writeLenHeader } from '@internals/varlen'
import { toHexBuffer } from '../utils'

vi.mock('@internals/varlen', () => ({
  applyVarDefaults: vi.fn(),
  buildPayload: vi.fn(),
  writeLenHeader: vi.fn(),
  readLenHeader: vi.fn(),
}))

const writeLenHeaderMock = vi.mocked(writeLenHeader)
const buildPayloadMock = vi.mocked(buildPayload)

describe('varlen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(buildPayload).mockReturnValue({ payload: toHexBuffer('123456'), byteLen: 3, digitLen: 6 })
    writeLenHeaderMock.mockReturnValue(toHexBuffer('abc123'))
    buildPayloadMock.mockReturnValue({
      payload: Buffer.from('ABCDE', 'ascii'),
      byteLen: 5,
      digitLen: 0,
    })
  })

  describe('encodeVar', () => {
    it('throws if logical length > max', () => {
      vi.mocked(applyVarDefaults).mockReturnValue({
        kind: Kind.LLVARn,
        lenCounts: VarLenCount.BYTES,
        length: 4,
        lenHeader: VarLenHeaderEncoding.BCD,
        payload: VarPayloadEncoding.ASCII,
      })
      buildPayloadMock.mockReturnValue({
        payload: Buffer.from('ABCDE', 'ascii'),
        byteLen: 5,
        digitLen: 0,
      })

      expect(() => encodeVar(12, { kind: Kind.LLVARn, length: 4, payload: VarPayloadEncoding.ASCII }, 'ABCDE')).toThrow(
        /max/i,
      )
    })

    it('calls writeLenHeader(6, 2, bcd) for LLVAR digits mode', () => {
      vi.mocked(applyVarDefaults).mockReturnValue({
        kind: Kind.LLVARn,
        lenCounts: VarLenCount.DIGITS,
        length: 12,
        lenHeader: VarLenHeaderEncoding.BCD,
        payload: VarPayloadEncoding.BCD_DIGITS,
      })
      buildPayloadMock.mockReturnValue({
        payload: Buffer.from([0x12, 0x34, 0x56]),
        byteLen: 3,
        digitLen: 6,
      })

      encodeVar(12, { kind: Kind.LLVARn, length: 12, payload: VarPayloadEncoding.BCD_DIGITS }, '123456')
      expect(writeLenHeaderMock).toHaveBeenCalledWith(6, 2, 'bcd')
    })

    it('calls writeLenHeader(6, 3, bcd) for LLLVAR digits mode', () => {
      vi.mocked(applyVarDefaults).mockReturnValue({
        kind: Kind.LLLVARn,
        lenCounts: VarLenCount.DIGITS,
        length: 999,
        lenHeader: VarLenHeaderEncoding.BCD,
        payload: VarPayloadEncoding.BCD_DIGITS,
      })
      buildPayloadMock.mockReturnValue({
        payload: Buffer.from([0x12, 0x34, 0x56]),
        byteLen: 3,
        digitLen: 6,
      })

      encodeVar(12, { kind: Kind.LLLVARn, length: 999, payload: VarPayloadEncoding.BCD_DIGITS }, '123456')
      expect(writeLenHeaderMock).toHaveBeenCalledWith(6, 3, 'bcd')
    })

    it('calls writeLenHeader(6, 2, bcd) for LLVAR bytes mode', () => {
      vi.mocked(applyVarDefaults).mockReturnValue({
        kind: Kind.LLVARan,
        lenCounts: VarLenCount.BYTES,
        length: 20,
        lenHeader: VarLenHeaderEncoding.BCD,
        payload: VarPayloadEncoding.ASCII,
      })
      buildPayloadMock.mockReturnValue({
        payload: Buffer.from('123456', 'ascii'),
        byteLen: 6,
        digitLen: 0,
      })

      encodeVar(12, { kind: Kind.LLVARan, length: 20, payload: VarPayloadEncoding.ASCII }, '123456')
      expect(writeLenHeaderMock).toHaveBeenCalledWith(6, 2, 'bcd')
    })
  })

  describe('decodeVar', () => {
    it('returns ascii string decoded when countMode is bytes', () => {
      vi.mocked(applyVarDefaults).mockReturnValue({
        kind: Kind.LLVARan,
        lenCounts: VarLenCount.BYTES,
        length: 16,
        lenHeader: VarLenHeaderEncoding.BCD,
        payload: VarPayloadEncoding.ASCII,
      })
      vi.mocked(readLenHeader).mockReturnValue({ len: 6, read: 2 })
      const ret = decodeVar(
        12,
        { kind: Kind.LLVARan, length: 16, payload: VarPayloadEncoding.ASCII },
        toHexBuffer('3036313233414243'),
        0,
      )
      expect(ret).toStrictEqual({ read: 8, value: '123ABC' })
    })

    it('throws if countMode is digits for non numeric only VAR buffers', () => {
      vi.mocked(applyVarDefaults).mockReturnValue({
        kind: Kind.LLVARan,
        lenCounts: VarLenCount.DIGITS,
        length: 16,
        lenHeader: VarLenHeaderEncoding.BCD,
        payload: VarPayloadEncoding.ASCII,
      })
      vi.mocked(readLenHeader).mockReturnValue({ len: 6, read: 2 })
      expect(() =>
        decodeVar(
          12,
          { kind: Kind.LLVARan, length: 16, payload: VarPayloadEncoding.ASCII },
          toHexBuffer('3036313233414243'),
          0,
        ),
      ).toThrow(/invalid lenCounts=digits for non-n field/)
    })

    it('throws if buffer payload length is smaller than given length', () => {
      vi.mocked(applyVarDefaults).mockReturnValue({
        kind: Kind.LLVARn,
        lenCounts: VarLenCount.BYTES,
        length: 16,
        lenHeader: VarLenHeaderEncoding.BCD,
        payload: VarPayloadEncoding.ASCII,
      })
      vi.mocked(readLenHeader).mockReturnValue({ len: 6, read: 2 })
      expect(() =>
        decodeVar(
          12,
          { kind: Kind.LLVARn, length: 16, payload: VarPayloadEncoding.ASCII },
          toHexBuffer('303631323341'),
          0,
        ),
      ).toThrow(/underrun/)
    })

    it('returns digits decoded (LLVAR digits mode + BCD payload)', () => {
      vi.mocked(applyVarDefaults).mockReturnValue({
        kind: Kind.LLVARn,
        lenCounts: VarLenCount.DIGITS,
        length: 16,
        lenHeader: VarLenHeaderEncoding.BCD,
        payload: VarPayloadEncoding.BCD_DIGITS,
      })
      vi.mocked(readLenHeader).mockReturnValue({ len: 6, read: 1 })
      const ret = decodeVar(
        12,
        { kind: Kind.LLVARn, length: 16, payload: VarPayloadEncoding.BCD_DIGITS },
        toHexBuffer('06123456'),
        0,
      )
      expect(ret).toStrictEqual({ read: 4, value: '123456' })
    })

    it('returns digits decoded (LLVAR bytes mode + BCD payload)', () => {
      vi.mocked(applyVarDefaults).mockReturnValue({
        kind: Kind.LLVARn,
        lenCounts: VarLenCount.BYTES,
        length: 16,
        lenHeader: VarLenHeaderEncoding.BCD,
        payload: VarPayloadEncoding.BCD_DIGITS,
      })
      const readLenHeaderMock = vi.mocked(readLenHeader).mockReturnValue({ len: 6, read: 1 })
      const buf = toHexBuffer('06123456789012')
      const ret = decodeVar(12, { kind: Kind.LLVARn, length: 16, payload: VarPayloadEncoding.BCD_DIGITS }, buf, 0)
      expect(readLenHeaderMock).toHaveBeenCalledWith(buf, 0, 2, 'bcd')
      expect(ret).toStrictEqual({ read: 7, value: '123456789012' })
    })

    it('returns string decoded (LLLVAR bytes mode + binary payload)', () => {
      vi.mocked(applyVarDefaults).mockReturnValue({
        kind: Kind.LLLVARn,
        lenCounts: VarLenCount.BYTES,
        length: 16,
        lenHeader: VarLenHeaderEncoding.BCD,
        payload: VarPayloadEncoding.BINARY,
      })
      const readLenHeaderMock = vi.mocked(readLenHeader).mockReturnValue({ len: 6, read: 2 })
      const buf = toHexBuffer('0006123456789012')
      const ret = decodeVar(12, { kind: Kind.LLLVARn, length: 16, payload: VarPayloadEncoding.BINARY }, buf, 0)
      expect(readLenHeaderMock).toHaveBeenCalledWith(buf, 0, 3, 'bcd')
      expect(ret).toStrictEqual({ read: 8, value: toHexBuffer('123456789012') })
    })
  })
})
