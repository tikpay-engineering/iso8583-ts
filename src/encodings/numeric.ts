import { fromBcd, toBcd } from '@internals/bcd'
import { ERR } from '@internals/constants'
import { digitsOnly } from '@internals/digits'
import { NFormat, NumericEncoding } from '@internals/formats'

type NumericReturn = { value: string; read: number }

export const encodeNumeric = (f: NFormat, value: string | number): Buffer => {
  const enc = f.encoding ?? NumericEncoding.BCD
  const digits = digitsOnly(String(value))
  if (digits.length > f.length) throw new Error(ERR.NUMERIC_EXCEEDS(digits.length, f.length))
  let s = digits.padStart(f.length, '0')
  if (enc === NumericEncoding.ASCII) return Buffer.from(s, 'ascii')
  if (s.length % 2 !== 0) s = '0' + s
  return toBcd(s)
}

export const decodeNumeric = (f: NFormat, buf: Buffer, offset: number): NumericReturn => {
  const enc = f.encoding ?? NumericEncoding.BCD
  if (enc === NumericEncoding.ASCII) {
    const s = buf.subarray(offset, offset + f.length).toString('ascii')
    return { value: s, read: f.length }
  }
  const bytes = Math.ceil(f.length / 2)
  const s = fromBcd(buf.subarray(offset, offset + bytes), f.length)
  return { value: s, read: bytes }
}
