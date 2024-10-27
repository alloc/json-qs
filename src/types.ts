export type CodableObject = { toJSON(): CodableValue } | CodableRecord

export type CodableRecord = { [key: string]: CodableValue }

export type CodableValue =
  | string
  | number
  | boolean
  | bigint
  | null
  | undefined
  | CodableObject
  | readonly CodableValue[]
