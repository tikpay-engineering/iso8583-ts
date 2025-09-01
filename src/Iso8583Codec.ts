import { FormatObject, NFormat, BitmapFormat, NumericEncoding } from './formats'
import { BitmapConstraint, ERR } from './internals/constants'
import { encodeMTI, decodeMTI, assertMTI } from './bits/mti'
import { buildBitmap, parseBitmap } from './bits/bitmap'
import { encodeNumeric, decodeNumeric } from './formats/numeric'
import { encodeAlpha, decodeAlpha } from './formats/alpha'
import { encodeBinary, decodeBinary } from './formats/binary'
import { encodeVar, decodeVar } from './formats/varlen'
import { encodeXPlusN16, decodeXPlusN16 } from './formats/xpn16'

export type LengthPrefix = 'none' | 'b16'
export interface CodecOptions {
  mtiEncoding?: NumericEncoding
  lengthPrefix?: LengthPrefix
}

type BaseField = { id: number; name: string; format: FormatObject }

export type FieldSpec =
  | (BaseField & { id: 0; format: NFormat & { length: 4 } })
  | (BaseField & { id: 1 | 52; format: BitmapFormat })
  | BaseField

export type MessageSpec = Record<number, FieldSpec>

export type PackedMessage = { mti: string; bytes: Buffer }
export type UnpackedMessage = { mti: string; fields: Record<number, unknown>; bytesRead: number }

export class Iso8583Codec {
  private spec: MessageSpec
  private opts: Required<CodecOptions>
  private bitmapConstraint: BitmapConstraint = 64

  constructor(spec: MessageSpec, opts: CodecOptions = {}) {
    this.spec = spec
    this.opts = { mtiEncoding: opts.mtiEncoding ?? 'bcd', lengthPrefix: opts.lengthPrefix ?? 'none' }

    const mtiField = this.spec[0] as (FieldSpec & { id: 0 }) | undefined
    if (mtiField?.format.kind === 'n' && mtiField.format.length === 4) {
      this.opts.mtiEncoding = mtiField.format.encoding || 'bcd'
    }
    const bmField = this.spec[1] as (FieldSpec & { id: 1 }) | undefined
    if (bmField?.format.kind === 'bitmap') this.bitmapConstraint = bmField.format.length === 8 ? 64 : 128
  }

  pack = (mti: string, fields: Record<number, unknown>): PackedMessage => {
    assertMTI(mti)
    const present = Object.keys(fields)
      .map(Number)
      .filter(n => n >= 2 && n <= 128)
      .sort((a, b) => a - b)
    for (const de of present) if (!this.spec[de]) throw new Error(ERR.NO_SPEC(de))

    const chunks: Buffer[] = []
    chunks.push(encodeMTI(mti, this.opts.mtiEncoding))
    chunks.push(buildBitmap(present, this.bitmapConstraint))
    for (const de of present) chunks.push(this.encodeField(this.spec[de]!, fields[de]))

    let bytes = Buffer.concat(chunks)
    if (this.opts.lengthPrefix === 'b16') {
      if (bytes.length > 0xffff) throw new Error(ERR.MSG_TOO_LONG_B16)
      const pref = Buffer.alloc(2)
      pref.writeUInt16BE(bytes.length, 0)
      bytes = Buffer.concat([pref, bytes])
    }
    return { mti, bytes }
  }

  unpack = (buf: Buffer): UnpackedMessage => {
    let offset = 0

    if (this.opts.lengthPrefix === 'b16') {
      if (buf.length < 2) throw new Error(ERR.TRUNC_B16)
      const declared = buf.readUInt16BE(0)
      offset = 2
      if (buf.length - 2 < declared) throw new Error(ERR.TRUNC_AFTER_B16)
    }

    const { mti, read } = decodeMTI(buf, offset, this.opts.mtiEncoding)
    offset += read
    assertMTI(mti)

    if (buf.length - offset < 8) throw new Error(ERR.PRIMARY_UNDERRUN)
    const primary = buf.subarray(offset, offset + 8)
    offset += 8

    const hasSecondary = (primary[0] & 0x80) !== 0
    let bitmap = primary
    if (hasSecondary) {
      if (this.bitmapConstraint === 64) throw new Error(ERR.SEC_BITMAP_CONSTRAINED)
      if (buf.length - offset < 8) throw new Error(ERR.SEC_UNDERRUN)
      bitmap = Buffer.concat([primary, buf.subarray(offset, offset + 8)])
      offset += 8
    }

    const present = parseBitmap(bitmap, this.bitmapConstraint)
    const fields: Record<number, unknown> = {}
    for (const de of present) {
      const spec = this.spec[de]
      if (!spec) throw new Error(ERR.NO_SPEC(de))
      const { value, read } = this.decodeField(spec, buf, offset)
      fields[de] = value
      offset += read
    }

    return { mti, fields, bytesRead: offset }
  }

  explain = (buf: Buffer): string => {
    const decoded = this.unpack(buf)
    const lines = [`MTI: ${decoded.mti}`]
    for (const [idStr, value] of Object.entries(decoded.fields)) {
      const id = Number(idStr)
      const spec = this.spec[id]
      const fmt = spec?.format as any
      const fmtStr = fmt?.kind ?? 'unknown'
      const len = fmt?.length ?? '-'
      lines.push(`${id.toString().padStart(3, '0')} ${spec?.name ?? ''} (${fmtStr}, len=${len}): ${value}`)
    }
    return lines.join('\n')
  }

  // ---------------- dispatch ----------------

  private encodeField(spec: FieldSpec, value: unknown): Buffer {
    const f = spec.format
    switch (f.kind) {
      case 'n':
        return encodeNumeric(f, value)
      case 'a':
      case 'an':
      case 'ans':
        return encodeAlpha(spec.id, f as any, value)
      case 'b':
        return encodeBinary(spec.id, f as any, value)
      case 'x+N16':
        return encodeXPlusN16(spec.id, value)
      case 'bitmap':
        throw new Error(ERR.BITMAP_DIRECT(spec.id))
      default:
        if (f.kind.startsWith('LL')) return encodeVar(spec.id, f as any, value)
        throw new Error(ERR.UNSUPPORTED((f as any).kind))
    }
  }

  private decodeField(spec: FieldSpec, buf: Buffer, offset: number) {
    const f = spec.format
    switch (f.kind) {
      case 'n':
        return decodeNumeric(f, buf, offset)
      case 'a':
      case 'an':
      case 'ans':
        return decodeAlpha(f as any, buf, offset)
      case 'b':
        return decodeBinary(spec.id, f as any, buf, offset)
      case 'x+N16':
        return decodeXPlusN16(spec.id, buf, offset)
      case 'bitmap':
        throw new Error(ERR.BITMAP_DECODE_PER_FIELD(spec.id))
      default:
        if (f.kind.startsWith('LL')) return decodeVar(spec.id, f as any, buf, offset)
        throw new Error(ERR.UNSUPPORTED((f as any).kind))
    }
  }
}
