/**
 * Optional context information and utilities for FTS functions.
 */
export class Context {
  /** Version of the FTS handler that is invoking the function */
  public readonly version: string

  constructor(version: string) {
    this.version = version
  }
}
