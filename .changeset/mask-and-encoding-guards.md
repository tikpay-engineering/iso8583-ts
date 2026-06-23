---
'@tikpay/iso8583-ts': minor
---

Add field-level masking and harden encoding validation.

- `FieldSpec` gains an optional `mask` (`'pan' | 'redact'`). `explain()` now redacts
  fields that declare it (PAN partially, others fully), so cardholder data no longer
  lands in logs by default. Pass `explain(buf, { unmask: true })` for raw output.
  Masking is driven by the spec, not by ISO 8583 DE numbers.
- `encodeNumeric` now throws when a value has more digits than the field length,
  instead of silently truncating on the round trip.
- The LLVAR/LLLVAR binary payload path now rejects invalid or odd-length hex strings,
  matching the fixed-length binary encoder.
