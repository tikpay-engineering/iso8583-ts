<div align="center">
<pre><code>                                                                  
   ▀                   ▄▄▄▄  ▄▄▄▄▄   ▄▄▄▄   ▄▄▄▄           ▄          
 ▄▄▄     ▄▄▄    ▄▄▄   █    █ █      █    █ ▀   ▀█        ▄▄█▄▄   ▄▄▄  
   █    █   ▀  █▀ ▀█  ▀▄▄▄▄▀ ▀▀▀▀▄▄ ▀▄▄▄▄▀   ▄▄▄▀          █    █   ▀ 
   █     ▀▀▀▄  █   █  █   ▀█      █ █   ▀█     ▀█  ▀▀▀     █     ▀▀▀▄ 
 ▄▄█▄▄  ▀▄▄▄▀  ▀█▄█▀  ▀█▄▄▄▀ ▀▄▄▄█▀ ▀█▄▄▄▀ ▀▄▄▄█▀          ▀▄▄  ▀▄▄▄▀ 
                                                                 
                                                                  
                                                 
</code></pre>
</div>

<p align="center">
  <a href="https://www.npmjs.com/package/@tikpay/iso8583-ts">
    <img alt="npm" src="https://img.shields.io/npm/v/@tikpay/iso8583-ts.svg?logo=npm&color=cb3837">
  </a>
  <a href="https://github.com/tikpay-engineering/iso8583-ts/actions">
    <img alt="CI" src="https://img.shields.io/github/actions/workflow/status/tikpay-engineering/iso8583-ts/ci.yml?logo=github&label=CI">
  </a>
  <a href="./LICENSE">
    <img alt="MIT" src="https://img.shields.io/badge/License-MIT-blue.svg">
  </a>
  <a href="https://www.typescriptlang.org/">
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-Ready-3178c6?logo=typescript&logoColor=white">
  </a>
</p>

---

A fast, type-safe **ISO 8583 encoder/decoder** for TypeScript. You declare a per-field spec (encoding, length rules, masking); the library packs a `{ mti, fields }` object into a `Buffer` and unpacks it back, with field-level BCD/ASCII/LLVAR behavior configured exactly.

- **Type-safe spec** — one `MessageSpec` describes every data element
- **Field-level encoding** — BCD or ASCII numerics, LLVAR/LLLVAR with configurable length headers and count modes
- **Bitmap handling** — primary + automatic secondary (DE 65–128)
- **PCI-friendly** — `explain()` masks cardholder data by spec
- **Dual build** — ESM + CJS, ships `.d.ts`

