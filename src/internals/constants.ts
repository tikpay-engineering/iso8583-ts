export type BitmapConstraint = 64 | 128

export const ERR = {
  NO_SPEC: (de: number) => `No spec for DE${de}`,
  BITMAP_64_CONSTRAINT: 'Bitmap constrained to 64 bits but DE>64 present',
  SEC_BITMAP_CONSTRAINED: 'Secondary bitmap present but constrained to 64',
  PRIMARY_UNDERRUN: 'Primary bitmap underrun',
  SEC_UNDERRUN: 'Secondary bitmap underrun',
  ASCII_UNDERRUN: 'ASCII underrun',
  INVALID_MTI: (m: string) => `Invalid MTI "${m}" (expect 4 digits)`,
  INVALID_ASCII_LEN: 'Invalid ASCII length header',
  LEN_HDR_UNDERRUN: 'Length header underrun',
  FIELD_UNDERRUN: (de: number) => `DE${de} underrun`,
  FIELD_TOO_LONG: (de: number, got: number, max: number) => `DE${de} length ${got} > max ${max}`,
  FIELD_EXCEEDS: (de: number, kind: string, len: number) => `DE${de} exceeds ${kind}${len}`,
  FIELD_BYTES: (de: number, expected: number) => `DE${de} must be ${expected} bytes`,
  NON_DIGIT_BCD: 'Non-digit in BCD input',
  XPN16_EXPECT: (de: number) => `DE${de} expects C|D + 16 digits`,
  XPN16_PREFIX: (de: number) => `DE${de} invalid prefix`,
  BITMAP_DIRECT: (de: number) => `DE${de} cannot be encoded directly (bitmap is auto-built)`,
  BITMAP_DECODE_PER_FIELD: (de: number) => `DE${de} should not be decoded per-field (bitmap handled globally)`,
  MSG_TOO_LONG_B16: 'Message too long for b16 prefix',
  TRUNC_B16: 'Truncated b16 prefix',
  TRUNC_AFTER_B16: 'Truncated after b16 prefix',
  BITMAP_SIZE: 'Bitmap must be 8 or 16 bytes',
  DE_RANGE: 'DE must be 2..128',
  INVALID_VAR_DIGITS_FOR_NON_N: (de: number) => `DE${de} invalid lenCounts=digits for non-n field`,
  UNSUPPORTED: (k: string) => `Unsupported format ${k}`,
  ALPHA_INVALID: (fmt: 'a' | 'an' | 'ans') => `Value not valid for ${fmt} field`,
  EXPECT_DIGITS: (s: string) => `Expected digits only, got "${s}"`,
} as const

export const RE = {
  MTI: /^\d{4}$/,
  XPN: /^[CD]\d{16}$/,
  ALPHA: /^[A-Za-z]*$/,
  ALNUM: /^[A-Za-z0-9]*$/,
  PRINT: /^[\x20-\x7E]*$/,
} as const
