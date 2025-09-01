import { NFormat } from '../formats'
import { toBcd, fromBcd, digitsOnly } from '../internals/primitives'

export const encodeNumeric = (f: NFormat, value: unknown): Buffer => {
  const enc = f.encoding ?? 'bcd'
  let s = digitsOnly(String(value)).padStart(f.length, '0')
  if (enc === 'ascii') return Buffer.from(s, 'ascii')
  if (s.length % 2 !== 0) s = '0' + s
  return toBcd(s)
}

export const decodeNumeric = (f: NFormat, buf: Buffer, offset: number): { value: string; read: number } => {
  const enc = f.encoding ?? 'bcd'
  if (enc === 'ascii') {
    const s = buf.subarray(offset, offset + f.length).toString('ascii')
    return { value: s, read: f.length }
  }
  const bytes = Math.ceil(f.length / 2)
  const s = fromBcd(buf.subarray(offset, offset + bytes), f.length)
  return { value: s, read: bytes }
}
