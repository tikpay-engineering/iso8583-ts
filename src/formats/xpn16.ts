import { ERR, RE } from '../internals/constants'
import { toBcd, fromBcd } from '../internals/primitives'

export const encodeXPlusN16 = (de: number, value: unknown): Buffer => {
  const s = String(value)
  if (!RE.XPN.test(s)) throw new Error(ERR.XPN16_EXPECT(de))
  return Buffer.concat([Buffer.from(s[0], 'ascii'), toBcd(s.slice(1))])
}

export const decodeXPlusN16 = (de: number, buf: Buffer, offset: number): { value: string; read: number } => {
  const slice = buf.subarray(offset, offset + 9)
  if (slice.length < 9) throw new Error(ERR.FIELD_UNDERRUN(de))
  const prefix = slice.subarray(0, 1).toString('ascii')
  if (!/^[CD]$/.test(prefix)) throw new Error(ERR.XPN16_PREFIX(de))
  const digits = fromBcd(slice.subarray(1), 16)
  return { value: `${prefix}${digits}`, read: 9 }
}
