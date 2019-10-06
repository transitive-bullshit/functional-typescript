export default (foo: string, ...params: any[]) => {
  return JSON.stringify({ foo, ...params })
}
