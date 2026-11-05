export type HistoricalSnapshotLine = {
  broker: string
  amount: string
}

export type PreparedHistoricalSnapshot = {
  totalValue: number
  breakdown: Record<string, number>
}

export type SnapshotValueChange = {
  difference: number
  percentage: number
}

export function compareSnapshotValues(currentValue: number, previousValue: number): SnapshotValueChange | null {
  if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue) || previousValue <= 0) return null
  const difference = Math.round((currentValue - previousValue) * 100) / 100
  return {
    difference,
    percentage: difference / previousValue * 100,
  }
}

function isValidDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const [, year, month, day] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  return date.toISOString().slice(0, 10) === value
}

function parseEuroAmount(value: string) {
  const compact = value.trim().replace(/\s/g, '')
  if (!compact) return null

  const lastComma = compact.lastIndexOf(',')
  const lastPeriod = compact.lastIndexOf('.')
  let normalized: string
  if (lastComma >= 0 && lastPeriod >= 0) {
    const decimalSeparator = lastComma > lastPeriod ? ',' : '.'
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ','
    const decimalIndex = compact.lastIndexOf(decimalSeparator)
    const integerPart = compact.slice(0, decimalIndex)
    const fraction = compact.slice(decimalIndex + 1)
    const integerPattern = new RegExp(`^\\d+(?:\\${thousandsSeparator}\\d{3})*$`)
    if (!integerPattern.test(integerPart) || !/^\d{1,2}$/.test(fraction)) return null
    normalized = `${integerPart.split(thousandsSeparator).join('')}.${fraction}`
  } else if (lastComma >= 0 || lastPeriod >= 0) {
    const separator = lastComma >= 0 ? ',' : '.'
    const thousandsPattern = new RegExp(`^\\d{1,3}(?:\\${separator}\\d{3})+$`)
    const decimalPattern = new RegExp(`^\\d+\\${separator}\\d{1,2}$`)
    if (thousandsPattern.test(compact)) {
      normalized = compact.split(separator).join('')
    } else if (decimalPattern.test(compact)) {
      normalized = compact.replace(separator, '.')
    } else {
      return null
    }
  } else if (/^\d+$/.test(compact)) {
    normalized = compact
  } else {
    return null
  }

  const amount = Number(normalized)
  if (!Number.isFinite(amount) || amount < 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-7) {
    return null
  }
  return Math.round(amount * 100) / 100
}

export function prepareHistoricalSnapshot(
  snapshotDate: string,
  lines: HistoricalSnapshotLine[],
  today: string,
): PreparedHistoricalSnapshot {
  if (!isValidDate(snapshotDate) || !isValidDate(today)) {
    throw new Error('Indica una fecha válida para el snapshot.')
  }
  if (snapshotDate > today) {
    throw new Error('La fecha del snapshot no puede estar en el futuro.')
  }

  const breakdown: Record<string, number> = {}
  const normalizedBrokers = new Set<string>()
  for (const line of lines) {
    const broker = line.broker.trim()
    const rawAmount = line.amount.trim()
    if (!broker && !rawAmount) continue
    if (!broker) throw new Error('Indica el broker o la cuenta de cada importe.')
    const normalizedBroker = broker.toLowerCase()
    if (normalizedBrokers.has(normalizedBroker)) {
      throw new Error(`El broker «${broker}» aparece más de una vez.`)
    }

    const amount = parseEuroAmount(rawAmount)
    if (amount === null) {
      throw new Error(`Introduce un importe válido en euros para «${broker}».`)
    }
    normalizedBrokers.add(normalizedBroker)
    breakdown[broker] = amount
  }

  const entries = Object.entries(breakdown)
  if (entries.length === 0 || entries.every(([, amount]) => amount === 0)) {
    throw new Error('Añade al menos un importe mayor que cero.')
  }

  const totalValue = Math.round(entries.reduce((total, [, amount]) => total + amount, 0) * 100) / 100
  return { totalValue, breakdown }
}
