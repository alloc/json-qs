export const enum CharCode {
  Ampersand = 38, // &
  CloseCurly = 125, // }
  CloseParen = 41, // )
  Colon = 58, // :
  Comma = 44, // ,
  DigitMax = 57, // 9
  DigitMin = 48, // 0
  Escape = 92, // \
  Hash = 35, // #
  LastAscii = 127,
  LowerN = 110, // n
  Minus = 45, // -
  OpenCurly = 123, // {
  OpenParen = 40, // (
  Percent = 37, // %
  Plus = 43, // +
  Quote = 39, // '
  Space = 32,
}

export function isDigit(charCode: number): boolean {
  return charCode >= CharCode.DigitMin && charCode <= CharCode.DigitMax
}
