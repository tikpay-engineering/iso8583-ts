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

A fast and type-safe **ISO 8583 parser/encoder** written in TypeScript, with strict LLVAR/LLLVAR enforcement, bitmap handling and built-in field level BCD/ASCII encoding.

---

## 🧰 Features

✔️ Type-safe message building & parsing\
✔️ Field level BCD/ASCII encoding configuration\
✔️ LLVAR / LLLVAR length enforcement\
✔️ Bitmap parsing and generation\
✔️ Dual build: ESM + CJS

## 🚀 Install

```bash
npm i @tikpay/iso8583-ts
```

## 📦 Usage

### Import

---

```typescript
import { Iso8583, N, AN, ANS, B, bitmap } from '@tikpay/iso8583-ts' //ESM
```

or

```typescript
const { Iso8583, N, AN, ANS, B, bitmap } = require('@tikpay/iso8583-ts') //CJS
```

### Define specification

---

```typescript
import { AN, bitmap, LLVARn... } from '@tikpay/iso8583-ts'

export const sampleSpec: MessageSpec = {
  0: { name: 'MTI', format: N(4, { encoding: NumericEncoding.BCD }) }, //optional
  1: { name: 'Bitmap', format: bitmap(8) }, //optional
  2: {
    name: 'PAN',
    format: LLVARn({
      length: 19,
      lenHeader: VarLenHeaderEncoding.BCD,
      payload: VarPayloadEncoding.BCD_DIGITS,
      lenCountMode: VarLenCountMode.DIGITS,
    }),
  },
  22: { name: 'POSData', format: AN(12) },
  35: { name: 'Track2', format: LLVARans({ length: 37 }) },
}
```

### Pack

---

```typescript
const iso8583 = new Iso8583(sampleSpec)

const mti = '0200'
const paymentCall = {
  3: '000000',
  4: '00001000',
  11: '123456',
  12: '250910142500',
  22: '9010A0B00000',
  49: '036',
}

const { bytes, mti: packedMti } = iso8583.pack(mti, paymentCall)
```

### Unpack

---

```typescript
const iso8583 = new Iso8583(sampleSpec)

const decoded = iso8583.unpack(bytes)
console.log(decoded.mti) // '0200'
console.log(decoded.fields) // { 3: '000000', 4: '00001000', ... }
```

## ⭐ Inspiration

This library was inspired by excellent work from other ISO 8583 projects, including:

- [@jpos/jPOS](https://github.com/jpos/jPOS)
- [@zemuldo/iso_8583](https://www.npmjs.com/package/iso_8583)
- [@micham/iso8583](https://www.npmjs.com/package/@micham/iso8583)

## 📄 License

This project is licensed under the terms of the MIT open source license. Please refer to the LICENSE file for the full terms.
