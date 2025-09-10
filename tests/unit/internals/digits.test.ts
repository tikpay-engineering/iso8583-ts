import { digitsOnly } from '@internals/digits'

describe('digitsOnly', () => {
  it('throws if input is not a string of digits', () => {
    expect(() => digitsOnly('12A5')).toThrow(/Expected digits only/)
  })

  it('returns passed in string of digits', () => {
    const resp = digitsOnly('12345678')
    expect(resp).toEqual('12345678')
  })
})
