import {
  A,
  AN,
  ANS,
  B,
  bitmap,
  Kind,
  LLLVAR,
  LLLVARan,
  LLLVARans,
  LLLVARn,
  LLVAR,
  LLVARan,
  LLVARans,
  LLVARn,
  N,
  NumericEncoding,
} from '@internals/formats'
import { validateLLLVar, validateLLVar } from '@internals/varlen'

vi.mock('@internals/varlen', () => ({
  validateLLVar: vi.fn(),
  validateLLLVar: vi.fn(),
}))

describe('formats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('N', () => {
    it('throws if length is 0', () => {
      expect(() => N(0)).toThrow('N(): length must be > 0')
    })
    it('returns kind set to Numeric', () => {
      expect(N(4, { encoding: NumericEncoding.BCD })).toStrictEqual({
        kind: Kind.Numeric,
        length: 4,
        encoding: NumericEncoding.BCD,
      })
    })
  })

  describe('A', () => {
    it('throws if length is 0', () => {
      expect(() => A(0)).toThrow('A(): length must be > 0')
    })
    it('returns kind set to Alpha', () => {
      expect(A(4)).toStrictEqual({
        kind: Kind.Alpha,
        length: 4,
      })
    })
  })

  describe('AN', () => {
    it('throws if length is 0', () => {
      expect(() => AN(0)).toThrow('AN(): length must be > 0')
    })
    it('returns kind set to AlphaNumeric', () => {
      expect(AN(4)).toStrictEqual({
        kind: Kind.AlphaNumeric,
        length: 4,
      })
    })
  })

  describe('ANS', () => {
    it('throws if length is 0', () => {
      expect(() => ANS(0)).toThrow('ANS(): length must be > 0')
    })
    it('returns kind set to AlphaNumericSpecial', () => {
      expect(ANS(4)).toStrictEqual({
        kind: Kind.AlphaNumericSpecial,
        length: 4,
      })
    })
  })

  describe('B', () => {
    it('throws if length is 0', () => {
      expect(() => B(0)).toThrow('B(): length must be > 0')
    })
    it('returns kind set to Binary', () => {
      expect(B(4)).toStrictEqual({
        kind: Kind.Binary,
        length: 4,
      })
    })
  })

  describe('bitmap', () => {
    it('throws if length is not 8 or 16', () => {
      expect(() => bitmap(10 as any)).toThrow('bitmap(): length must be 8 or 16 bytes')
    })
    it('returns kind set to Bitmap', () => {
      expect(bitmap(8)).toStrictEqual({
        kind: Kind.Bitmap,
        length: 8,
      })
    })
  })

  describe('VAR helpers', () => {
    test.each([
      { method: LLVAR, methodName: 'LLVAR', kind: Kind.LLVAR, expected: validateLLVar, expectedName: 'validateLLVar' },
      {
        method: LLVARn,
        methodName: 'LLVARn',
        kind: Kind.LLVARn,
        expected: validateLLVar,
        expectedName: 'validateLLVar',
      },
      {
        method: LLVARan,
        methodName: 'LLVARan',
        kind: Kind.LLVARan,
        expected: validateLLVar,
        expectedName: 'validateLLVar',
      },
      {
        method: LLVARans,
        methodName: 'LLVARans',
        kind: Kind.LLVARans,
        expected: validateLLVar,
        expectedName: 'validateLLVar',
      },
      { method: LLVAR, methodName: 'LLVAR', kind: Kind.LLVAR, expected: validateLLVar, expectedName: 'validateLLLVar' },
      {
        method: LLLVAR,
        methodName: 'LLLVAR',
        kind: Kind.LLLVAR,
        expected: validateLLLVar,
        expectedName: 'validateLLLVar',
      },
      {
        method: LLLVARn,
        methodName: 'LLLVARn',
        kind: Kind.LLLVARn,
        expected: validateLLLVar,
        expectedName: 'validateLLLVar',
      },
      {
        method: LLLVARan,
        methodName: 'LLLVARan',
        kind: Kind.LLLVARan,
        expected: validateLLLVar,
        expectedName: 'validateLLLVar',
      },
      {
        method: LLLVARans,
        methodName: 'LLLVARans',
        kind: Kind.LLLVARans,
        expected: validateLLLVar,
        expectedName: 'validateLLLVar',
      },
    ] as const)('call $expectedName method with $kind for $methodName helper', ({ method, kind, expected }) => {
      const validateMock = vi.mocked(expected)
      method({ length: 4 })
      expect(validateMock).toHaveBeenCalledWith(kind, { length: 4 })
    })
  })
})
