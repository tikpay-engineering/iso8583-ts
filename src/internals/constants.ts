import { Kind } from './formats'

export type BitmapConstraint = 64 | 128

export const ERR = {
  ASCII_UNDERRUN: 'ASCII underrun',
  BITMAP_64_CONSTRAINT: 'Bitmap constrained to 64 bits but DE>64 present',
  BITMAP_SIZE: 'Bitmap must be 8 or 16 bytes',
  BITMAP_HELPER_SIZE: 'bitmap(): length must be 8 or 16 bytes',
  DE_RANGE: 'DE must be 2..128',
  EXPECT_DIGITS: (s: string) => `Expected digits only, got "${s}"`,
  FIELD_BYTES: (de: number, expected: number) => `DE${de} must be ${expected} bytes`,
  FIELD_HEX_INVALID: (de: number) => `Invalid hex for DE${de}`,
  FIELD_EXCEEDS: (de: number, kind: Kind, len: number) => `DE${de} exceeds ${kind}${len}`,
  FIELD_TOO_LONG: (de: number, value: number, max: number) => `DE${de} length ${value} > max ${max}`,
  FIELD_UNDERRUN: (de: number) => `DE${de} underrun`,
  INVALID_ALPHA: (fmt: Kind.Alpha | Kind.AlphaNumeric | Kind.AlphaNumericSpecial) =>
    `Value not valid for "${fmt}" field`,
  INVALID_ASCII_LEN: 'Invalid ASCII length header',
  INVALID_BCD_DIGIT: (b: number) => `Invalid BCD digit: 0x${b.toString(16).padStart(2, '0')}`,
  INVALID_BITMAP_SPEC: (de: number) => `Invalid bitmap field DE${de} spec (expect format: bitmap(8 or 16))`,
  INVALID_MTI: (m: string) => `Invalid MTI "${m}" (expect 4 digits)`,
  INVALID_MTI_SPEC: (de: number) => `Invalid MTI field DE${de} spec (expect 4 digits, numeric)`,
  INVALID_VAR_DIGITS_FOR_NON_N: (de: number) => `DE${de} invalid lenCountMode=digits for non-n field`,
  LEN_HDR_UNDERRUN: 'Length header underrun',
  KIND_HELPER_LEN_MUST_BE: (helper: string, operator: string, value: number) =>
    `${helper}(): length must be ${operator} ${value}`,
  NO_SPEC: (de: number) => `No spec for DE${de}`,
  PRIMARY_UNDERRUN: 'Primary bitmap underrun',
  SEC_BITMAP_CONSTRAINED: 'Secondary bitmap present but constrained to 64',
  SEC_UNDERRUN: 'Secondary bitmap underrun',
  UNSUPPORTED: (k: string) => `Unsupported format ${k}`,
}

export const RE = {
  ALPHA: /^[A-Za-z]*$/,
  ALNUM: /^[A-Za-z0-9]*$/,
  HEX: /^[0-9A-Fa-f]*$/,
  MTI: /^\d{4}$/,
  PRINT: /^[\x20-\x7E]*$/,
  XPN: /^[CD]\d{16}$/,
}
