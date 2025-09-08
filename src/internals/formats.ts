export type NumericEncoding = 'bcd' | 'ascii'
export type LenHeaderEncoding = 'bcd' | 'ascii'
export type VarEncoding = 'ascii' | 'binary' | 'bcd-digits'
export type VarLenCount = 'bytes' | 'digits'

export enum Kind {
  Alpha = 'a',
  AlphaNumeric = 'an',
  AlphaNumericSpecial = 'ans',
  Binary = 'b',
  LLVAR = 'LLVAR',
  LLVARn = 'LLVARn',
  LLVARan = 'LLVARan',
  LLVARans = 'LLVARans',
  LLLVAR = 'LLLVAR',
  LLLVARn = 'LLLVARn',
  LLLVARan = 'LLLVARan',
  LLLVARans = 'LLLVARans',
  Numeric = 'n',
}

export type AFormat = { kind: Kind.Alpha; length: number }
export type ANFormat = { kind: Kind.AlphaNumeric; length: number }
export type ANSFormat = { kind: Kind.AlphaNumericSpecial; length: number }
export type BFormat = { kind: Kind.Binary; length: number }
export type NFormat = { kind: Kind.Numeric; length: number; encoding?: NumericEncoding }

type VarBase = {
  length: number
  payload?: VarEncoding
  lenHeader?: LenHeaderEncoding
  lenCounts?: VarLenCount
}

export type LLVARFormat = { kind: Kind.LLVAR | Kind.LLVARn | Kind.LLVARan | Kind.LLVARans } & VarBase

export type LLLVARFormat = { kind: Kind.LLLVAR | Kind.LLLVARn | Kind.LLLVARan | Kind.LLLVARans } & VarBase

export type VARFormatRequired = (LLVARFormat | LLLVARFormat) &
  Required<Pick<VarBase, 'payload' | 'lenHeader' | 'lenCounts'>>
