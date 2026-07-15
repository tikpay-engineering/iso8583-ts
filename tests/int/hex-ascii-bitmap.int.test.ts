import { BitmapEncoding, Kind, NumericEncoding } from '@internals/formats'
import { Iso8583, MessageSpec } from '../../src/iso8583'

const spec: MessageSpec = {
  0: { name: 'MTI', format: { kind: Kind.Numeric, length: 4, encoding: NumericEncoding.ASCII } },
  1: { name: 'Bitmap', format: { kind: Kind.Bitmap, length: 16, encoding: BitmapEncoding.HexAscii } },
  3: { name: 'Processing Code', format: { kind: Kind.Numeric, length: 6, encoding: NumericEncoding.ASCII } },
  4: { name: 'Amount', format: { kind: Kind.Numeric, length: 12, encoding: NumericEncoding.ASCII } },
  70: { name: 'Network Mgmt Code', format: { kind: Kind.Numeric, length: 3, encoding: NumericEncoding.ASCII } },
}

describe('integration: hex-ascii bitmap', () => {
  const iso = new Iso8583(spec)

  it('round-trips a primary-only message with hex-ascii bitmap', () => {
    const fields = { 3: '000000', 4: '000000012345' }
    const { bytes } = iso.pack('0100', fields)
    const unpacked = iso.unpack(bytes)

    expect(unpacked.mti).toBe('0100')
    expect(unpacked.fields[3]).toBe('000000')
    expect(unpacked.fields[4]).toBe('000000012345')
  })

  it('emits the bitmap as ASCII hex characters, not raw bytes', () => {
    const fields = { 3: '000000' }
    const { bytes } = iso.pack('0100', fields)

    // MTI is 4 ASCII chars, then bitmap starts at offset 4
    const bitmapSlice = bytes.subarray(4, 20)
    const bitmapStr = bitmapSlice.toString('ascii')
    expect(/^[0-9A-F]{16}$/.test(bitmapStr)).toBe(true)
  })

  it('round-trips a message with DE > 64 using hex-ascii secondary bitmap', () => {
    const fields = { 3: '000000', 4: '000000010000', 70: '301' }
    const { bytes } = iso.pack('0800', fields)
    const unpacked = iso.unpack(bytes)

    expect(unpacked.mti).toBe('0800')
    expect(unpacked.fields[3]).toBe('000000')
    expect(unpacked.fields[4]).toBe('000000010000')
    expect(unpacked.fields[70]).toBe('301')

    // Primary bitmap (16 ASCII chars) should have high bit set on first byte (secondary indicator)
    const primaryHex = bytes.subarray(4, 20).toString('ascii')
    expect((parseInt(primaryHex.slice(0, 2), 16) & 0x80) !== 0).toBe(true)
  })
})
