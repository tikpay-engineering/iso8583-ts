import { ERR } from './constants'
import { validateLLLVar, validateLLVar } from './varlen'

/** Numeric packing: BCD = 2 digits/byte, ASCII = 1 char/byte. */
export enum NumericEncoding {
  ASCII = 'ascii',
  BCD = 'bcd',
}

/** Bitmap wire encoding: raw bytes (default) or ASCII hex (16 chars per 8-byte segment). */
export enum BitmapEncoding {
  Binary = 'binary',
  HexAscii = 'hex-ascii',
}
/** Encoding of the LL/LLL length prefix. BCD LL=1 byte/LLL=2 bytes; ASCII LL=2 bytes/LLL=3 bytes. */
export enum VarLenHeaderEncoding {
  ASCII = 'ascii',
  BCD = 'bcd',
}
/** Encoding of a variable field's value bytes. */
export enum VarPayloadEncoding {
  ASCII = 'ascii',
  BINARY = 'binary',
  BCD_DIGITS = 'bcd-digits',
}
/** Whether a length header counts digits or bytes. `DIGITS` is valid only on numeric (`*n`) fields. */
export enum VarLenCountMode {
  BYTES = 'bytes',
  DIGITS = 'digits',
}

/** Internal field-type tag carried on every format object. Use the helpers below, not this directly. */
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
  LLVARb = 'LLVARb',
  LLLVAR = 'LLLVAR',
  LLLVARn = 'LLLVARn',
  LLLVARan = 'LLLVARan',
  LLLVARans = 'LLLVARans',
  LLLVARb = 'LLLVARb',
  Numeric = 'n',
}

export type HeaderSpec = {
  encode: (messageBytes: Buffer) => Buffer
  decode: (buf: Buffer) => { headerLength: number }
}

export type AFormat = { kind: Kind.Alpha; length: number }
export type ANFormat = { kind: Kind.AlphaNumeric; length: number }
export type ANSFormat = { kind: Kind.AlphaNumericSpecial; length: number }
export type BFormat = { kind: Kind.Binary; length: number }
export type NFormat = { kind: Kind.Numeric; length: number; encoding?: NumericEncoding }
export type BitmapFormat = { kind: Kind.Bitmap; length: 8 | 16; encoding?: BitmapEncoding }

export type FormatObject =
  | NFormat
  | AFormat
  | ANFormat
  | ANSFormat
  | BFormat
  | BitmapFormat
  | LLVARFormat
  | LLLVARFormat

/** Options shared by every LL/LLL helper. */
export type VarBase = {
  /** Max logical length: digits for numeric (`*n`) fields, bytes otherwise. */
  length: number
  /** Value encoding. Defaults: `BCD_DIGITS` for `*n`, `BINARY` for `*b`, otherwise `ASCII`. */
  payload?: VarPayloadEncoding
  /** Length-prefix encoding. Default: `BCD`. */
  lenHeader?: VarLenHeaderEncoding
  /** Whether the length counts digits or bytes. Defaults: `DIGITS` for `*n`, otherwise `BYTES`. */
  lenCountMode?: VarLenCountMode
}

export type LLVARFormat = { kind: Kind.LLVAR | Kind.LLVARn | Kind.LLVARan | Kind.LLVARans | Kind.LLVARb } & VarBase

export type LLLVARFormat = { kind: Kind.LLLVAR | Kind.LLLVARn | Kind.LLLVARan | Kind.LLLVARans | Kind.LLLVARb } & VarBase

export type VARFormatRequired = (LLVARFormat | LLLVARFormat) &
  Required<Pick<VarBase, 'payload' | 'lenHeader' | 'lenCountMode'>>

// Implementation inspired by @micham/iso8583 -> using below helper methods that enforce types and required/optional params

/** Fixed-length numeric field (n). BCD-encoded by default; pass `{ encoding: NumericEncoding.ASCII }` for ASCII. */
export const N = (length: number, opts?: { encoding?: NumericEncoding }): NFormat => {
  if (length <= 0) throw new Error(ERR.KIND_HELPER_LEN_MUST_BE('N', '>', 0))
  return { kind: Kind.Numeric, length, encoding: opts?.encoding }
}

