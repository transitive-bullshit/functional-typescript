enum Color {
  Red,
  Green,
  Blue
}

interface Nala {
  numbers: number[]
  color: Color
}

/**
 * This is an example description for an example function.
 *
 * @param foo - Example describing string `foo`.
 * @returns Description of return value.
 */
export default async function Example(
  foo: string,
  bar: number,
  nala?: Nala
): Promise<string> {
  return 'Hello World'
}
