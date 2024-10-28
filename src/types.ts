type JsonPrimitive = string | number | boolean | null
type CodablePrimitive = JsonPrimitive | bigint | Date | undefined
type DecodedPrimitive = JsonPrimitive | bigint | Date

export type CodableObject = { toJSON(): CodableValue } | CodableRecord
export type CodableRecord = { [key: string]: CodableValue }
export type CodableValue =
  | readonly CodableValue[]
  | CodableObject
  | CodablePrimitive

export type DecodedObject = { [key: string]: DecodedValue }
export type DecodedValue = DecodedObject | DecodedValue[] | DecodedPrimitive
