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
 * @returns Baby kittens!
 */
export default async function Foo(
  foo: string,
  bar: number,
  nala?: Nala
): Promise<string> {
  return 'TODO'
}
