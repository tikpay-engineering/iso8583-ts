import { bitmap, Iso8583, LLVARn, n, type MessageSpec } from '../src'

const spec: MessageSpec = {
  0: { id: 0, name: 'MTI', format: n(4) },
  1: { id: 1, name: 'Bitmap', format: bitmap(8) },
  3: { id: 3, name: 'ProcessingCode', format: n(6) },
  4: { id: 4, name: 'Amount', format: n(12) },
  11: { id: 11, name: 'STAN', format: n(6) },
  48: { id: 48, name: 'AddlData', format: LLVARn({ length: 99 }) },
}

describe('Iso8583', () => {
  it('round-trips pack/unpack', () => {
    const iso = new Iso8583(spec)
    const fields = { 3: '000000', 4: '000000001000', 11: '000001', 48: '12345' }
    const { bytes } = iso.pack('0200', fields)
    const { mti, fields: out } = iso.unpack(bytes)
    expect(mti).toBe('0200')
    expect(out).toEqual(fields)
  })
})
