import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
dayjs.extend(utc)//加入utc扩展
export function formatUTC(utcString: string, format: string = 'YYYY/MM/DD HH:mm:ss'): string {
  const result = dayjs.utc(utcString).utcOffset(8).format(format)
  return result
}
