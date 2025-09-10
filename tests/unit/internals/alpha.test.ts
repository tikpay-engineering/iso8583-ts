import { validateAlpha } from '@internals/alpha'
import { Kind } from '@internals/formats'

describe('alpha', () => {
  describe('validateAlpha', () => {
    test.each([
      [Kind.Alpha, '1234'],
      [Kind.AlphaNumeric, 'AAAA#$'],
      [Kind.AlphaNumericSpecial, 'AAAA2342\t'],
    ] as const)('throws for fmt %s with value %s', (fmt, s) => {
      expect(() => validateAlpha(fmt, s)).toThrow(new RegExp(`Value not valid for "${fmt}" field`))
    })

    test.each([
      [Kind.Alpha, 'ABcdeFG'],
      [Kind.AlphaNumeric, 'A1Z9'],
      [Kind.AlphaNumericSpecial, 'ABC 123%$#'],
    ] as const)('does not throw for fmt %s with value %s', (fmt, s) => {
      expect(() => validateAlpha(fmt, s)).not.toThrow()
    })
  })
})
