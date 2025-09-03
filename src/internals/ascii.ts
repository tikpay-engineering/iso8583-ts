import { ERR } from './constants'

export const readAscii = (buf: Buffer, offset: number, len: number): string => {
  const slice = buf.subarray(offset, offset + len)
  if (slice.length < len) throw new Error(ERR.ASCII_UNDERRUN)
  return slice.toString('ascii')
}
