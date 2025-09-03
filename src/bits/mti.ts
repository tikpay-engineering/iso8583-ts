import { NumericEncoding } from '../formats'
import { readAscii } from '../internals/ascii'
import { fromBcd, toBcd } from '../internals/bcd'
import { ERR, RE } from '../internals/constants'

type DecodedMti = { mti: string; read: number }

export const encodeMTI = (mti: string, enc: NumericEncoding): Buffer =>
  enc === 'ascii' ? Buffer.from(mti, 'ascii') : toBcd(mti)

export const decodeMTI = (buf: Buffer, offset: number, enc: NumericEncoding): DecodedMti => {
  const mti = enc === 'ascii' ? readAscii(buf, offset, 4) : fromBcd(buf.subarray(offset, offset + 2), 4)
  return { mti, read: enc === 'ascii' ? 4 : 2 }
}

export const assertMTI = (mti: string): void => {
  if (!RE.MTI.test(mti)) throw new Error(ERR.INVALID_MTI(mti))
}
