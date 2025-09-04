import { ERR, RE } from './constants'

export const validateAlpha = (fmt: 'a' | 'an' | 'ans', s: string): void => {
  const valid =
    (fmt === 'a' && RE.ALPHA.test(s)) || (fmt === 'an' && RE.ALNUM.test(s)) || (fmt === 'ans' && RE.PRINT.test(s))
  if (!valid) throw new Error(ERR.INVALID_ALPHA(fmt))
}
