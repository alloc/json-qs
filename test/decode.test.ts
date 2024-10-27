import { castArray, zip } from 'radashi'
import { decode } from '../src/decode.js'
import { cases } from './cases.js'

describe('json-qs', () => {
  describe('decode', () => {
    for (const name in cases) {
      test(name, () => {
        for (const { decoded, encoded } of castArray(cases[name])) {
          let result: unknown
          expect(() => {
            result = decode(new URLSearchParams(encoded))
          }, encoded).not.toThrow()
          expect(result, encoded).toEqual(decoded)
        }
      })
    }

    function decodeMany(cases: string[]) {
      const results: any[] = []
      for (const input of cases) {
        try {
          results.push(decode(new URLSearchParams(input)))
        } catch (error) {
          results.push(error)
        }
      }
      return new Map(zip(cases, results))
    }

    test('throws on prototype pollution', () => {
      const results = decodeMany([
        '__proto__=1',
        'a={__proto__:1}',
        'a={\\__proto__:1}',
        'a={b:1,__proto__:{isAdmin:true}}',
      ])
      expect(results).toMatchInlineSnapshot(`
        Map {
          "__proto__=1" => [SyntaxError: Failed to decode value for '__proto__' key: Forbidden key],
          "a={__proto__:1}" => [SyntaxError: Failed to decode value for 'a' key: Forbidden key at position 1],
          "a={\\__proto__:1}" => [SyntaxError: Failed to decode value for 'a' key: Forbidden key at position 1],
          "a={b:1,__proto__:{isAdmin:true}}" => [SyntaxError: Failed to decode value for 'a' key: Forbidden key at position 5],
        }
      `)
    })

    test('throws on malformed input', () => {
      const results = decodeMany([
        'a=(',
        'a=((',
        'a=(b',
        'a={b:',
        'a={b}',
        'a={:}',
        'a=1.n',
      ])

      expect(results).toMatchInlineSnapshot(`
        Map {
          "a=(" => [SyntaxError: Failed to decode value for 'a' key: Unterminated input from position 0],
          "a=((" => [SyntaxError: Failed to decode value for 'a' key: Unterminated input from position 1],
          "a=(b" => [SyntaxError: Failed to decode value for 'a' key: Unterminated input from position 1],
          "a={b:" => [SyntaxError: Failed to decode value for 'a' key: Unterminated input from position 3],
          "a={b}" => [SyntaxError: Failed to decode value for 'a' key: Unterminated key at position 2],
          "a={:}" => [SyntaxError: Failed to decode value for 'a' key: Unexpected end of string at position 2],
          "a=1.n" => [SyntaxError: Failed to decode value for 'a' key: Cannot convert 1. to a BigInt],
        }
      `)
    })
  })
})
