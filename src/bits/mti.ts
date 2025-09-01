import { NumericEncoding } from '../formats'
import { ERR, RE } from '../internals/constants'
import { toBcd, fromBcd, readAscii } from '../internals/primitives'

export const encodeMTI = (mti: string, enc: NumericEncoding): Buffer =>
  enc === 'ascii' ? Buffer.from(mti, 'ascii') : toBcd(mti)

export const decodeMTI = (buf: Buffer, offset: number, enc: NumericEncoding): { mti: string; read: number } => {
  const mti = enc === 'ascii' ? readAscii(buf, offset, 4) : fromBcd(buf.subarray(offset, offset + 2), 4)
  return { mti, read: enc === 'ascii' ? 4 : 2 }
}

export const assertMTI = (mti: string): void => {
  if (!RE.MTI.test(mti)) throw new Error(ERR.INVALID_MTI(mti))
}
