import { validateAlpha } from '@internals/alpha'

describe('alpha', () => {
  describe('validateAlpha', () => {
    test.each([
      ['a', '1234'],
      ['an', 'AAAA#$'],
      ['ans', 'AAAA2342\t'],
    ] as const)('throws for fmt %s with value %s', (fmt, s) => {
      expect(() => validateAlpha(fmt, s)).toThrow(new RegExp(`Value not valid for "${fmt}" field`))
    })

    test.each([
      ['a', 'ABcdeFG'],
      ['an', 'A1Z9'],
      ['ans', 'ABC 123%$#'],
    ] as const)('does not throw for fmt %s with value %s', (fmt, s) => {
      expect(() => validateAlpha(fmt, s)).not.toThrow()
    })
  })
})
