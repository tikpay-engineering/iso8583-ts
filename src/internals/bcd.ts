import { digitsOnly } from './digits'

export const fromBcd = (buf: Buffer, digits: number): string => {
  let s = ''
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i]
    s += String((b >> 4) & 0x0f)
    s += String(b & 0x0f)
  }
  return s.slice(s.length - digits)
}

export const toBcd = (digits: string): Buffer => {
  const s = digitsOnly(digits)
  const padded = s.length % 2 ? '0' + s : s
  const out = Buffer.alloc(padded.length / 2)
  for (let i = 0; i < padded.length; i += 2) {
    const hi = padded.charCodeAt(i) - 48
    const lo = padded.charCodeAt(i + 1) - 48
    out[i / 2] = (hi << 4) | lo
  }
  return out
}
