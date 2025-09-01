export type BitmapConstraint = 64 | 128

export const ERR = {
  BITMAP_64_CONSTRAINT: 'Bitmap constrained to 64 bits but DE>64 present',
  SEC_BITMAP_CONSTRAINED: 'Secondary bitmap present but constrained to 64',
  BITMAP_SIZE: 'Bitmap must be 8 or 16 bytes',
  DE_RANGE: 'DE must be 2..128',
  INVALID_VAR_DIGITS_FOR_NON_N: (de: number) => `DE${de} invalid lenCounts=digits for non-n field`,
}
