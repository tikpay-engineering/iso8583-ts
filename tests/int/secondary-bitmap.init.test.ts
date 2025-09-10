import { Kind, NumericEncoding } from '@internals/formats'
import { describe, expect, it } from 'vitest'
import { Iso8583, MessageSpec } from '../../src/iso8583'

const messageSpecWithSec: MessageSpec = {
  0: { name: 'MTI', format: { kind: Kind.Numeric, length: 4, encoding: NumericEncoding.BCD } },
  1: { name: 'Bitmap', format: { kind: Kind.Bitmap, length: 16 } }, // allow 128 bits
  3: { name: 'Proc', format: { kind: Kind.Numeric, length: 6, encoding: NumericEncoding.BCD } },
  4: { name: 'Amount', format: { kind: Kind.Numeric, length: 12, encoding: NumericEncoding.BCD } },
  70: { name: 'Network Mgmt Code', format: { kind: Kind.Numeric, length: 3, encoding: NumericEncoding.BCD } },
}

describe('integration: secondary bitmap exists', () => {
  const iso = new Iso8583(messageSpecWithSec)

  it('packs and unpacks with a DE > 64 (field 70) correctly', () => {
    const fields = {
      3: '000000',
      4: '000000010000',
      70: '301',
    }

    const { bytes } = iso.pack('0200', fields)
    const unpacked = iso.unpack(bytes)

    expect(unpacked.mti).toBe('0200')
    expect(unpacked.fields[3]).toBe(fields[3])
    expect(unpacked.fields[4]).toBe(fields[4])
    expect(unpacked.fields[70]).toBe(fields[70])

    const firstBitmapByte = bytes[2]
    expect((firstBitmapByte & 0x80) !== 0).toBe(true)

    const explain = iso.explain(bytes)
    expect(explain).toContain('070 Network Mgmt Code')
    expect(explain).toContain('301')
  })
})
