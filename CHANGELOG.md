# @tikpay/iso8583-ts

## 0.3.0

### Minor Changes

- ceaa9ec: Add field-level masking and harden encoding validation.
  - `FieldSpec` gains an optional `mask` (`'pan' | 'redact'`). `explain()` now redacts
    fields that declare it (PAN partially, others fully), so cardholder data no longer
    lands in logs by default. Pass `explain(buf, { unmask: true })` for raw output.
    Masking is driven by the spec, not by ISO 8583 DE numbers.
  - `encodeNumeric` now throws when a value has more digits than the field length,
    instead of silently truncating on the round trip.
  - The LLVAR/LLLVAR binary payload path now rejects invalid or odd-length hex strings,
    matching the fixed-length binary encoder.

## 0.2.0

### Minor Changes

- d6f5f51: Uplifted pack, unpack and explain methods

## 0.1.3

### Patch Changes

- 5e98100: README update

## 0.1.2

### Patch Changes

- 71a8a9a: Set Changesets access to public

## 0.1.1

### Patch Changes

- 03eda06: - Added credits to libraries that inspired this
  - Added changeset to manage releases and publishing to npm
