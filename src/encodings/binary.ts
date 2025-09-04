import { ERR, RE } from '@internals/constants'
import { BFormat } from '@internals/formats'

type DecodeBinary = { value: Buffer; read: number }

export const encodeBinary = (de: number, f: BFormat, value: Buffer | string): Buffer => {
  const expected = f.length
  let payload
  if (Buffer.isBuffer(value)) {
    payload = value
  } else {
    if (!RE.HEX.test(value)) throw new Error(ERR.FIELD_HEX_INVALID(de))
    payload = Buffer.from(value, 'hex')
  }

  if (payload.length !== expected) throw new Error(ERR.FIELD_BYTES(de, expected))
  return payload
}

export const decodeBinary = (de: number, f: BFormat, buf: Buffer, offset: number): DecodeBinary => {
  const slice = buf.subarray(offset, offset + f.length)
  if (slice.length < f.length) throw new Error(ERR.FIELD_UNDERRUN(de))
  return { value: Buffer.from(slice), read: f.length }
}
