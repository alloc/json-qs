import { CharCode } from './charCode.js'
import { CodableObject, CodableValue } from './types.js'

type URLSearchParams = typeof globalThis extends {
  URLSearchParams: infer T extends abstract new (...args: any) => any
}
  ? InstanceType<T>
  : {
      keys(): IterableIterator<string>
      get(key: string): string | null
    }

export function decode(input: URLSearchParams): CodableObject {
  const result: CodableObject = {}
  let key: string | undefined
  try {
    for (key of input.keys()) {
      if (key === '__proto__') {
        throw new SyntaxError('Forbidden key')
      }
      result[key] = decodeValue(input.get(key)!)
    }
  } catch (error: any) {
    if (key !== undefined) {
      error.message = `Failed to decode value for '${key}' key: ${error.message}`
    }
    throw error
  }
  return result
}

const enum ValueMode {
  Unknown,
  Array,
  Object,
  NumberOrBigint,
  String,
}

const constantsMap: Record<string, CodableValue> = {
  null: null,
  false: false,
  true: true,
}

function decodeValue(input: string, cursor = { pos: 0 }): CodableValue {
  const startPos = cursor.pos
  const nested = startPos > 0

  let mode: number = ValueMode.Unknown
  let result: CodableValue

  let pos = startPos
  let charCode = input.charCodeAt(pos)
  let endPos: number | undefined

  // Try to deduce the value type.
  switch (charCode) {
    case CharCode.Quote:
      mode = ValueMode.String
      break

    case CharCode.OpenParen:
      mode = ValueMode.Array
      break

    case CharCode.OpenCurly:
      mode = ValueMode.Object
      break

    case CharCode.Minus:
      mode = ValueMode.NumberOrBigint
      break

    default:
      if (charCode >= CharCode.DigitMin && charCode <= CharCode.DigitMax) {
        mode = ValueMode.NumberOrBigint
      } else {
        endPos = nested ? findEndPos(input, pos) : input.length

        // Check for a constant.
        if (charCode !== CharCode.Escape && endPos > pos && endPos - pos <= 5) {
          result = constantsMap[input.slice(pos, endPos)]
          if (result !== undefined) {
            cursor.pos = endPos
            return result
          }
        }
        // Default to a string.
        mode = ValueMode.String
      }
  }

  switch (mode) {
    case ValueMode.String: {
      result = ''
      let open = true
      while (open && pos < input.length) {
        switch (input.charCodeAt(pos)) {
          case CharCode.CloseCurly:
          case CharCode.CloseParen:
            if (!result) {
              throw new SyntaxError(
                `Unexpected end of string at position ${pos}`
              )
            }

          // ^ passthrough
          case CharCode.Colon:
          case CharCode.Comma:
            open = false
            break

          case CharCode.Escape:
            pos += 1 // Skip the escape and append the next character.

          // ^ passthrough
          default:
            result += input[pos]
            pos += 1
        }
      }
      break
    }

    case ValueMode.NumberOrBigint: {
      pos = nested ? findEndPos(input, pos + 1) : input.length
      if (input.charCodeAt(pos - 1) === CharCode.LowerN) {
        result = BigInt(input.slice(startPos, pos - 1))
      } else {
        result = Number(input.slice(startPos, pos))
        if (Number.isNaN(result)) {
          throw new SyntaxError(`Invalid number at position ${startPos}`)
        }
      }
      break
    }

    case ValueMode.Array: {
      const array: CodableValue[] = []

      while (++pos < input.length) {
        charCode = input.charCodeAt(pos)

        if (charCode === CharCode.Comma) {
          array.push('')
        } else if (charCode === CharCode.CloseParen) {
          pos += 2
          result = array
          break
        } else {
          cursor.pos = pos
          array.push(decodeValue(input, cursor))
          pos = cursor.pos

          if (input.charCodeAt(pos) === CharCode.CloseParen) {
            pos += 1
            result = array
            break
          }
        }
      }
      break
    }

    case ValueMode.Object: {
      const object: CodableObject = {}
      let key = ''
      let keyPos = pos + 1
      let open = true
      while (open && ++pos < input.length) {
        charCode = input.charCodeAt(pos)

        // Colon marks the end of a key and the beginning of a value.
        if (charCode === CharCode.Colon) {
          if (key === '__proto__') {
            throw new SyntaxError(`Forbidden key at position ${keyPos}`)
          }
          cursor.pos = pos + 1
          object[key] = decodeValue(input, cursor)
          pos = cursor.pos
          key = ''

          // Skip past the comma that ended the value.
          charCode = input.charCodeAt(pos)
          if (charCode === CharCode.Comma) {
            keyPos = pos + 1
            continue
          }
        }

        switch (charCode) {
          case CharCode.CloseCurly:
            if (key.length) {
              throw new SyntaxError(`Unterminated key at position ${pos}`)
            }
            result = object
            open = false
            pos += 1
            break

          case CharCode.Comma:
            result[key] = key = ''
            break

          case CharCode.Escape:
            pos += 1 // Skip the escape and append the next character.

          // ^ passthrough
          default:
            key += input[pos]
        }
      }
      break
    }
  }

  if (result === undefined) {
    throw new SyntaxError(`Unterminated input from position ${startPos}`)
  }

  // At this point, the `pos` variable is assumed to be one character past
  // the last character of the decoded value.
  cursor.pos = pos

  return result
}

/**
 * Find the end of a value that is nested in an array or object.
 */
function findEndPos(input: string, startPos: number) {
  for (let pos = startPos; pos < input.length; pos++) {
    const charCode = input.charCodeAt(pos)
    if (
      charCode === CharCode.Comma ||
      charCode === CharCode.CloseParen ||
      charCode === CharCode.CloseCurly
    ) {
      return pos
    }
  }
  throw new SyntaxError(`Unterminated input from position ${startPos}`)
}
