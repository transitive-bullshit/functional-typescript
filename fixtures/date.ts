type DateAlias = Date

export function difference(date1: Date, date2: DateAlias): number {
  return date2.getTime() - date1.getTime()
}
