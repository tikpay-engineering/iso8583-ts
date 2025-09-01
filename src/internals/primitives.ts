import { ERR, RE } from './constants'

export const toBcd = (digits: string): Buffer => {
  const s = digitsOnly(digits)
  const padded = s.length % 2 ? '0' + s : s
  const out = Buffer.alloc(padded.length / 2)
  for (let i = 0; i < padded.length; i += 2) {
    const hi = padded.charCodeAt(i) - 48
    const lo = padded.charCodeAt(i + 1) - 48
    if (hi < 0 || hi > 9 || lo < 0 || lo > 9) throw new Error(ERR.NON_DIGIT_BCD)
    out[i / 2] = (hi << 4) | lo
  }
  return out
}

export const fromBcd = (buf: Buffer, digits: number): string => {
  let s = ''
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i]
    s += String((b >> 4) & 0x0f)
    s += String(b & 0x0f)
  }
  return s.slice(s.length - digits)
}

export const readAscii = (buf: Buffer, offset: number, len: number): string => {
  const slice = buf.subarray(offset, offset + len)
  if (slice.length < len) throw new Error(ERR.ASCII_UNDERRUN)
  return slice.toString('ascii')
}

export const digitsOnly = (s: string): string => {
  if (!/^\d*$/.test(s)) throw new Error(ERR.EXPECT_DIGITS(s))
  return s
}

export const validateAlpha = (fmt: 'a' | 'an' | 'ans', s: string): void => {
  const ok =
    (fmt === 'a' && RE.ALPHA.test(s)) || (fmt === 'an' && RE.ALNUM.test(s)) || (fmt === 'ans' && RE.PRINT.test(s))
  if (!ok) throw new Error(ERR.ALPHA_INVALID(fmt))
}
