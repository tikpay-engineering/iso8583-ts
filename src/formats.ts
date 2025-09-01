export type NumericEncoding = 'bcd' | 'ascii'
export type LenHeaderEncoding = 'bcd' | 'ascii'
export type VarEncoding = 'ascii' | 'binary' | 'bcd-digits'
export type VarLenCount = 'bytes' | 'digits'

export type NFormat = { kind: 'n'; length: number; encoding?: NumericEncoding }
export type AFormat = { kind: 'a'; length: number }
export type ANFormat = { kind: 'an'; length: number }
export type ANSFormat = { kind: 'ans'; length: number }
export type BFormat = { kind: 'b'; length: number }
export type BitmapFormat = { kind: 'bitmap'; length: 8 | 16 }
export type XPlusN16Format = { kind: 'x+N16' }

type VarBase = {
  length: number
  payload?: VarEncoding
  lenHeader?: LenHeaderEncoding
  lenCounts?: VarLenCount
}

export type LLVARFormat =
  | ({ kind: 'LLVAR' } & VarBase)
  | ({ kind: 'LLVARn' } & VarBase)
  | ({ kind: 'LLVARan' } & VarBase)
  | ({ kind: 'LLVARans' } & VarBase)

export type LLLVARFormat =
  | ({ kind: 'LLLVAR' } & VarBase)
  | ({ kind: 'LLLVARn' } & VarBase)
  | ({ kind: 'LLLVARan' } & VarBase)
  | ({ kind: 'LLLVARans' } & VarBase)

export type FormatObject =
  | NFormat
  | AFormat
  | ANFormat
  | ANSFormat
  | BFormat
  | BitmapFormat
  | LLVARFormat
  | LLLVARFormat
  | XPlusN16Format

export const n = (length: number, opts?: { encoding?: NumericEncoding }): NFormat => {
  if (length <= 0) throw new Error('n(): length must be > 0')
  return { kind: 'n', length, encoding: opts?.encoding }
}

export const a = (length: number): AFormat => {
  if (length <= 0) throw new Error('a(): length must be > 0')
  return { kind: 'a', length }
}

export const an = (length: number): ANFormat => {
  if (length <= 0) throw new Error('an(): length must be > 0')
  return { kind: 'an', length }
}

export const ans = (length: number): ANSFormat => {
  if (length <= 0) throw new Error('ans(): length must be > 0')
  return { kind: 'ans', length }
}

export const b = (lengthBytes: number): BFormat => {
  if (lengthBytes <= 0) throw new Error('b(): length must be > 0')
  return { kind: 'b', length: lengthBytes }
}

export const bitmap = (lengthBytes: 8 | 16): BitmapFormat => {
  if (lengthBytes !== 8 && lengthBytes !== 16) throw new Error('bitmap(): length must be 8 or 16 bytes')
  return { kind: 'bitmap', length: lengthBytes }
}

export const xPlusN16 = (): XPlusN16Format => ({ kind: 'x+N16' })

const withVarDefaults = <T extends VarBase>(
  kind: LLVARFormat['kind'] | LLLVARFormat['kind'],
  base: T,
): LLVARFormat | LLLVARFormat => {
  if (base.length <= 0) throw new Error(`${kind}(): length must be > 0`)
  const isLLL = kind.startsWith('LLL')
  const hardCap = isLLL ? 999 : 99
  if (base.length > hardCap) {
    throw new Error(`${kind}(): length must be <= ${hardCap}`)
  }

  const isNumeric = kind.endsWith('n')
  const lenHeader = base.lenHeader ?? 'bcd'
  const payload: VarEncoding = base.payload ?? (isNumeric ? 'bcd-digits' : 'ascii')
  const lenCounts: VarLenCount = base.lenCounts ?? (isNumeric ? 'digits' : 'bytes')

  return { kind: kind as any, length: base.length, payload, lenHeader, lenCounts }
}

// LLVAR (2-digit header)
export const LLVAR = (opts: VarBase): LLVARFormat => withVarDefaults('LLVAR', opts) as LLVARFormat
export const LLVARn = (
  opts: Omit<VarBase, 'payload' | 'lenCounts'> & { payload?: 'bcd-digits'; lenCounts?: 'digits' },
): LLVARFormat => withVarDefaults('LLVARn', opts) as LLVARFormat
export const LLVARan = (opts: VarBase): LLVARFormat => withVarDefaults('LLVARan', opts) as LLVARFormat
export const LLVARans = (opts: VarBase): LLVARFormat => withVarDefaults('LLVARans', opts) as LLVARFormat

// LLLVAR (3-digit header)
export const LLLVAR = (opts: VarBase): LLLVARFormat => withVarDefaults('LLLVAR', opts) as LLLVARFormat
export const LLLVARn = (
  opts: Omit<VarBase, 'payload' | 'lenCounts'> & { payload?: 'bcd-digits'; lenCounts?: 'digits' },
): LLLVARFormat => withVarDefaults('LLLVARn', opts) as LLLVARFormat
export const LLLVARan = (opts: VarBase): LLLVARFormat => withVarDefaults('LLLVARan', opts) as LLLVARFormat
export const LLLVARans = (opts: VarBase): LLLVARFormat => withVarDefaults('LLLVARans', opts) as LLLVARFormat
