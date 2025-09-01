import { ERR } from '../internals/constants'

type BinaryFormat = { kind: 'b'; length: number }

export const encodeBinary = (de: number, f: BinaryFormat, value: unknown): Buffer => {
  const expected = f.length
  const payload = Buffer.isBuffer(value) ? (value as Buffer) : Buffer.from(String(value), 'hex')
  if (payload.length !== expected) throw new Error(ERR.FIELD_BYTES(de, expected))
  return payload
}

export const decodeBinary = (
  de: number,
  f: BinaryFormat,
  buf: Buffer,
  offset: number,
): { value: Buffer; read: number } => {
  const slice = buf.subarray(offset, offset + f.length)
  if (slice.length < f.length) throw new Error(ERR.FIELD_UNDERRUN(de))
  return { value: Buffer.from(slice), read: f.length }
}
