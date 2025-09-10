import { ERR } from './constants'
import { validateLLLVar, validateLLVar } from './varlen'

export enum NumericEncoding {
  ASCII = 'ascii',
  BCD = 'bcd',
}
export enum VarLenHeaderEncoding {
  ASCII = 'ascii',
  BCD = 'bcd',
}
export enum VarPayloadEncoding {
  ASCII = 'ascii',
  BINARY = 'binary',
  BCD_DIGITS = 'bcd-digits',
}
export enum VarLenCountMode {
  BYTES = 'bytes',
  DIGITS = 'digits',
}

export enum Kind {
  Alpha = 'a',
  AlphaNumeric = 'an',
  AlphaNumericSpecial = 'ans',
  Binary = 'b',
  Bitmap = 'bitmap',
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
export type BitmapFormat = { kind: Kind.Bitmap; length: 8 | 16 }

export type FormatObject =
  | NFormat
  | AFormat
  | ANFormat
  | ANSFormat
  | BFormat
  | BitmapFormat
  | LLVARFormat
  | LLLVARFormat

export type VarBase = {
  length: number
  payload?: VarPayloadEncoding
  lenHeader?: VarLenHeaderEncoding
  lenCountMode?: VarLenCountMode
}

export type LLVARFormat = { kind: Kind.LLVAR | Kind.LLVARn | Kind.LLVARan | Kind.LLVARans } & VarBase

export type LLLVARFormat = { kind: Kind.LLLVAR | Kind.LLLVARn | Kind.LLLVARan | Kind.LLLVARans } & VarBase

export type VARFormatRequired = (LLVARFormat | LLLVARFormat) &
  Required<Pick<VarBase, 'payload' | 'lenHeader' | 'lenCountMode'>>

export const N = (length: number, opts?: { encoding?: NumericEncoding }): NFormat => {
  if (length <= 0) throw new Error(ERR.KIND_HELPER_LEN_MUST_BE('N', '>', 0))
  return { kind: Kind.Numeric, length, encoding: opts?.encoding }
}

export const A = (length: number): AFormat => {
  if (length <= 0) throw new Error(ERR.KIND_HELPER_LEN_MUST_BE('A', '>', 0))
  return { kind: Kind.Alpha, length }
}

export const AN = (length: number): ANFormat => {
  if (length <= 0) throw new Error(ERR.KIND_HELPER_LEN_MUST_BE('AN', '>', 0))
  return { kind: Kind.AlphaNumeric, length }
}

export const ANS = (length: number): ANSFormat => {
  if (length <= 0) throw new Error(ERR.KIND_HELPER_LEN_MUST_BE('ANS', '>', 0))
  return { kind: Kind.AlphaNumericSpecial, length }
}

export const B = (lengthBytes: number): BFormat => {
  if (lengthBytes <= 0) throw new Error(ERR.KIND_HELPER_LEN_MUST_BE('B', '>', 0))
  return { kind: Kind.Binary, length: lengthBytes }
}

export const bitmap = (lengthBytes: 8 | 16): BitmapFormat => {
  if (lengthBytes !== 8 && lengthBytes !== 16) throw new Error(ERR.BITMAP_HELPER_SIZE)
  return { kind: Kind.Bitmap, length: lengthBytes }
}

export const LLVAR = (opts: VarBase): LLVARFormat => validateLLVar(Kind.LLVAR, opts)

export const LLVARn = (opts: VarBase): LLVARFormat => validateLLVar(Kind.LLVARn, opts)

export const LLVARan = (opts: VarBase): LLVARFormat => validateLLVar(Kind.LLVARan, opts)

export const LLVARans = (opts: VarBase): LLVARFormat => validateLLVar(Kind.LLVARans, opts)

export const LLLVAR = (opts: VarBase): LLLVARFormat => validateLLLVar(Kind.LLLVAR, opts)

export const LLLVARn = (opts: VarBase): LLLVARFormat => validateLLLVar(Kind.LLLVARn, opts)

export const LLLVARan = (opts: VarBase): LLLVARFormat => validateLLLVar(Kind.LLLVARan, opts)

export const LLLVARans = (opts: VarBase): LLLVARFormat => validateLLLVar(Kind.LLLVARans, opts)
