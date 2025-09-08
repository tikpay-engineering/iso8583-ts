import { fromBcd } from '@internals/bcd'
import { ERR } from '@internals/constants'
import { LLLVARFormat, LLVARFormat } from '@internals/formats'
import { applyVarDefaults, buildPayload, readLenHeader, writeLenHeader } from '@internals/varlen'

type DecodeVar = { value: unknown; read: number }

export const encodeVar = (de: number, f: LLVARFormat | LLLVARFormat, value: Buffer | string): Buffer => {
  const {
    payload: payloadEnc,
    lenHeader: headerEnc,
    lenCountMode: countMode,
    length: maxAllowed,
  } = applyVarDefaults(de, f)

  const { payload, byteLen, digitLen } = buildPayload(payloadEnc, value)

  const logicalLen = payloadEnc === 'bcd-digits' ? digitLen : byteLen
  if (logicalLen > maxAllowed) throw new Error(ERR.FIELD_TOO_LONG(de, logicalLen, maxAllowed))

  const headerDigits = f.kind.startsWith('LLL') ? 3 : 2
  const headerValue = countMode === 'digits' ? digitLen : byteLen
  const header = writeLenHeader(headerValue, headerDigits, headerEnc)

  return Buffer.concat([header, payload])
}

export const decodeVar = (de: number, f: LLVARFormat | LLLVARFormat, buf: Buffer, offset: number): DecodeVar => {
  const headerDigits = f.kind.startsWith('LLL') ? 3 : 2
  const { payload: payloadEnc, lenHeader: headerEnc, lenCountMode } = applyVarDefaults(de, f)

  const { len: hdrLenVal, read: hdrBytes } = readLenHeader(buf, offset, headerDigits, headerEnc)

  let byteLen: number
  if (lenCountMode === 'bytes') {
    byteLen = hdrLenVal
  } else {
    byteLen = Math.ceil(hdrLenVal / 2)
  }

  const start = offset + hdrBytes
  const end = start + byteLen
  const slice = buf.subarray(start, end)
  if (slice.length < byteLen) throw new Error(ERR.FIELD_UNDERRUN(de))

  if (payloadEnc === 'bcd-digits') {
    const digitsStr = fromBcd(slice, lenCountMode === 'digits' ? hdrLenVal : byteLen * 2)
    return { value: digitsStr, read: hdrBytes + byteLen }
  }

  return { value: payloadEnc === 'ascii' ? slice.toString('ascii') : Buffer.from(slice), read: hdrBytes + byteLen }
}
