import { fromBcd, toBcd } from '@internals/bcd'
import { ERR } from '@internals/constants'
import { LenHeaderEncoding } from '@internals/formats'

type MaxDigits = 2 | 3
type HeaderLenInfo = { len: number; read: number }

export const writeLenHeader = (len: number, digits: MaxDigits, enc: LenHeaderEncoding): Buffer => {
  const s = String(len).padStart(digits, '0')
  return enc === 'ascii' ? Buffer.from(s, 'ascii') : toBcd(s)
}

export const readLenHeader = (
  buf: Buffer,
  offset: number,
  digits: MaxDigits,
  enc: LenHeaderEncoding,
): HeaderLenInfo => {
  if (enc === 'ascii') {
    const slice = buf.subarray(offset, offset + digits)
    if (slice.length < digits) throw new Error(ERR.LEN_HDR_UNDERRUN)
    const n = Number(slice.toString('ascii'))
    if (Number.isNaN(n)) throw new Error(ERR.INVALID_ASCII_LEN)
    return { len: n, read: digits }
  }
  const bytes = Math.ceil(digits / 2)
  const slice = buf.subarray(offset, offset + bytes)
  if (slice.length < bytes) throw new Error(ERR.LEN_HDR_UNDERRUN)
  const s = fromBcd(slice, digits)
  return { len: Number(s), read: bytes }
}
