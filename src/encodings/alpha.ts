import { validateAlpha } from '@internals/alpha'
import { ERR } from '@internals/constants'
import { AFormat, ANFormat, ANSFormat } from '@internals/formats'

type AlphaFormat = AFormat | ANFormat | ANSFormat
type DecodeAlpha = { value: string; read: number }

/** @internal */
export const encodeAlpha = (de: number, f: AlphaFormat, value: string): Buffer => {
  if (value.length > f.length) throw new Error(ERR.FIELD_EXCEEDS(de, f.kind, f.length))
  validateAlpha(f.kind, value)
  return Buffer.from(value.padEnd(f.length, ' '), 'ascii')
}

/** @internal */
export const decodeAlpha = (f: AlphaFormat, buf: Buffer, offset: number): DecodeAlpha => {
  const slice = buf.subarray(offset, offset + f.length)
  const s = slice.toString('ascii').trimEnd()
  validateAlpha(f.kind, s)
  return { value: s, read: f.length }
}
