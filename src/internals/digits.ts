import { ERR } from '@internals/constants'

export const digitsOnly = (s: string): string => {
  if (!/^\d*$/.test(s)) throw new Error(ERR.EXPECT_DIGITS(s))
  return s
}
