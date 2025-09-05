export type NumericEncoding = 'bcd' | 'ascii'
export type LenHeaderEncoding = 'bcd' | 'ascii'

export enum Kind {
  Alpha = 'a',
  AlphaNumeric = 'an',
  AlphaNumericSpecial = 'ans',
  Binary = 'b',
  Numeric = 'n',
}

export type AFormat = { kind: Kind.Alpha; length: number }
export type ANFormat = { kind: Kind.AlphaNumeric; length: number }
export type ANSFormat = { kind: Kind.AlphaNumericSpecial; length: number }
export type BFormat = { kind: Kind.Binary; length: number }
export type NFormat = { kind: Kind.Numeric; length: number; encoding?: NumericEncoding }
