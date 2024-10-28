type JsonPrimitive = string | number | boolean | null
type CodablePrimitive = JsonPrimitive | bigint | undefined
type DecodedPrimitive = JsonPrimitive | bigint

export type CodableObject = { toJSON(): CodableValue } | CodableRecord
export type CodableRecord = { [key: string]: CodableValue }
export type CodableValue =
  | readonly CodableValue[]
  | CodableObject
  | CodablePrimitive

export type DecodedObject = { [key: string]: DecodedValue }
export type DecodedValue = DecodedObject | DecodedValue[] | DecodedPrimitive
