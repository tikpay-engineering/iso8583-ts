import { buildBitmap, parseBitmap } from '@bits/bitmap'
import { assertMTI, decodeMTI, encodeMTI } from '@bits/mti'
import { decodeAlpha, encodeAlpha } from '@encodings/alpha'
import { decodeBinary, encodeBinary } from '@encodings/binary'
import { decodeNumeric, encodeNumeric } from '@encodings/numeric'
import { decodeVar, encodeVar } from '@encodings/varlen'
import { AN, B, bitmap, Iso8583, Kind, LLVARn, MessageSpec, N, NumericEncoding, VarLenHeaderEncoding } from '../../src'
import { toHexBuffer } from '../utils'

vi.mock('@bits/mti', () => ({
  assertMTI: vi.fn(),
  encodeMTI: vi.fn(),
  decodeMTI: vi.fn(),
}))

vi.mock('@bits/bitmap', () => ({
  buildBitmap: vi.fn(),
  parseBitmap: vi.fn(),
}))

vi.mock('@encodings/alpha', () => ({
  encodeAlpha: vi.fn(),
  decodeAlpha: vi.fn(),
}))

vi.mock('@encodings/binary', () => ({
  encodeBinary: vi.fn(),
  decodeBinary: vi.fn(),
}))

vi.mock('@encodings/numeric', () => ({
  encodeNumeric: vi.fn(),
  decodeNumeric: vi.fn(),
}))

vi.mock('@encodings/varlen', () => ({
  encodeVar: vi.fn(),
  decodeVar: vi.fn(),
}))

