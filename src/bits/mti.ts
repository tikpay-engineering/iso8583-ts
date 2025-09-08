import { readAscii } from '@internals/ascii'
import { fromBcd, toBcd } from '@internals/bcd'
import { ERR, RE } from '@internals/constants'
import { NumericEncoding } from '@internals/formats'

type DecodedMti = { mti: string; read: number }

export const encodeMTI = (mti: string, enc: NumericEncoding): Buffer =>
  enc === NumericEncoding.ASCII ? Buffer.from(mti, 'ascii') : toBcd(mti)

export const decodeMTI = (buf: Buffer, offset: number, enc: NumericEncoding): DecodedMti => {
  const mti = enc === NumericEncoding.ASCII ? readAscii(buf, offset, 4) : fromBcd(buf.subarray(offset, offset + 2), 4)
  return { mti, read: enc === NumericEncoding.ASCII ? 4 : 2 }
}

export const assertMTI = (mti: string): void => {
  if (!RE.MTI.test(mti)) throw new Error(ERR.INVALID_MTI(mti))
}
