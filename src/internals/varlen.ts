import { fromBcd, toBcd } from './bcd'
import { ERR } from './constants'
import {
  Kind,
  LLLVARFormat,
  LLVARFormat,
  VarBase,
  VARFormatRequired,
  VarLenCountMode,
  VarLenHeaderEncoding,
  VarPayloadEncoding,
} from './formats'

type MaxDigits = 2 | 3
type HeaderLenInfo = { len: number; read: number }

export const applyVarDefaults = (de: number, f: LLVARFormat | LLLVARFormat): VARFormatRequired => {
  const kind = f.kind
  const isNumericVar = [Kind.LLVARn, Kind.LLLVARn].includes(kind)

  if (f.lenCountMode === VarLenCountMode.DIGITS && !isNumericVar) throw new Error(ERR.INVALID_VAR_DIGITS_FOR_NON_N(de))

  const payload = f.payload ?? (isNumericVar ? VarPayloadEncoding.BCD_DIGITS : VarPayloadEncoding.ASCII)
  const lenHeader = f.lenHeader ?? VarLenHeaderEncoding.BCD
  const lenCountMode = f.lenCountMode ?? (isNumericVar ? VarLenCountMode.DIGITS : VarLenCountMode.BYTES)

  return {
    ...f,
    payload,
    lenHeader,
    lenCountMode,
  }
}

export const buildPayload = (enc: VarPayloadEncoding, value: Buffer | string) => {
  if (enc === VarPayloadEncoding.ASCII) {
    const s = String(value)
    const payload = Buffer.from(s, 'ascii')
    return { payload, byteLen: payload.length, digitLen: 0 }
  }
  if (enc === VarPayloadEncoding.BINARY) {
    const payload = Buffer.isBuffer(value) ? value : Buffer.from(String(value), 'hex')
    return { payload, byteLen: payload.length, digitLen: 0 }
  }
  const digits = String(value)
  const payload = toBcd(digits)
  return { payload, byteLen: payload.length, digitLen: digits.length }
}

export const writeLenHeader = (len: number, digits: MaxDigits, enc: VarLenHeaderEncoding): Buffer => {
  const s = String(len).padStart(digits, '0')
  return enc === VarLenHeaderEncoding.ASCII ? Buffer.from(s, 'ascii') : toBcd(s)
}

export const readLenHeader = (
  buf: Buffer,
  offset: number,
  digits: MaxDigits,
  enc: VarLenHeaderEncoding,
): HeaderLenInfo => {
  if (enc === VarLenHeaderEncoding.ASCII) {
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

export const validateLLVar = (kind: LLVARFormat['kind'], base: VarBase): LLVARFormat => {
  if (base.length <= 0) throw new Error(ERR.KIND_HELPER_LEN_MUST_BE(kind, '>', 0))
  if (base.length > 99) throw new Error(ERR.KIND_HELPER_LEN_MUST_BE(kind, '<=', 99))
  return { kind, ...base }
}

export const validateLLLVar = (kind: LLLVARFormat['kind'], base: VarBase): LLLVARFormat => {
  if (base.length <= 0) throw new Error(ERR.KIND_HELPER_LEN_MUST_BE(kind, '>', 0))
  if (base.length > 999) throw new Error(ERR.KIND_HELPER_LEN_MUST_BE(kind, '<=', 999))
  return { kind, ...base }
}
