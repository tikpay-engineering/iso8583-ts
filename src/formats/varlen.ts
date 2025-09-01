import { FormatObject, VarEncoding, VarLenCount } from '../formats'
import { writeLenHeader, readLenHeader } from '../bits/lengths'
import { fromBcd, toBcd } from '../internals/primitives'
import { ERR } from '../internals/constants'

const isLLL = (f: FormatObject) => f.kind.startsWith('LLL')

export const encodeVar = (de: number, f: Extract<FormatObject, { length: number }>, value: unknown): Buffer => {
  const payloadEnc: VarEncoding = (f as any).payload!
  const headerEnc = (f as any).lenHeader!
  const countMode: VarLenCount = (f as any).lenCounts!
  const isLLLfmt = isLLL(f)

  const { payload, byteLen, digitLen } = buildPayload(payloadEnc, value)

  const maxAllowed = (f as any).length as number
  const logicalLen = payloadEnc === 'bcd-digits' ? digitLen || byteLen * 2 : byteLen
  if (logicalLen > maxAllowed) throw new Error(ERR.FIELD_TOO_LONG(de, logicalLen, maxAllowed))

  const headerDigits = isLLLfmt ? 3 : 2
  const headerValue = countMode === 'digits' ? digitLen || byteLen * 2 : byteLen
  const header = writeLenHeader(headerValue, headerDigits as 2 | 3, headerEnc)

  return Buffer.concat([header, payload])
}

export const decodeVar = (
  de: number,
  f: Extract<FormatObject, { length: number }>,
  buf: Buffer,
  offset: number,
): { value: unknown; read: number } => {
  const digitsInHeader = isLLL(f) ? 3 : 2
  const headerEnc = (f as any).lenHeader!
  const countMode: VarLenCount = (f as any).lenCounts!

  const { len: hdrLenVal, read: hdrBytes } = readLenHeader(buf, offset, digitsInHeader as 2 | 3, headerEnc)

  let byteLen: number
  if (countMode === 'bytes') {
    byteLen = hdrLenVal
  } else {
    if (!String(f.kind).endsWith('n')) throw new Error(ERR.INVALID_VAR_DIGITS_FOR_NON_N(de))
    byteLen = Math.ceil(hdrLenVal / 2)
  }

  const start = offset + hdrBytes
  const end = start + byteLen
  const slice = buf.subarray(start, end)
  if (slice.length < byteLen) throw new Error(ERR.FIELD_UNDERRUN(de))

  const payloadEnc: VarEncoding = (f as any).payload!
  if (payloadEnc === 'bcd-digits') {
    const digitsStr = fromBcd(slice, countMode === 'digits' ? hdrLenVal : byteLen * 2)
    return { value: digitsStr, read: hdrBytes + byteLen }
  }
  return { value: payloadEnc === 'ascii' ? slice.toString('ascii') : Buffer.from(slice), read: hdrBytes + byteLen }
}

const buildPayload = (enc: VarEncoding, value: unknown) => {
  if (enc === 'ascii') {
    const s = String(value)
    const payload = Buffer.from(s, 'ascii')
    return { payload, byteLen: payload.length, digitLen: 0 }
  }
  if (enc === 'binary') {
    const payload = Buffer.isBuffer(value) ? (value as Buffer) : Buffer.from(String(value), 'hex')
    return { payload, byteLen: payload.length, digitLen: 0 }
  }
  const digits = String(value).replace(/\D/g, '')
  const payload = toBcd(digits)
  return { payload, byteLen: payload.length, digitLen: digits.length }
}