describe('Iso8583', () => {
  const messageSpec: MessageSpec = {
    0: { name: 'MTI', format: N(4) },
    1: { name: 'Bitmap', format: bitmap(8) },
    2: {
      name: 'PAN',
      format: LLVARn({
        length: 19,
        lenHeader: VarLenHeaderEncoding.BCD,
      }),
    },
    3: { name: 'ProcCode', format: N(6) },
    22: { name: 'POSData', format: AN(12) },
  }

  const encodeMtiMock = vi.mocked(encodeMTI)
  const decodeMtiMock = vi.mocked(decodeMTI)
  const buildBitmmapMock = vi.mocked(buildBitmap)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(assertMTI).mockReturnThis()
    encodeMtiMock.mockReturnValue(toHexBuffer('1200'))
    decodeMtiMock.mockReturnValue({ mti: '1210', read: 4 })
    buildBitmmapMock.mockReturnValue(toHexBuffer('6000000000000001'))
  })

  describe('main', () => {
    it('throws if MTI kind is not numeric', () => {
      expect(() => new Iso8583({ 0: { name: 'MTI', format: AN(4) } })).toThrow(
        'Invalid MTI field DE0 spec (expect 4 digits, numeric)',
      )
    })

    it('throws if bitmap kind is not binary', () => {
      expect(() => new Iso8583({ ...messageSpec, 1: { name: 'bitmap', format: B(8) } })).toThrow(
        'Invalid bitmap field DE1 spec (expect format: bitmap(8 or 16))',
      )
    })
  })

  describe('pack', () => {
    it('throws if a field is present in passed data without a corresponding spec', () => {
      const call = {
        50: 'non-existing-spec',
        22: '923456711300',
      }
      const iso8583 = new Iso8583(messageSpec)
      expect(() => iso8583.pack('1200', call)).toThrow(/No spec for DE50/)
    })

    it('calls encodeMTI with (`1200`, `BCD`) default encoding', () => {
      const call = {
        22: '923456711300',
      }
      const iso8583 = new Iso8583(messageSpec)
      const encodeFieldMock = vi.spyOn(iso8583, 'encodeField').mockReturnValue(toHexBuffer('1234'))
      iso8583.pack('1200', call)
      expect(encodeMtiMock).toHaveBeenCalledWith('1200', 'bcd')
      expect(encodeFieldMock).toHaveBeenCalledWith(22, messageSpec[22], '923456711300')
    })

    it('calls encodeMTI with (`1200`, `ASCII`) when encoding is given encoding', () => {
      const call = {
        22: '923456711300',
      }
      const iso8583 = new Iso8583({
        ...messageSpec,
        0: { name: 'MTI', format: N(4, { encoding: NumericEncoding.ASCII }) },
      })
      const encodeFieldMock = vi.spyOn(iso8583, 'encodeField').mockReturnValue(toHexBuffer('1234'))
      iso8583.pack('1200', call)
      expect(encodeMtiMock).toHaveBeenCalledWith('1200', 'ascii')
      expect(encodeFieldMock).toHaveBeenCalledWith(22, messageSpec[22], '923456711300')
    })

    it('calls buildBitmap with correct params with default bitmapConstraint of 64', () => {
      const call = {
        0: '1200',
        3: '000000',
        22: '923456711300',
        130: 'invalid',
      }
      const iso8583 = new Iso8583(messageSpec)
      const encodeFieldMock = vi.spyOn(iso8583, 'encodeField').mockReturnValue(toHexBuffer('1234'))
      iso8583.pack('1200', call)
      expect(buildBitmap).toHaveBeenCalledWith([3, 22], 64)
      expect(encodeFieldMock).toHaveBeenCalled()
    })

    it('calls buildBitmap with correct params with given bitmapConstraint', () => {
      const call = {
        0: '1200',
        3: '000000',
        22: '923456711300',
        130: 'invalid',
      }
      const iso8583 = new Iso8583({
        ...messageSpec,
        1: { name: 'Bitmap', format: bitmap(16) },
      })
      const encodeFieldMock = vi.spyOn(iso8583, 'encodeField').mockReturnValue(toHexBuffer('1234'))
      iso8583.pack('1200', call)
      expect(buildBitmap).toHaveBeenCalledWith([3, 22], 128)
      expect(encodeFieldMock).toHaveBeenCalled()
    })
  })

  describe('unpack', () => {
    it('throws if primary bitmap < 8', () => {
      const iso8583 = new Iso8583(messageSpec)
      expect(() => iso8583.unpack(toHexBuffer('12345678910'))).toThrow(/Primary bitmap underrun/)
    })

    it('throws if spec is constrained to 64, but secondary is present in the unpacking buffer', () => {
      const iso8583 = new Iso8583(messageSpec)
      const primary = Buffer.concat([Buffer.from([0x80]), Buffer.alloc(7, 0x00)])
      const buf = Buffer.concat([Buffer.alloc(4), primary])
      expect(() => iso8583.unpack(buf)).toThrow('Secondary bitmap present but constrained to 64')
    })

    it('throws secondary bitmap underrun when allowed but missing second 8 bytes', () => {
      const iso8583 = new Iso8583({ ...messageSpec, 1: { name: 'Bitmap', format: bitmap(16) } })
      const primary = Buffer.concat([Buffer.from([0x80]), Buffer.alloc(7, 0x00)])
      const buf = Buffer.concat([Buffer.alloc(4), primary])
      expect(() => iso8583.unpack(buf)).toThrow(/Secondary bitmap underrun/i)
    })

    it('parses primary only bitmap and returns fields and bytes read', () => {
      const iso8583 = new Iso8583(messageSpec)
      vi.mocked(parseBitmap).mockReturnValue([3])
      const decodeFieldSpy = vi.spyOn(iso8583, 'decodeField').mockReturnValue({ value: 'V3', read: 6 })
      const primary = toHexBuffer('0000000000000001')
      const buf = Buffer.concat([Buffer.alloc(4), primary, Buffer.alloc(32)])
      const out = iso8583.unpack(buf)
      expect(decodeFieldSpy).toHaveBeenCalledWith(
        3,
        { name: 'ProcCode', format: { kind: Kind.Numeric, length: 6 } },
        buf,
        12,
      )
      expect(out).toEqual({ mti: '1210', fields: { 3: 'V3' }, bytesRead: 18 })
    })

    it('parses with secondary bitmap when 128-bit is allowed', () => {
      const iso8583 = new Iso8583({ ...messageSpec, 1: { name: 'Bitmap', format: bitmap(16) } })
      vi.mocked(parseBitmap).mockReturnValue([3])
      vi.spyOn(iso8583, 'decodeField').mockReturnValue({ value: 'V3', read: 6 })

      const primary = Buffer.concat([Buffer.from([0x80]), Buffer.alloc(7, 0x00)])
      const secondary = Buffer.alloc(8, 0x00)

      const buf = Buffer.concat([Buffer.alloc(4), primary, secondary, Buffer.alloc(64)])
      const out = iso8583.unpack(buf)

      expect(out).toEqual({ mti: '1210', fields: { 3: 'V3' }, bytesRead: 26 })
    })

    it('throws if a present DE has no spec', () => {
      const iso8583 = new Iso8583(messageSpec)
      vi.mocked(parseBitmap).mockReturnValue([3, 50])
      vi.spyOn(iso8583, 'decodeField').mockReturnValue({ value: 'V3', read: 6 })
      const primary = toHexBuffer('0000000000000001')
      const buf = Buffer.concat([Buffer.alloc(4), primary, Buffer.alloc(16)])

      expect(() => iso8583.unpack(buf)).toThrow(/No spec for DE50/)
    })
  })

  describe('explain', () => {
    it('returns string converted to readable format', () => {
      const iso8583 = new Iso8583(messageSpec)
      vi.spyOn(iso8583, 'unpack').mockReturnValue({
        mti: '1210',
        bytesRead: 20,
        fields: { 3: '000000', 22: '923456711300' },
      })
      const explainResp = iso8583.explain(Buffer.from([0x12]))
      expect(explainResp).toStrictEqual(
        'MTI: 1210\n003 ProcCode (n, len=6): 000000\n022 POSData (an, len=12): 923456711300',
      )
    })
  })

  describe('encodeField', () => {
    const encodeNumericMock = vi.mocked(encodeNumeric)
    const encodeAlphaMock = vi.mocked(encodeAlpha)
    const encodeBinaryMock = vi.mocked(encodeBinary)
    const encodeVarMock = vi.mocked(encodeVar)
    const iso8583 = new Iso8583({})

    it('calls encodeNumeric for Numeric field in number format', () => {
      iso8583.encodeField(1, { name: 'NumericField', format: { kind: Kind.Numeric, length: 4 } }, 123456)
      expect(encodeNumericMock).toHaveBeenCalledWith({ kind: Kind.Numeric, length: 4 }, 123456)
    })

    it('calls encodeNumeric for Numeric field in string format', () => {
      iso8583.encodeField(1, { name: 'NumericField', format: { kind: Kind.Numeric, length: 4 } }, '123456')
      expect(encodeNumericMock).toHaveBeenCalledWith({ kind: Kind.Numeric, length: 4 }, '123456')
    })

    test.each([
      [Kind.Alpha, 'Alpha'],
      [Kind.AlphaNumeric, 'AlphaNumeric'],
      [Kind.AlphaNumericSpecial, 'AlphaNumericSpecial'],
    ] as const)('call encodeAlpha for $1', (kind, name) => {
      iso8583.encodeField(1, { name, format: { kind, length: 4 } }, 'some-value')
      expect(encodeAlphaMock).toHaveBeenCalledWith(1, { kind, length: 4 }, 'some-value')
    })

    it('calls encodeBinary for Binary field', () => {
      iso8583.encodeField(1, { name: 'BinaryField', format: { kind: Kind.Binary, length: 4 } }, Buffer.from([0x01]))
      expect(encodeBinaryMock).toHaveBeenCalledWith(1, { kind: Kind.Binary, length: 4 }, Buffer.from([0x01]))
    })

    test.each([
      [Kind.LLVAR, 'LLVAR'],
      [Kind.LLVARn, 'LLVARn'],
      [Kind.LLVARan, 'LLVARan'],
      [Kind.LLVARans, 'LLVARans'],
      [Kind.LLLVAR, 'LLLVAR'],
      [Kind.LLLVARn, 'LLLVARn'],
      [Kind.LLLVARan, 'LLLVARan'],
      [Kind.LLLVARans, 'LLLVARans'],
    ] as const)('call encodeVar for $1', (kind, name) => {
      iso8583.encodeField(1, { name, format: { kind, length: 4 } }, Buffer.from([0x01]))
      expect(encodeVarMock).toHaveBeenCalledWith(1, { kind, length: 4 }, Buffer.from([0x01]))
    })

    it('throws if kind is unsupported', () => {
      expect(() =>
        iso8583.encodeField(
          1,
          { name: 'UnsupportedKind', format: { kind: 'Unsupported', length: 4 } as any },
          Buffer.from([0x01]),
        ),
      ).toThrow(/Unsupported format Unsupported/)
    })
  })

  describe('decodeField', () => {
    const decodeNumericMock = vi.mocked(decodeNumeric)
    const decodeAlphaMock = vi.mocked(decodeAlpha)
    const decodeBinaryMock = vi.mocked(decodeBinary)
    const decodeVarMock = vi.mocked(decodeVar)
    const iso8583 = new Iso8583({})

    it('calls decodeNumeric for Numeric field', () => {
      iso8583.decodeField(
        1,
        { name: 'NumericField', format: { kind: Kind.Numeric, length: 4 } },
        Buffer.from([0x01]),
        0,
      )
      expect(decodeNumericMock).toHaveBeenCalledWith({ kind: Kind.Numeric, length: 4 }, Buffer.from([0x01]), 0)
    })

    test.each([
      [Kind.Alpha, 'Alpha'],
      [Kind.AlphaNumeric, 'AlphaNumeric'],
      [Kind.AlphaNumericSpecial, 'AlphaNumericSpecial'],
    ] as const)('call decodeAlpha for $1', (kind, name) => {
      iso8583.decodeField(1, { name, format: { kind, length: 4 } }, Buffer.from([0x01]), 0)
      expect(decodeAlphaMock).toHaveBeenCalledWith({ kind, length: 4 }, Buffer.from([0x01]), 0)
    })

    it('calls decodeBinary for Binary field', () => {
      iso8583.decodeField(1, { name: 'BinaryField', format: { kind: Kind.Binary, length: 4 } }, Buffer.from([0x01]), 0)
      expect(decodeBinaryMock).toHaveBeenCalledWith(1, { kind: Kind.Binary, length: 4 }, Buffer.from([0x01]), 0)
    })

    test.each([
      [Kind.LLVAR, 'LLVAR'],
      [Kind.LLVARn, 'LLVARn'],
      [Kind.LLVARan, 'LLVARan'],
      [Kind.LLVARans, 'LLVARans'],
      [Kind.LLLVAR, 'LLLVAR'],
      [Kind.LLLVARn, 'LLLVARn'],
      [Kind.LLLVARan, 'LLLVARan'],
      [Kind.LLLVARans, 'LLLVARans'],
    ] as const)('call decodeVar for $1', (kind, name) => {
      iso8583.decodeField(1, { name, format: { kind, length: 4 } }, Buffer.from([0x01]), 0)
      expect(decodeVarMock).toHaveBeenCalledWith(1, { kind, length: 4 }, Buffer.from([0x01]), 0)
    })

    it('throws if kind is unsupported', () => {
      expect(() =>
        iso8583.decodeField(
          1,
          { name: 'UnsupportedKind', format: { kind: 'Unsupported', length: 4 } as any },
          Buffer.from([0x01]),
          0,
        ),
      ).toThrow(/Unsupported format Unsupported/)
    })
  })
})
