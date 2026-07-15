import { buildBitmap, parseBitmap } from '@bits/bitmap'
import { assertMTI, decodeMTI, encodeMTI } from '@bits/mti'
import { decodeAlpha, encodeAlpha } from '@encodings/alpha'
import { decodeBinary, encodeBinary } from '@encodings/binary'
import { decodeNumeric, encodeNumeric } from '@encodings/numeric'
import { decodeVar, encodeVar } from '@encodings/varlen'
import { BitmapConstraint, ERR } from '@internals/constants'
import { BitmapEncoding, FormatObject, HeaderSpec, Kind, NumericEncoding } from '@internals/formats'

export type EncoderOptions = {
  /** Optional message header wrapped on pack and skipped on unpack (e.g. an acquirer prefix). */
  header?: HeaderSpec
}

/** How `explain()` redacts a field: `'pan'` keeps first 6 / last 4 digits, `'redact'` hides it entirely. */
export type MaskMode = 'pan' | 'redact'

/** Spec for a single data element. `mask` opts the field into redaction in `explain()`. */
export type FieldSpec = { name: string; format: FormatObject; mask?: MaskMode }

/** Message spec keyed by DE number. DE 0 sets MTI encoding, DE 1 sets bitmap size; both optional. */
export type MessageSpec = Record<number, FieldSpec>

export type PackedMessage = { mti: string; bytes: Buffer }
export type UnpackedMessage = { mti: string; fields: Record<number, Buffer | string | number>; bytesRead: number }

const maskPan = (pan: string): string =>
  pan.length > 10 ? `${pan.slice(0, 6)}${'*'.repeat(pan.length - 10)}${pan.slice(-4)}` : '*'.repeat(pan.length)

const maskValue = (mask: MaskMode | undefined, value: Buffer | string | number): Buffer | string | number => {
  if (mask === 'pan') return maskPan(Buffer.isBuffer(value) ? value.toString('hex') : String(value))
  if (mask === 'redact') return '[redacted]'
  return value
}

/**
 * Encodes and decodes ISO 8583 messages against a {@link MessageSpec}.
 * @example
 * const iso = new Iso8583(spec)
 * const { bytes } = iso.pack('0200', { 3: '000000', 4: '000000001000' })
 * const { mti, fields } = iso.unpack(bytes) // mti === '0200'
 */
export class Iso8583 {
  private spec: MessageSpec
  private mtiEncoding: NumericEncoding = NumericEncoding.BCD
  private bitmapConstraint: BitmapConstraint = 64
  private bitmapEncoding = BitmapEncoding.Binary
  private header?: HeaderSpec

  constructor(spec: MessageSpec, opts?: EncoderOptions) {
    this.spec = spec
    this.header = opts?.header
    const mtiField = this.spec[0]
    if (mtiField) {
      if (mtiField.format.kind !== Kind.Numeric) throw new Error(ERR.INVALID_MTI_SPEC(0))
      this.mtiEncoding = mtiField.format.encoding || NumericEncoding.BCD
    }

    const bmField = this.spec[1]
    if (bmField) {
      if (bmField.format.kind !== Kind.Bitmap) throw new Error(ERR.INVALID_BITMAP_SPEC(1))
      this.bitmapConstraint = bmField.format.length === 8 ? 64 : 128
      this.bitmapEncoding = bmField.format.encoding ?? BitmapEncoding.Binary
    }
  }

  /**
   * Encodes an MTI and a `{ [DE]: value }` map into the message bytes. Only DE 2–128 are
   * emitted; the bitmap (and a secondary bitmap when any DE > 64) is computed automatically.
   * Throws if a field has no spec or a value violates its format.
   */
  pack(mti: string, fields: Record<number, Buffer | string | number>): PackedMessage {
    assertMTI(mti)
    const present = Object.keys(fields)
      .map(Number)
      .filter(n => n >= 2 && n <= 128)
      .sort((a, b) => a - b)
    for (const de of present) if (!this.spec[de]) throw new Error(ERR.NO_SPEC(de))

    const chunks: Buffer[] = []
    chunks.push(encodeMTI(mti, this.mtiEncoding))
    chunks.push(buildBitmap(present, this.bitmapConstraint, this.bitmapEncoding))

    for (const de of present) {
      chunks.push(this.encodeField(de, this.spec[de], fields[de]))
    }

    const iso = Buffer.concat(chunks)
    const bytes = this.header ? this.header.encode(iso) : iso

    return { mti, bytes }
  }

