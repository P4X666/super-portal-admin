import dayjs from 'dayjs'

/** ISO 时间 → 'YYYY-MM-DD HH:mm'（列表时间列；后端出参恒为 ISO 字符串） */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '-'
  const d = dayjs(iso)
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm') : '-'
}
