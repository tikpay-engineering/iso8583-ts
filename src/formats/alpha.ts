import { validateAlpha } from '../internals/primitives'
import { ERR } from '../internals/constants'

type AlphaFormat = { kind: 'a' | 'an' | 'ans'; length: number }

export const encodeAlpha = (de: number, f: AlphaFormat, value: unknown): Buffer => {
  const s = String(value)
  if (s.length > f.length) throw new Error(ERR.FIELD_EXCEEDS(de, f.kind, f.length))
  validateAlpha(f.kind, s)
  return Buffer.from(s.padEnd(f.length, ' '), 'ascii')
}

export const decodeAlpha = (f: AlphaFormat, buf: Buffer, offset: number): { value: string; read: number } => {
  const slice = buf.subarray(offset, offset + f.length)
  const s = slice.toString('ascii').trimEnd()
  validateAlpha(f.kind, s)
  return { value: s, read: f.length }
}
