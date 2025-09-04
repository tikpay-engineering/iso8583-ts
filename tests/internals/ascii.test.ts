import { readAscii } from '@internals/ascii'

describe('ascii', () => {
  it('throws if extracted string length from buffer is less than given length', () => {
    const buf = Buffer.from('test', 'ascii')
    expect(() => readAscii(buf, 1, 5)).toThrow(/ASCII underrun/)
  })

  it('reads a substring from the buffer at the given offset and length', () => {
    const buf = Buffer.from('correct-test', 'ascii')
    expect(readAscii(buf, 0, 7)).toBe('correct')
    expect(readAscii(buf, 8, 4)).toBe('test')
  })
})
