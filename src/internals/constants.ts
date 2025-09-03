export type BitmapConstraint = 64 | 128

export const ERR = {
  ASCII_UNDERRUN: 'ASCII underrun',
  BITMAP_64_CONSTRAINT: 'Bitmap constrained to 64 bits but DE>64 present',
  BITMAP_SIZE: 'Bitmap must be 8 or 16 bytes',
  DE_RANGE: 'DE must be 2..128',
  EXPECT_DIGITS: (s: string) => `Expected digits only, got "${s}"`,
  INVALID_MTI: (m: string) => `Invalid MTI "${m}" (expect 4 digits)`,
  SEC_BITMAP_CONSTRAINED: 'Secondary bitmap present but constrained to 64',
}

export const RE = {
  MTI: /^\d{4}$/,
}
