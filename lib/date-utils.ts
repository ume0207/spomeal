/**
 * 日本時間(JST, UTC+9)用のユーティリティ関数
 * アプリ全体で統一して使用する
 */

/** 日本時間の日付文字列(YYYY-MM-DD)を返す */
export function toJSTDateStr(d?: Date): string {
  const date = d ?? new Date()
  return date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
}

/** 日本時間の日時文字列(YYYY-MM-DDTHH:mm)を返す */
export function toJSTDateTimeStr(d?: Date): string {
  const date = d ?? new Date()
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

/** 日本時間のISO文字列を返す */
export function toJSTISOString(d?: Date): string {
  const date = d ?? new Date()
  const offset = 9 * 60 // JST = UTC+9
  const jst = new Date(date.getTime() + offset * 60 * 1000)
  return jst.toISOString().replace('Z', '+09:00')
}

/** 日本時間の「今日」のDateオブジェクトを返す（時刻は00:00） */
export function getJSTToday(): Date {
  const str = toJSTDateStr()
  return new Date(str + 'T00:00:00+09:00')
}
