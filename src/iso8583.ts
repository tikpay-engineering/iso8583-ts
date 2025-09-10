import { buildBitmap, parseBitmap } from '@bits/bitmap'
import { assertMTI, decodeMTI, encodeMTI } from '@bits/mti'
import { decodeAlpha, encodeAlpha } from '@encodings/alpha'
import { decodeBinary, encodeBinary } from '@encodings/binary'
import { decodeNumeric, encodeNumeric } from '@encodings/numeric'
import { decodeVar, encodeVar } from '@encodings/varlen'
import { BitmapConstraint, ERR } from '@internals/constants'
import { FormatObject, Kind, NumericEncoding } from '@internals/formats'

export type EncoderOptions = {
  mtiEncoding?: NumericEncoding
}

export type FieldSpec = { name: string; format: FormatObject }
export type MessageSpec = Record<number, FieldSpec>

export type PackedMessage = { mti: string; bytes: Buffer }
export type UnpackedMessage = { mti: string; fields: Record<number, Buffer | string | number>; bytesRead: number }

export class Iso8583 {
  private spec: MessageSpec
  private mtiEncoding: NumericEncoding = NumericEncoding.BCD
  private bitmapConstraint: BitmapConstraint = 64

  constructor(spec: MessageSpec) {
    this.spec = spec

    const mtiField = this.spec[0]
    if (mtiField) {
      if (mtiField.format.kind !== Kind.Numeric) throw new Error(ERR.INVALID_MTI_SPEC(0))
      this.mtiEncoding = mtiField.format.encoding || NumericEncoding.BCD
    }

    const bmField = this.spec[1]
    if (bmField) {
      if (bmField.format.kind !== Kind.Bitmap) throw new Error(ERR.INVALID_BITMAP_SPEC(1))
      this.bitmapConstraint = bmField.format.length === 8 ? 64 : 128
    }
  }

  pack = (mti: string, fields: Record<number, Buffer | string | number>): PackedMessage => {
    assertMTI(mti)
    const present = Object.keys(fields)
      .map(Number)
      .filter(n => n >= 2 && n <= 128)
      .sort((a, b) => a - b)
    for (const de of present) if (!this.spec[de]) throw new Error(ERR.NO_SPEC(de))

    const chunks: Buffer[] = []
    chunks.push(encodeMTI(mti, this.mtiEncoding))
    chunks.push(buildBitmap(present, this.bitmapConstraint))

    for (const de of present) {
      chunks.push(this.encodeField(de, this.spec[de], fields[de]))
    }

    return { mti, bytes: Buffer.concat(chunks) }
  }

  unpack = (buf: Buffer): UnpackedMessage => {
    let offset = 0
    const { mti, read } = decodeMTI(buf, offset, this.mtiEncoding)
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
    const fields: Record<number, Buffer | string | number> = {}
    for (const de of present) {
      const spec = this.spec[de]
      if (!spec) throw new Error(ERR.NO_SPEC(de))
      const { value, read } = this.decodeField(de, spec, buf, offset)
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
      const { kind, length } = spec.format
      lines.push(`${id.toString().padStart(3, '0')} ${spec.name} (${kind}, len=${length}): ${value}`)
    }
    return lines.join('\n')
  }

  encodeField(de: number, spec: FieldSpec, value: Buffer | string | number): Buffer {
    const f = spec.format
    switch (f.kind) {
      case Kind.Numeric:
        return encodeNumeric(f, value as string | number)
      case Kind.Alpha:
      case Kind.AlphaNumeric:
      case Kind.AlphaNumericSpecial:
        return encodeAlpha(de, f, value as string)
      case Kind.Binary:
        return encodeBinary(de, f, value as Buffer | string)
      case Kind.LLVAR:
      case Kind.LLVARn:
      case Kind.LLVARan:
      case Kind.LLVARans:
      case Kind.LLLVAR:
      case Kind.LLLVARn:
      case Kind.LLLVARan:
      case Kind.LLLVARans:
        return encodeVar(de, f, value as Buffer | string)
      default:
        throw new Error(ERR.UNSUPPORTED(f.kind))
    }
  }

  decodeField(de: number, spec: FieldSpec, buf: Buffer, offset: number) {
    const f = spec.format
    switch (f.kind) {
      case Kind.Numeric:
        return decodeNumeric(f, buf, offset)
      case Kind.Alpha:
      case Kind.AlphaNumeric:
      case Kind.AlphaNumericSpecial:
        return decodeAlpha(f, buf, offset)
      case Kind.Binary:
        return decodeBinary(de, f, buf, offset)
      case Kind.LLVAR:
      case Kind.LLVARn:
      case Kind.LLVARan:
      case Kind.LLVARans:
      case Kind.LLLVAR:
      case Kind.LLLVARn:
      case Kind.LLLVARan:
      case Kind.LLLVARans:
        return decodeVar(de, f, buf, offset)
      default:
        throw new Error(ERR.UNSUPPORTED(f.kind))
    }
  }
}
