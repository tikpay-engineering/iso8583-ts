import { ERR, RE } from './constants'
import { Kind } from './formats'

/** @internal */
export const validateAlpha = (fmt: Kind.Alpha | Kind.AlphaNumeric | Kind.AlphaNumericSpecial, s: string): void => {
  const valid =
    (fmt === 'a' && RE.ALPHA.test(s)) || (fmt === 'an' && RE.ALNUM.test(s)) || (fmt === 'ans' && RE.PRINT.test(s))
  if (!valid) throw new Error(ERR.INVALID_ALPHA(fmt))
}
