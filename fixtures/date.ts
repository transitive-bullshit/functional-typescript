type DateAlias = Date

/**
 * @param date1 First date
 */
export function difference(date1: Date, date2: DateAlias): number {
  // TODO: add support for Date return type
  return date2.getTime() - date1.getTime()
}