> **Scope:** this library encodes/decodes the ISO 8583 message body only. It does **not**
> add the 2-byte TCP length prefix that many acquirer links require — frame that yourself
> around `pack()` / before `unpack()`. See [Not handled](#-not-handled).

---

## 🚀 Install

```bash
npm i @tikpay/iso8583-ts
```

Requires Node ≥ 18.18.

---

## ⚡ Quick start

A complete, runnable example — define a spec once, then pack and unpack:

```typescript
import {
  Iso8583,
  type MessageSpec,
  N,
  AN,
  LLVARn,
  LLVARans,
  bitmap,
  NumericEncoding,
  VarLenHeaderEncoding,
  VarPayloadEncoding,
  VarLenCountMode,
} from '@tikpay/iso8583-ts'

const spec: MessageSpec = {
  0: { name: 'MTI', format: N(4, { encoding: NumericEncoding.BCD }) }, // optional, see "MTI & bitmap"
  1: { name: 'Bitmap', format: bitmap(8) }, // optional, 8 bytes = DE 1–64
  2: {
    name: 'PAN',
    format: LLVARn({
      length: 19,
      lenHeader: VarLenHeaderEncoding.BCD,
      payload: VarPayloadEncoding.BCD_DIGITS,
      lenCountMode: VarLenCountMode.DIGITS,
    }),
    mask: 'pan', // explain() shows first 6 / last 4 only
  },
  3: { name: 'Processing Code', format: N(6) },
  4: { name: 'Amount', format: N(12) },
  11: { name: 'STAN', format: N(6) },
  22: { name: 'POS Data', format: AN(12) },
  35: { name: 'Track 2', format: LLVARans({ length: 37 }), mask: 'redact' },
  49: { name: 'Currency', format: N(3) },
}

const iso = new Iso8583(spec)

// ---- Pack: object -> Buffer ----
const { bytes } = iso.pack('0200', {
  3: '000000',
  4: '000000001000',
  11: '123456',
  22: '9010A0B00000',
  49: '978',
})

// ---- Unpack: Buffer -> object ----
const decoded = iso.unpack(bytes)
decoded.mti // '0200'
decoded.fields // { 3: '000000', 4: '000000001000', 11: '123456', 22: '9010A0B00000', 49: '978' }
decoded.bytesRead // number of bytes consumed
```

---

## 🧠 Core concepts

- **`MessageSpec`** — `Record<number, FieldSpec>` keyed by data-element (DE) number.
  `FieldSpec = { name: string; format: FormatObject; mask?: 'pan' | 'redact' }`.
- **DE 0 and DE 1 are optional config slots.** A `Numeric` format at DE `0` sets the MTI encoding (BCD = 2 bytes, ASCII = 4 bytes); omit it and the MTI defaults to BCD. A `bitmap(8 | 16)` at DE `1` sets the bitmap size: `8` = 64-bit (DE 1–64 only), `16` = 128-bit (allows DE 65–128); omit it and the message is 64-bit. They are not emitted as normal fields.
- **Format helpers** (`N`, `AN`, `LLVARn`, …) build the `format` value. Never construct format objects by hand — use the helpers; they validate lengths.
- **`pack(mti, fields)`** encodes only DE 2–128 present in `fields`. The bitmap is computed automatically; the secondary bitmap is added automatically when any DE > 64 is present.
- **`unpack(buf)`** returns `{ mti, fields, bytesRead }`. Field values come back as `string` (numeric/alpha), `Buffer` (binary), per the field's format.

---

## 🧩 Format helpers

Pass the return value as a field's `format`. Each helper validates its length and throws on bad input.

| Helper                                                | ISO type | Signature                                                 | Notes                                                                   |
| ----------------------------------------------------- | -------- | --------------------------------------------------------- | ----------------------------------------------------------------------- |
| `N(len, opts?)`                                       | n        | `(length: number, opts?: { encoding?: NumericEncoding })` | Fixed numeric. BCD (default) packs 2 digits/byte; ASCII = 1 byte/digit. |
| `A(len)`                                              | a        | `(length: number)`                                        | Fixed alphabetic, space-padded.                                         |
| `AN(len)`                                             | an       | `(length: number)`                                        | Fixed alphanumeric, space-padded.                                       |
| `ANS(len)`                                            | ans      | `(length: number)`                                        | Fixed alphanumeric + printable specials.                                |
| `B(lenBytes)`                                         | b        | `(lengthBytes: number)`                                   | Fixed binary. Value is a `Buffer` or hex string.                        |
| `bitmap(8 \| 16)`                                     | —        | `(lengthBytes: 8 \| 16)`                                  | DE 1 only. `8` ⇒ 64-bit, `16` ⇒ 128-bit.                                |
| `LLVAR(opts)`                                         | —        | variable, 2-digit length header                           | Generic; choose `payload` explicitly.                                   |
| `LLVARn(opts)`                                        | n..      | variable, max length **99**                               | Numeric var.                                                            |
| `LLVARan(opts)`                                       | an..     | variable, max length **99**                               | Alphanumeric var.                                                       |
| `LLVARans(opts)`                                      | ans..    | variable, max length **99**                               | Alphanumeric+special var.                                               |
| `LLLVAR(opts)` / `LLLVARn` / `LLLVARan` / `LLLVARans` | —        | variable, max length **999**                              | 3-digit length header. Same option semantics as the `LL` variants.      |

`opts` for every `LL*`/`LLL*` helper is a `VarBase` (omitted options fall back to the defaults in [Encoding options](#-encoding-options)):

```typescript
type VarBase = {
  length: number // max LOGICAL length (digits for *n, bytes otherwise)
  payload?: VarPayloadEncoding // how the value bytes are encoded
  lenHeader?: VarLenHeaderEncoding // how the length prefix is encoded (default BCD)
  lenCountMode?: VarLenCountMode // does the length count digits or bytes?
}
```

---

## 🔤 Encoding options

These enums control the wire format. Defaults are chosen to match common acquirer specs,
but **set them explicitly when integrating** — the right values come from your acquirer's manual.

| Enum                   | Values                                                        | Meaning                                                                                                                 |
| ---------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `NumericEncoding`      | `BCD` (`'bcd'`), `ASCII` (`'ascii'`)                          | Numeric packing. BCD = packed 2 digits/byte; ASCII = one char/byte.                                                     |
| `VarLenHeaderEncoding` | `BCD`, `ASCII`                                                | How the `LL`/`LLL` length prefix is encoded. BCD `LL` = 1 byte, `LLL` = 2 bytes; ASCII `LL` = 2 bytes, `LLL` = 3 bytes. |
| `VarPayloadEncoding`   | `BCD_DIGITS` (`'bcd-digits'`), `ASCII`, `BINARY` (`'binary'`) | How the field value is encoded.                                                                                         |
| `VarLenCountMode`      | `DIGITS` (`'digits'`), `BYTES` (`'bytes'`)                    | Whether the length header counts digits or bytes.                                                                       |

**Variable-field defaults** (applied when you omit an option):

- `lenHeader` → `BCD` always.
- For **`LLVARn` / `LLLVARn`** (numeric): `payload` → `BCD_DIGITS`, `lenCountMode` → `DIGITS`.
- For **all other** var helpers: `payload` → `ASCII`, `lenCountMode` → `BYTES`.
- `lenCountMode: DIGITS` is **only** valid on numeric (`*n`) helpers — it throws otherwise.

---

## 📖 Recipes

Copy-paste field definitions for common data elements:

```typescript
// PAN (DE 2): BCD digits, BCD length header counting digits, max 19. Mask in explain().
2: {
  name: 'PAN',
  format: LLVARn({ length: 19, lenHeader: VarLenHeaderEncoding.BCD,
    payload: VarPayloadEncoding.BCD_DIGITS, lenCountMode: VarLenCountMode.DIGITS }),
  mask: 'pan',
},

// Amount (DE 4): fixed 12-digit BCD numeric.
4: { name: 'Amount', format: N(12) },

// MTI as ASCII instead of BCD (DE 0 config slot):
0: { name: 'MTI', format: N(4, { encoding: NumericEncoding.ASCII }) },

// Track 2 (DE 35): ANS variable, max 37, redacted in explain().
35: { name: 'Track 2', format: LLVARans({ length: 37 }), mask: 'redact' },

// Binary field (DE 52 PIN block): 8 raw bytes. Pass a Buffer or hex string when packing.
52: { name: 'PIN', format: B(8), mask: 'redact' },

// 128-bit message (needed when any DE > 64 is used):
1: { name: 'Bitmap', format: bitmap(16) },

// ASCII-numeric variable field with ASCII length header:
48: { name: 'Private', format: LLLVARans({ length: 999, lenHeader: VarLenHeaderEncoding.ASCII }) },
```

Packing values:

```typescript
iso.pack('0200', {
  2: '4761739001010119', // string of digits for numeric fields
  4: '000000001000',
  52: Buffer.from('0123456789ABCDEF', 'hex'), // Buffer or hex string for binary fields
})
```

---

## 🕵️ explain() and masking

`explain()` renders a readable, line-per-field dump. Fields whose spec sets `mask` are
redacted **by default**, so PANs, tracks and PIN blocks never land in logs (PCI-DSS).
Masking follows your spec, not ISO 8583 DE numbers, so it works no matter how an acquirer
lays out its fields.

```typescript
iso.explain(bytes)
// MTI: 0200
// 002 PAN (LLVARn, len=19): 476173******0119
// 035 Track 2 (LLVARans, len=37): [redacted]
// 004 Amount (n, len=12): 000000001000

iso.explain(bytes, { unmask: true }) // raw values — local debugging only, never log this
```

- `mask: 'pan'` → keeps first 6 / last 4 digits, stars the middle.
- `mask: 'redact'` → replaces the whole value with `[redacted]`.
- no `mask` → value shown as-is.

---

## 🧾 API reference

```typescript
class Iso8583 {
  constructor(spec: MessageSpec, opts?: { header?: HeaderSpec })

  pack(
    mti: string,
    fields: Record<number, Buffer | string | number>,
  ): {
    mti: string
    bytes: Buffer
  }

  unpack(buf: Buffer): {
    mti: string
    fields: Record<number, Buffer | string | number>
    bytesRead: number
  }

  explain(buf: Buffer, opts?: { unmask?: boolean }): string
}

type FieldSpec = { name: string; format: FormatObject; mask?: MaskMode }
type MessageSpec = Record<number, FieldSpec>
type MaskMode = 'pan' | 'redact'

// Optional message header (e.g. an acquirer prefix). encode wraps the body; decode reports
// how many leading bytes to skip on unpack.
type HeaderSpec = {
  encode: (messageBytes: Buffer) => Buffer
  decode: (buf: Buffer) => { headerLength: number }
}
```

---

## ⚠️ Errors

All errors are thrown `Error`s with stable messages. The most common:

| When                                                | Message (pattern)                                                                                     |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Field present in `pack`/`unpack` with no spec entry | `No spec for DE<n>`                                                                                   |
| Numeric value longer than the field                 | `Numeric value has <x> digits > N<len>`                                                               |
| Alpha value longer than the field                   | `DE<n> exceeds <kind><len>`                                                                           |
| Variable field value over its max length            | `DE<n> length <x> > max <max>`                                                                        |
| Binary field wrong size                             | `DE<n> must be <expected> bytes`                                                                      |
| Invalid hex for a fixed binary field                | `Invalid hex for DE<n>`                                                                               |
| Invalid/odd hex for a binary var field              | `Invalid hex for binary var-length field`                                                             |
| Non-digit passed to a numeric field                 | `Expected digits only, got "<s>"`                                                                     |
| `lenCountMode: 'digits'` on a non-numeric var field | `DE<n> invalid lenCountMode=digits for non-n field`                                                   |
| MTI not 4 digits                                    | `Invalid MTI "<m>" (expect 4 digits)`                                                                 |
| DE > 64 present but bitmap is 8 bytes               | `Bitmap constrained to 64 bits but DE>64 present`                                                     |
| Secondary bitmap seen while constrained to 64       | `Secondary bitmap present but constrained to 64`                                                      |
| Buffer too short while decoding                     | `Primary bitmap underrun` / `Secondary bitmap underrun` / `DE<n> underrun` / `Length header underrun` |

---

## 🚫 Not handled

By design, so you stay in control of the transport:

- **TCP length framing.** Acquirer links typically prefix each message with a 2-byte length
  header. This library does not add or strip it — wrap `pack()`'s `bytes` and slice it off
  before `unpack()`.
- **Fixed-width trailing spaces.** Alpha fields are space-padded and `unpack` trims trailing
  spaces, so values that legitimately end in spaces will not round-trip.
- **MAC / PIN cryptography.** No key management, MACing, or PIN-block generation.

---

## ⭐ Inspiration

Inspired by excellent prior ISO 8583 work:

- [@jpos/jPOS](https://github.com/jpos/jPOS)
- [@zemuldo/iso_8583](https://www.npmjs.com/package/iso_8583)
- [@micham/iso8583](https://www.npmjs.com/package/@micham/iso8583)

## 📄 License

MIT.