/** Fixed-length alphabetic field (a), space-padded. */
export const A = (length: number): AFormat => {
  if (length <= 0) throw new Error(ERR.KIND_HELPER_LEN_MUST_BE('A', '>', 0))
  return { kind: Kind.Alpha, length }
}

/** Fixed-length alphanumeric field (an), space-padded. */
export const AN = (length: number): ANFormat => {
  if (length <= 0) throw new Error(ERR.KIND_HELPER_LEN_MUST_BE('AN', '>', 0))
  return { kind: Kind.AlphaNumeric, length }
}

/** Fixed-length alphanumeric + printable-special field (ans), space-padded. */
export const ANS = (length: number): ANSFormat => {
  if (length <= 0) throw new Error(ERR.KIND_HELPER_LEN_MUST_BE('ANS', '>', 0))
  return { kind: Kind.AlphaNumericSpecial, length }
}

/** Fixed-length binary field (b) of `lengthBytes`. Pack with a `Buffer` or hex string. */
export const B = (lengthBytes: number): BFormat => {
  if (lengthBytes <= 0) throw new Error(ERR.KIND_HELPER_LEN_MUST_BE('B', '>', 0))
  return { kind: Kind.Binary, length: lengthBytes }
}

/** Bitmap field for DE 1. `8` ⇒ 64-bit (DE 1–64), `16` ⇒ 128-bit (allows DE 65–128). Pass `{ encoding: BitmapEncoding.HexAscii }` for ASCII hex wire format. */
export const bitmap = (lengthBytes: 8 | 16, opts?: { encoding?: BitmapEncoding }): BitmapFormat => {
  if (lengthBytes !== 8 && lengthBytes !== 16) throw new Error(ERR.BITMAP_HELPER_SIZE)
  const format: BitmapFormat = { kind: Kind.Bitmap, length: lengthBytes }
  if (opts?.encoding) format.encoding = opts.encoding
  return format
}

/** Variable field with a 2-digit length header (max length 99); choose `payload` explicitly. */
export const LLVAR = (opts: VarBase): LLVARFormat => validateLLVar(Kind.LLVAR, opts)

/**
 * Numeric variable field, 2-digit length header (max length 99).
 * Defaults to BCD payload counted in digits.
 * @example
 * // PAN: BCD digits, BCD length header counting digits, up to 19 digits
 * LLVARn({ length: 19, lenHeader: VarLenHeaderEncoding.BCD,
 *   payload: VarPayloadEncoding.BCD_DIGITS, lenCountMode: VarLenCountMode.DIGITS })
 */
export const LLVARn = (opts: VarBase): LLVARFormat => validateLLVar(Kind.LLVARn, opts)

/** Alphanumeric variable field, 2-digit length header (max length 99). */
export const LLVARan = (opts: VarBase): LLVARFormat => validateLLVar(Kind.LLVARan, opts)

/** Alphanumeric + special variable field, 2-digit length header (max length 99). */
export const LLVARans = (opts: VarBase): LLVARFormat => validateLLVar(Kind.LLVARans, opts)

/** Binary variable field, 2-digit length header (max length 99). Defaults to `BINARY` payload counted in bytes. Pack with a `Buffer` or even-length hex string. */
export const LLVARb = (opts: VarBase): LLVARFormat => validateLLVar(Kind.LLVARb, opts)

/** Variable field with a 3-digit length header (max length 999); choose `payload` explicitly. */
export const LLLVAR = (opts: VarBase): LLLVARFormat => validateLLLVar(Kind.LLLVAR, opts)

/** Numeric variable field, 3-digit length header (max length 999). Defaults to BCD payload counted in digits. */
export const LLLVARn = (opts: VarBase): LLLVARFormat => validateLLLVar(Kind.LLLVARn, opts)

/** Alphanumeric variable field, 3-digit length header (max length 999). */
export const LLLVARan = (opts: VarBase): LLLVARFormat => validateLLLVar(Kind.LLLVARan, opts)

/** Alphanumeric + special variable field, 3-digit length header (max length 999). */
export const LLLVARans = (opts: VarBase): LLLVARFormat => validateLLLVar(Kind.LLLVARans, opts)

/** Binary variable field, 3-digit length header (max length 999). Defaults to `BINARY` payload counted in bytes. Pack with a `Buffer` or even-length hex string. */
export const LLLVARb = (opts: VarBase): LLLVARFormat => validateLLLVar(Kind.LLLVARb, opts)
