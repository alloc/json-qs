import { isArray, isDate } from 'radashi'
import { CharCode, isDigit } from './charCode.js'
import { CodableObject, CodableRecord, CodableValue } from './types.js'

export type EncodeOptions = {
  skippedKeys?: string[]
}

export function encode(obj: CodableObject, options?: EncodeOptions): string {
  return encodeProperties(
    isRecord(obj) ? obj : assertRecord(obj.toJSON()),
    false,
    options?.skippedKeys
  )
}

function assertRecord(value: CodableValue): CodableRecord {
  if (
    typeof value !== 'object' ||
    isArray(value) ||
    value === null ||
    !isRecord(value)
  ) {
    throw new Error('Expected toJSON method to return an object')
  }
  return value
}

function isRecord(value: CodableObject): value is CodableRecord {
  return typeof value.toJSON !== 'function'
}

function encodeProperties(
  obj: CodableRecord,
  nested: boolean,
  skippedKeys?: string[]
): string {
  let separator: string
  let delimiter: string
  let encodeKey: (key: string) => string
  let filterKey: ((key: string) => boolean) | undefined

  if (nested) {
    separator = ','
    delimiter = ':'
    encodeKey = encodeString
  } else {
    separator = '&'
    delimiter = '='
    encodeKey = encodeURIComponent
    if (skippedKeys) {
      filterKey = key => obj[key] !== undefined && !skippedKeys.includes(key)
    }
  }

  const keys = Object.keys(obj)
    .filter(filterKey || (key => obj[key] !== undefined))
    .sort()

  let key: string
  let result = ''

  for (let i = 0; i < keys.length; i++) {
    key = keys[i]
    result +=
      (result ? separator : '') +
      encodeKey(key) +
      delimiter +
      (nested && obj[key] === ''
        ? i !== keys.length - 1
          ? ''
          : ','
        : encodeValue(obj[key]))
  }
  return result
}

function encodeValue(value: CodableValue): string {
  if (value === null || value === true || value === false) {
    return String(value)
  }
  if (typeof value === 'string') {
    // Strings equal to these constants must be escaped.
    if (value === 'null' || value === 'true' || value === 'false') {
      return '\\' + value
    }
    // For string values, escape the first character if it's a digit or
    // minus sign, since those are used to detect a number value.
    return encodeString(value, isNumberLike(value))
  }
  if (typeof value === 'number') {
    if (Number.isNaN(value) || !Number.isFinite(value)) {
      return 'null'
    }
    return String(value).replace('e+', 'e')
  }
  if (isArray(value)) {
    return encodeArray(value)
  }
  if (typeof value === 'object') {
    if (isDate(value)) {
      let iso = value.toISOString()
      // Remove the time component if it's midnight UTC.
      if (
        value.getUTCHours() === 0 &&
        value.getUTCMinutes() === 0 &&
        value.getUTCSeconds() === 0 &&
        value.getUTCMilliseconds() === 0
      ) {
        iso = iso.slice(0, -14)
      }
      // We also need to encode the '+' sign, if present.
      if (iso.charCodeAt(0) === CharCode.Plus) {
        return '%2B' + iso.slice(1)
      }
      return iso
    }
    if (isRecord(value)) {
      return encodeObject(value)
    }
    return encodeValue(value.toJSON())
  }
  if (typeof value === 'bigint') {
    return String(value) + 'n'
  }
  throw new Error(`Unsupported value type: ${typeof value}`)
}

function isNumberLike(value: string): boolean {
  const charCode = value.charCodeAt(0)
  return (
    isDigit(charCode) ||
    ((charCode === CharCode.Minus || charCode === CharCode.Plus) &&
      isDigit(value.charCodeAt(1)))
  )
}

function encodeArray(array: readonly CodableValue[]): string {
  let result = ''
  for (let i = 0; i < array.length; i++) {
    result +=
      (result ? ',' : '') +
      (array[i] === undefined
        ? null
        : array[i] === ''
          ? i !== array.length - 1
            ? ''
            : ','
          : encodeValue(array[i]))
  }
  return `(${result})`
}

function encodeObject(obj: CodableRecord): string {
  return `{${encodeProperties(obj, true)}}`
}

function encodeString(str: string, escape?: boolean): string {
  // Regardless of the escape flag, we always escape backslashes.
  let result = escape || str.charCodeAt(0) === CharCode.Escape ? '\\' : ''
  for (const char of str) {
    // By using `for..of`, we may receive a multi-code unit character.
    // These are never encoded, since the HTTP client handles it
    // automatically.
    result += char.length > 1 ? char : encodeCharacter(char)
  }
  return result
}

function encodeCharacter(char: string): string {
  const charCode = char.charCodeAt(0)
  if (charCode > CharCode.LastAscii) {
    // Non-ASCII characters are never encoded, since the HTTP client
    // handles it automatically.
    return char
  }
  switch (charCode) {
    case CharCode.Space:
      return '+'

    case CharCode.Hash:
    case CharCode.Percent:
    case CharCode.Ampersand:
    case CharCode.Plus:
      return encodeURIComponent(char)

    case CharCode.OpenParen:
    case CharCode.CloseParen:
    case CharCode.Comma:
    case CharCode.Colon:
    case CharCode.OpenCurly:
    case CharCode.CloseCurly:
      return '\\' + char
  }
  return char
}
