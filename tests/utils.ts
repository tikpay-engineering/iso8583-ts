export const toHex = (b: Buffer) => b.toString('hex')
export const toHexBuffer = (h: string) => Buffer.from(h, 'hex')
export const toAsciiBuffer = (h: string) => Buffer.from(h, 'ascii')
