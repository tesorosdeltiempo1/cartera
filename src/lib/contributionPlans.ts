export type ContributionCadence = 'weekly' | 'monthly'

export type ContributionPlanSchedule = {
  cadence: ContributionCadence
  start_date: string
  end_date: string | null
  weekday: number | null
  day_of_month: number | null
}

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null
  return parsed
}

function formatDate(value: Date) {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
}

export function getNextContributionDate(schedule: ContributionPlanSchedule, today = new Date()): string | null {
  const start = parseDate(schedule.start_date)
  const end = schedule.end_date ? parseDate(schedule.end_date) : null
  if (!start || (schedule.end_date && !end) || Number.isNaN(today.getTime()) || (end && end < start)) return null

  const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
  let candidate = start > todayUtc ? start : todayUtc

  if (schedule.cadence === 'weekly') {
    if (!Number.isInteger(schedule.weekday) || schedule.weekday === null || schedule.weekday < 0 || schedule.weekday > 6) return null
    const daysUntil = (schedule.weekday - candidate.getUTCDay() + 7) % 7
    candidate = new Date(candidate.getTime() + daysUntil * 24 * 60 * 60 * 1000)
  } else if (schedule.cadence === 'monthly') {
    if (!Number.isInteger(schedule.day_of_month) || schedule.day_of_month === null || schedule.day_of_month < 1 || schedule.day_of_month > 31) return null
    let monthOffset = 0
    while (monthOffset < 2400) {
      const year = candidate.getUTCFullYear()
      const month = candidate.getUTCMonth() + monthOffset
      const targetYear = year + Math.floor(month / 12)
      const targetMonth = month % 12
      const targetDay = Math.min(schedule.day_of_month, daysInMonth(targetYear, targetMonth))
      const monthlyDate = new Date(Date.UTC(targetYear, targetMonth, targetDay))
      if (monthlyDate >= candidate && monthlyDate >= start) {
        candidate = monthlyDate
        break
      }
      monthOffset += 1
    }
    if (monthOffset === 2400) return null
  } else {
    return null
  }

  if (end && candidate > end) return null
  return formatDate(candidate)
}
