type BufferAlias = Buffer

export function slice(buffer: Buffer, end: number): BufferAlias {
  return buffer.slice(0, Math.max(0, Math.min(end, buffer.length)))
}
