import { Kind, NumericEncoding } from '@internals/formats'
import { Iso8583, MessageSpec } from '../../src/iso8583'

const messageSpec: MessageSpec = {
  0: { name: 'MTI', format: { kind: Kind.Numeric, length: 4, encoding: NumericEncoding.BCD } },
  1: { name: 'Bitmap', format: { kind: Kind.Bitmap, length: 8 } },

  2: { name: 'PAN (LLVARn)', format: { kind: Kind.LLVARn, length: 19 } },
  3: { name: 'Processing Code', format: { kind: Kind.Numeric, length: 6, encoding: NumericEncoding.BCD } },
  4: { name: 'Amount', format: { kind: Kind.Numeric, length: 12, encoding: NumericEncoding.BCD } },
  5: { name: 'Alpha field', format: { kind: Kind.Alpha, length: 5 } },
  6: { name: 'Alphanumeric', format: { kind: Kind.AlphaNumeric, length: 10 } },
  7: { name: 'AlphanumericSpec', format: { kind: Kind.AlphaNumericSpecial, length: 12 } },
  8: { name: 'Binary data', format: { kind: Kind.Binary, length: 4 } },

  20: { name: 'LLVAR alpha', format: { kind: Kind.LLVARan, length: 20 } },
  21: { name: 'LLVAR ans', format: { kind: Kind.LLVARans, length: 20 } },
  22: { name: 'LLLVAR alpha', format: { kind: Kind.LLLVARan, length: 999 } },
  23: { name: 'LLLVAR ans', format: { kind: Kind.LLLVARans, length: 999 } },
  24: { name: 'LLLVAR numeric', format: { kind: Kind.LLLVARn, length: 999 } },
}

const normalize = (v: string | number | Buffer) => (Buffer.isBuffer(v) ? v.toString('hex') : String(v))

describe('integration: pack + unpack with all formats', () => {
  const iso = new Iso8583(messageSpec)

  const fields = {
    2: '4761731234567890',
    3: '000000',
    4: '000000012345',
    5: 'ABCDE',
    6: 'ABC123XYZ9',
    7: 'ABCDE*FGHIJ!',
    8: Buffer.from('abcd', 'utf8'),
    20: 'ALPHA_VAR',
    21: 'ANS_VAR!@#',
    22: 'ALPHA_LONG_VAR',
    23: 'ANS_LONG_VAR*&^',
    24: '1234567890',
  }

  it('round-trips a message with one of every format', () => {
    const packed = iso.pack('0200', fields)
    const unpacked = iso.unpack(packed.bytes)

    expect(unpacked.mti).toBe('0200')

    const actual = Object.fromEntries(Object.entries(unpacked.fields).map(([k, v]) => [k, normalize(v)]))
    const expected = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, normalize(v)]))

    expect(actual).toEqual(expected)
  })

  it('produces a readable explain output with snapshot check', () => {
    const packed = iso.pack('0200', fields)
    const explain = iso.explain(packed.bytes)

    expect(explain).toContain('MTI: 0200')
    expect(explain).toContain('002 PAN (LLVARn)')
    expect(explain).toContain('003 Processing Code')
    expect(explain).toContain('005 Alpha field')
    expect(explain).toContain('008 Binary data')

    expect(explain).toContain('ABCDE')
    expect(explain).toContain('ABC123XYZ9')
    expect(explain).toContain('ALPHA_LONG_VAR')
    expect(explain).toContain('1234567890')

    expect(explain).toMatchSnapshot()
  })
})
