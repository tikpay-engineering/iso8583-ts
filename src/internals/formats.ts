export type NumericEncoding = 'bcd' | 'ascii'
export type LenHeaderEncoding = 'bcd' | 'ascii'

export type BFormat = { kind: 'b'; length: number }
export type AFormat = { kind: 'a'; length: number }
export type ANFormat = { kind: 'an'; length: number }
export type ANSFormat = { kind: 'ans'; length: number }
export type NFormat = { kind: 'n'; length: number; encoding?: NumericEncoding }
