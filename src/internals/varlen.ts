import { toBcd } from './bcd'
import {
  Kind,
  LLLVARFormat,
  LLVARFormat,
  VARFormatRequired,
  VarLenCount,
  VarLenHeaderEncoding,
  VarPayloadEncoding,
} from './formats'

export const applyVarDefaults = (f: LLVARFormat | LLLVARFormat): VARFormatRequired => {
  const kind = f.kind
  const isNumericVar = [Kind.LLVARn, Kind.LLLVARn].includes(kind)
  const payload = f.payload ?? (isNumericVar ? VarPayloadEncoding.BCD_DIGITS : VarPayloadEncoding.ASCII)
  const lenHeader = f.lenHeader ?? VarLenHeaderEncoding.BCD
  const lenCounts = f.lenCounts ?? (isNumericVar ? VarLenCount.DIGITS : VarLenCount.BYTES)

  return {
    ...f,
    payload,
    lenHeader,
    lenCounts,
  }
}

export const buildPayload = (enc: VarPayloadEncoding, value: Buffer | string) => {
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