  /**
   * Decodes message bytes into `{ mti, fields, bytesRead }`. Field values are returned as
   * `string` (numeric/alpha) or `Buffer` (binary). Throws on underruns or unknown DEs.
   */
  unpack(buf: Buffer): UnpackedMessage {
    const headerLen = this.header ? this.header.decode(buf).headerLength : 0
    const messageBuffer = headerLen > 0 ? buf.subarray(headerLen) : buf
    let offset = 0
    const { mti, read } = decodeMTI(messageBuffer, offset, this.mtiEncoding)
    offset += read
    assertMTI(mti)

    const segmentSize = this.bitmapEncoding === BitmapEncoding.HexAscii ? 16 : 8
    if (messageBuffer.length - offset < segmentSize) throw new Error(ERR.PRIMARY_UNDERRUN)
    const primary = messageBuffer.subarray(offset, offset + segmentSize)
    offset += segmentSize

    const firstByte =
      this.bitmapEncoding === BitmapEncoding.HexAscii
        ? parseInt(primary.subarray(0, 2).toString('ascii'), 16)
        : primary[0]
    const hasSecondary = (firstByte & 0x80) !== 0
    let bitmap = primary
    if (hasSecondary) {
      if (this.bitmapConstraint === 64) throw new Error(ERR.SEC_BITMAP_CONSTRAINED)
      if (messageBuffer.length - offset < segmentSize) throw new Error(ERR.SEC_UNDERRUN)
      bitmap = Buffer.concat([primary, messageBuffer.subarray(offset, offset + segmentSize)])
      offset += segmentSize
    }

    const present = parseBitmap(bitmap, this.bitmapConstraint, this.bitmapEncoding)
    const fields: Record<number, Buffer | string | number> = {}
    for (const de of present) {
      const spec = this.spec[de]
      if (!spec) throw new Error(ERR.NO_SPEC(de))
      const { value, read } = this.decodeField(de, spec, messageBuffer, offset)
      fields[de] = value
      offset += read
    }

    return { mti, fields, bytesRead: offset }
  }

  /**
   * Renders a readable, line-per-field dump. Fields whose spec sets `mask` are redacted by
   * default; pass `{ unmask: true }` for raw values (local debugging only — never log it).
   * @example
   * iso.explain(bytes)
   * // MTI: 0200
   * // 002 PAN (LLVARn, len=19): 476173******0119
   */
  explain(buf: Buffer, opts?: { unmask?: boolean }): string {
    const decoded = this.unpack(buf)
    const lines = [`MTI: ${decoded.mti}`]
    for (const [idStr, value] of Object.entries(decoded.fields)) {
      const id = Number(idStr)
      const spec = this.spec[id]
      const { kind, length } = spec.format
      const shown = opts?.unmask ? value : maskValue(spec.mask, value)
      const display = Buffer.isBuffer(shown) ? shown.toString('hex') : shown
      lines.push(`${id.toString().padStart(3, '0')} ${spec.name} (${kind}, len=${length}): ${display}`)
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
      case Kind.LLVARb:
      case Kind.LLLVAR:
      case Kind.LLLVARn:
      case Kind.LLLVARan:
      case Kind.LLLVARans:
      case Kind.LLLVARb:
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
      case Kind.LLVARb:
      case Kind.LLLVAR:
      case Kind.LLLVARn:
      case Kind.LLLVARan:
      case Kind.LLLVARans:
      case Kind.LLLVARb:
        return decodeVar(de, f, buf, offset)
      default:
        throw new Error(ERR.UNSUPPORTED(f.kind))
    }
  }
}
