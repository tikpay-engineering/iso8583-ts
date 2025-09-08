import { toBcd } from './bcd'
import { Kind, LLLVARFormat, LLVARFormat, VarEncoding, VARFormatRequired } from './formats'

export const applyVarDefaults = (f: LLVARFormat | LLLVARFormat): VARFormatRequired => {
  const kind = f.kind
  const isNumericVar = [Kind.LLVARn, Kind.LLLVARn].includes(kind)
  const payload = f.payload ?? (isNumericVar ? 'bcd-digits' : 'ascii')
  const lenHeader = f.lenHeader ?? 'bcd'
  const lenCounts = f.lenCounts ?? (isNumericVar ? 'digits' : 'bytes')

  return {
    ...f,
    payload,
    lenHeader,
    lenCounts,
  }
}

export const buildPayload = (enc: VarEncoding, value: Buffer | string) => {
  if (enc === 'ascii') {
    const s = String(value)
    const payload = Buffer.from(s, 'ascii')
    return { payload, byteLen: payload.length, digitLen: 0 }
  }
  if (enc === 'binary') {
    const payload = Buffer.isBuffer(value) ? value : Buffer.from(String(value), 'hex')
    return { payload, byteLen: payload.length, digitLen: 0 }
  }
  const digits = String(value)
  const payload = toBcd(digits)
  return { payload, byteLen: payload.length, digitLen: digits.length }
}
