import { getPositionOverviewValuation, isCurrencyCodeSupported } from './valuation'

export const POSITION_IMPORT_COLUMNS = [
  'broker',
  'name',
  'ticker',
  'category',
  'quantity',
  'avg_price',
  'current_price',
  'currency',
  'price_as_of',
  'price_source',
  'fx_rate_to_eur',
  'fx_as_of',
  'fx_source',
  'estimated_value_eur',
] as const

export const POSITION_CATEGORIES = [
  'Núcleo Pasivo',
  'Satélite Convicción',
  'Seguridad y Liquidez',
  'Activos Duros',
  'Especulativo',
] as const

export type PositionImportColumn = typeof POSITION_IMPORT_COLUMNS[number]
export type PositionImportNumberFormat = 'es' | 'en'
export type PositionImportStatus = 'new' | 'update' | 'unchanged' | 'invalid' | 'ambiguous' | 'ledger_locked'

export type PositionImportExisting = {
  id: string
  name: string
  ticker: string | null
  category: string
  broker: string | null
  quantity: number | null
  avg_price: number | null
  current_price: number | null
  target_weight: number | null
  investment_asset_id: string | null
  currency: string | null
  price_as_of: string | null
  price_source: string | null
  fx_rate_to_eur: number | null
  fx_as_of: string | null
  fx_source: string | null
  estimated_value_eur?: number | null
  estimated_value_as_of?: string | null
  cost_basis_eur: number | null
  ledger_started_at: string | null
}

export function parsePositionImportNumber(value: string, format: PositionImportNumberFormat, label: string) {
  return parseLocalizedNumber(value, format, label)
}

export type PositionImportSourceRow = {
  line: number
  values: Record<PositionImportColumn, string>
}

export type PositionImportMutation = {
  id: string
  line: number
  status: 'new' | 'update'
  message: string
  current: PositionImportExisting | null
  insert: Record<string, string | number | null> | null
  patch: Record<string, string | number | null> | null
  valued: boolean
}

export type PositionImportPreviewRow = {
  line: number
  status: PositionImportStatus
  message: string
  name: string
  broker: string
  ticker: string
  current: PositionImportExisting | null
  mutation: PositionImportMutation | null
  valued: boolean
  quality: 'confirmed' | 'estimated' | 'missing'
  valueEur: number | null
}

export const POSITION_IMPORT_TEMPLATE = `${POSITION_IMPORT_COLUMNS.join(';')}\r\n`

const HEADER_ALIASES: Record<PositionImportColumn, string[]> = {
  broker: ['broker', 'custodio', 'plataforma', 'cuenta', 'broker_custodio'],
  name: ['name', 'nombre', 'activo', 'instrumento', 'posicion'],
  ticker: ['ticker', 'symbol', 'simbolo'],
  category: ['category', 'categoria'],
  quantity: ['quantity', 'cantidad', 'unidades', 'units', 'qty'],
  avg_price: ['avg_price', 'average_price', 'coste_medio', 'coste_medio_por_unidad', 'precio_medio'],
  current_price: ['current_price', 'market_price', 'last_price', 'precio_actual'],
  currency: ['currency', 'moneda', 'divisa'],
  price_as_of: ['price_as_of', 'fecha_precio', 'fecha_del_precio'],
  price_source: ['price_source', 'fuente_precio', 'origen_precio'],
  fx_rate_to_eur: ['fx_rate_to_eur', 'eur_por_unidad', 'tipo_cambio_eur'],
  fx_as_of: ['fx_as_of', 'fecha_fx', 'fecha_cambio'],
  fx_source: ['fx_source', 'fuente_fx', 'fuente_cambio'],
  estimated_value_eur: ['estimated_value_eur', 'valor_estimado_eur', 'estimacion_eur'],
}

const CLEAR_VALUE = '__CLEAR__'
const MAX_IMPORT_ROWS = 500
const MAX_RECORDS = MAX_IMPORT_ROWS + 1

function normalizeHeader(value: string) {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en')
    .replace(/[\s-]+/g, '_')
}

function parseCsvRecords(text: string, delimiter: string) {
  const records: { line: number; values: string[] }[] = []
  let values: string[] = []
  let value = ''
  let quoted = false
  let line = 1
  let recordLine = 1

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        value += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
      } else {
        value += character
        if (character === '\n') line += 1
      }
      continue
    }

    if (character === '"' && value === '') {
      quoted = true
    } else if (character === delimiter) {
      values.push(value)
      value = ''
    } else if (character === '\n' || character === '\r') {
      values.push(value)
      if (values.some((cell) => cell.trim() !== '')) records.push({ line: recordLine, values })
      if (character === '\r' && text[index + 1] === '\n') index += 1
      line += 1
      recordLine = line
      values = []
      value = ''
      if (records.length > MAX_RECORDS) throw new Error(`El archivo supera el límite de ${MAX_IMPORT_ROWS} filas.`)
    } else {
      value += character
    }
  }

  if (quoted) throw new Error(`Hay un campo entrecomillado sin cerrar (fila ${recordLine}).`)
  values.push(value)
  if (values.some((cell) => cell.trim() !== '')) records.push({ line: recordLine, values })
  if (records.length > MAX_RECORDS) throw new Error(`El archivo supera el límite de ${MAX_IMPORT_ROWS} filas.`)
  return records
}

function detectDelimiter(headerLine: string) {
  const counts = new Map<string, number>([[';', 0], [',', 0], ['\t', 0]])
  let quoted = false
  for (let index = 0; index < headerLine.length; index += 1) {
    const character = headerLine[index]
    if (character === '"' && headerLine[index + 1] === '"' && quoted) {
      index += 1
    } else if (character === '"') {
      quoted = !quoted
    } else if (!quoted && counts.has(character)) {
      counts.set(character, counts.get(character)! + 1)
    }
  }
  const [delimiter, count] = [...counts].sort((left, right) => right[1] - left[1])[0]
  if (count === 0) throw new Error('No se pudo identificar el separador CSV. Usa la plantilla de importación.')
  return delimiter
}

function parseLocalizedNumber(value: string, format: PositionImportNumberFormat, label: string) {
  const raw = value.trim()
  if (!raw) return null
  if (raw.startsWith('-')) throw new Error(`«${label}» debe ser igual o mayor que cero.`)
  const decimal = format === 'es' ? ',' : '.'
  const thousands = format === 'es' ? '.' : ','
  const escapedThousands = thousands === '.' ? '\\.' : thousands
  const groupedWithDecimal = new RegExp(`^\\d{1,3}(?:${escapedThousands}\\d{3})+\\${decimal}\\d+$`)
  const decimalOnly = new RegExp(`^\\d+(?:\\${decimal}\\d+)?$`)
  const groupedOnly = new RegExp(`^\\d{1,3}(?:${escapedThousands}\\d{3})+$`)

  if (!decimalOnly.test(raw) && !groupedWithDecimal.test(raw) && !groupedOnly.test(raw)) {
    throw new Error(`«${label}» no es un número válido para el formato ${format === 'es' ? 'español' : 'internacional'}; usa ${format === 'es' ? 'coma' : 'punto'} decimal.`)
  }

  const normalized = groupedWithDecimal.test(raw) || groupedOnly.test(raw)
    ? raw.split(thousands).join('').replace(decimal, '.')
    : raw.replace(decimal, '.')
  const number = Number(normalized)
  if (!Number.isFinite(number) || number < 0) throw new Error(`«${label}» debe ser un número finito igual o mayor que cero.`)
  return number
}

function isValidDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const [, year, month, day] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  return date.toISOString().slice(0, 10) === value
}

export function parsePositionCsv(text: string): PositionImportSourceRow[] {
  const content = text.replace(/^\uFEFF/, '')
  if (!content.trim()) throw new Error('El archivo está vacío.')
  const firstLine = content.split(/\r?\n/, 1)[0]
  const delimiter = detectDelimiter(firstLine)
  const records = parseCsvRecords(content, delimiter)
  if (records.length < 2) throw new Error('El CSV solo tiene encabezados; añade al menos una fila.')
  if (records.length - 1 > MAX_IMPORT_ROWS) throw new Error(`El archivo supera el límite de ${MAX_IMPORT_ROWS} filas.`)

  const headers = records[0].values.map(normalizeHeader)
  const columnByHeader = new Map<string, PositionImportColumn>()
  for (const [column, aliases] of Object.entries(HEADER_ALIASES) as [PositionImportColumn, string[]][]) {
    for (const alias of aliases) columnByHeader.set(alias, column)
  }

  const indexes = new Map<PositionImportColumn, number>()
  const unknownHeaders: string[] = []
  headers.forEach((header, index) => {
    const column = columnByHeader.get(header)
    if (!column) {
      unknownHeaders.push(records[0].values[index].trim() || `columna ${index + 1}`)
      return
    }
    if (indexes.has(column)) throw new Error(`El encabezado «${records[0].values[index]}» duplica una columna ya indicada.`)
    indexes.set(column, index)
  })

  if (unknownHeaders.length) throw new Error(`Hay columnas no reconocidas: ${unknownHeaders.join(', ')}. Convierte el archivo a la plantilla de Aureum para evitar omitir datos.`)
  for (const required of ['broker', 'name'] as const) {
    if (!indexes.has(required)) throw new Error(`Falta la columna obligatoria «${required}». Descarga y usa la plantilla de Aureum.`)
  }

  return records.slice(1).map((record) => {
    if (record.values.length > headers.length && record.values.slice(headers.length).some((cell) => cell.trim())) {
      throw new Error(`La fila ${record.line} tiene más valores que encabezados.`)
    }
    const values = Object.fromEntries(POSITION_IMPORT_COLUMNS.map((column) => {
      const index = indexes.get(column)
      return [column, index === undefined ? '' : (record.values[index] ?? '').trim()]
    })) as Record<PositionImportColumn, string>
    return { line: record.line, values }
  })
}

function normalizedIdentity(value: string | null | undefined) {
  return value?.trim().normalize('NFKC').toLocaleLowerCase('es-ES') ?? ''
}

function parseText(value: string, field: string, maxLength: number, allowClear = true) {
  const trimmed = value.trim()
  if (trimmed === CLEAR_VALUE && allowClear) return { provided: true, value: null as string | null }
  if (trimmed === CLEAR_VALUE) throw new Error(`«${field}» no se puede borrar.`)
  if (trimmed.length > maxLength) throw new Error(`«${field}» supera ${maxLength} caracteres.`)
  return { provided: trimmed !== '', value: trimmed || null }
}

function parseNumberField(value: string, field: string, format: PositionImportNumberFormat) {
  const trimmed = value.trim()
  if (!trimmed) return { provided: false, value: null as number | null }
  if (trimmed === CLEAR_VALUE) return { provided: true, value: null }
  const number = parseLocalizedNumber(trimmed, format, field)
  return { provided: true, value: number }
}

function parseRowValues(row: PositionImportSourceRow, format: PositionImportNumberFormat) {
  const input = row.values
  const name = parseText(input.name, 'name', 200, false)
  const broker = parseText(input.broker, 'broker', 120, false)
  if (!name.value) throw new Error('Indica el nombre del instrumento.')
  if (!broker.value) throw new Error('Indica el broker o custodio.')
  const quantityProvided = input.quantity.trim() !== ''
  const quantity = !quantityProvided || input.quantity.trim() === CLEAR_VALUE
    ? null
    : parseLocalizedNumber(input.quantity, format, 'quantity')
  const ticker = parseText(input.ticker, 'ticker', 32)
  const category = parseText(input.category, 'category', 80, false)
  if (category.value && !POSITION_CATEGORIES.includes(category.value as typeof POSITION_CATEGORIES[number])) {
    throw new Error(`La categoría «${category.value}» no es una opción admitida.`)
  }

  const averagePrice = parseNumberField(input.avg_price, 'avg_price', format)
  const currentPrice = parseNumberField(input.current_price, 'current_price', format)
  const fxRate = parseNumberField(input.fx_rate_to_eur, 'fx_rate_to_eur', format)
  const estimatedValue = parseNumberField(input.estimated_value_eur, 'estimated_value_eur', format)
  if (fxRate.value !== null && fxRate.value <= 0) throw new Error('El tipo de cambio debe ser mayor que cero.')

  const currency = parseText(input.currency, 'currency', 3)
  const normalizedCurrency = currency.value?.toUpperCase() ?? null
  if (normalizedCurrency && !isCurrencyCodeSupported(normalizedCurrency)) {
    throw new Error(`«${normalizedCurrency}» no es un código de moneda reconocido.`)
  }

  const priceAsOf = parseText(input.price_as_of, 'price_as_of', 10)
  const priceSource = parseText(input.price_source, 'price_source', 300)
  const fxAsOf = parseText(input.fx_as_of, 'fx_as_of', 10)
  const fxSource = parseText(input.fx_source, 'fx_source', 300)
  const priceReferenceProvided = priceAsOf.provided || priceSource.provided
  const fxReferenceProvided = fxRate.provided || fxAsOf.provided || fxSource.provided
  const priceCleared = currentPrice.provided && currentPrice.value === null

  if (priceAsOf.value && !isValidDate(priceAsOf.value)) throw new Error('«price_as_of» debe ser una fecha ISO válida (AAAA-MM-DD).')
  if (fxAsOf.value && !isValidDate(fxAsOf.value)) throw new Error('«fx_as_of» debe ser una fecha ISO válida (AAAA-MM-DD).')
  if (priceReferenceProvided && ((priceAsOf.value === null) !== (priceSource.value === null))) {
    throw new Error('La fecha y la fuente del precio deben proporcionarse juntas o borrarse juntas.')
  }
  if (fxReferenceProvided && [fxRate.value, fxAsOf.value, fxSource.value].some((value) => value === null)) {
    throw new Error('El tipo de cambio, su fecha y su fuente deben proporcionarse completos.')
  }
  if (priceCleared && priceReferenceProvided && (priceAsOf.value !== null || priceSource.value !== null)) {
    throw new Error('Al borrar el precio actual, borra también su fecha y fuente con «__CLEAR__», o deja esos campos vacíos.')
  }
  if (priceCleared && fxReferenceProvided && [fxRate.value, fxAsOf.value, fxSource.value].some((value) => value !== null)) {
    throw new Error('Al borrar el precio actual no se importa un tipo de cambio; deja sus campos vacíos o bórralos con «__CLEAR__».')
  }
  if (currentPrice.provided && currentPrice.value !== null && !priceAsOf.value && !priceSource.value) {
    throw new Error('Cada precio actual importado debe incluir su fecha y fuente.')
  }

  return {
    name: name.value!,
    broker: broker.value!,
    ticker: ticker.provided ? ticker.value?.toUpperCase() ?? null : undefined,
    category: category.provided ? category.value : undefined,
    quantity,
    quantityProvided,
    avg_price: averagePrice,
    current_price: currentPrice,
    currency: currency.provided ? normalizedCurrency : undefined,
    price_as_of: priceAsOf,
    price_source: priceSource,
    fx_rate_to_eur: fxRate,
    fx_as_of: fxAsOf,
    fx_source: fxSource,
    estimated_value_eur: estimatedValue,
    priceReferenceProvided,
    fxReferenceProvided,
  }
}

function findMatch(row: ReturnType<typeof parseRowValues>, existing: PositionImportExisting[]) {
  const sameBroker = existing.filter((position) => normalizedIdentity(position.broker) === normalizedIdentity(row.broker))
  if (row.ticker) {
    const byTicker = sameBroker.filter((position) => normalizedIdentity(position.ticker) === normalizedIdentity(row.ticker))
    if (byTicker.length === 1) return { match: byTicker[0], ambiguous: false }
    if (byTicker.length > 1) return { match: null, ambiguous: true }
    const byNameWithoutTicker = sameBroker.filter((position) =>
      !position.ticker && normalizedIdentity(position.name) === normalizedIdentity(row.name),
    )
    if (byNameWithoutTicker.length === 1) return { match: byNameWithoutTicker[0], ambiguous: false }
    const conflictingName = sameBroker.some((position) => normalizedIdentity(position.name) === normalizedIdentity(row.name))
    return { match: null, ambiguous: byNameWithoutTicker.length > 1 || conflictingName }
  }

  const byName = sameBroker.filter((position) => normalizedIdentity(position.name) === normalizedIdentity(row.name))
  if (byName.length === 1) return { match: byName[0], ambiguous: false }
  return { match: null, ambiguous: byName.length > 1 }
}

function valuesEqual(left: unknown, right: unknown) {
  if (typeof left === 'number' && typeof right === 'number') return Math.abs(left - right) < 1e-10
  return left === right
}

function validateValuation(
  values: Pick<PositionImportExisting, 'quantity' | 'avg_price' | 'current_price' | 'currency' | 'price_as_of' | 'price_source' | 'fx_rate_to_eur' | 'fx_as_of' | 'fx_source' | 'estimated_value_eur' | 'estimated_value_as_of'>,
  statementDate: string,
) {
  if (values.price_as_of && values.price_as_of > statementDate) throw new Error('La fecha del precio es posterior a la fecha de corte del archivo.')
  if (values.fx_as_of && values.fx_as_of > statementDate) throw new Error('La fecha del tipo de cambio es posterior a la fecha de corte del archivo.')
  if (values.estimated_value_as_of && values.estimated_value_as_of > statementDate) throw new Error('La fecha de la estimación es posterior a la fecha de corte del archivo.')
  return getPositionOverviewValuation(values)
}

function buildRowPlan(
  row: PositionImportSourceRow,
  existing: PositionImportExisting[],
  statementDate: string,
  today: string,
  format: PositionImportNumberFormat,
): PositionImportPreviewRow {
  const fallback = {
    line: row.line,
    status: 'invalid' as PositionImportStatus,
    message: '',
    name: row.values.name.trim(),
    broker: row.values.broker.trim(),
    ticker: row.values.ticker.trim(),
    current: null,
    mutation: null,
    valued: false,
    quality: 'missing' as const,
    valueEur: null,
  }

  try {
    if (!isValidDate(today) || !isValidDate(statementDate) || statementDate > today) {
      throw new Error('Indica una fecha de corte válida que no esté en el futuro.')
    }
    const values = parseRowValues(row, format)
    const identity = values.ticker
      ? `${normalizedIdentity(values.broker)}|ticker:${normalizedIdentity(values.ticker)}`
      : `${normalizedIdentity(values.broker)}|name:${normalizedIdentity(values.name)}`
    const matchingRows = existing.filter((position) => {
      if (normalizedIdentity(position.broker) !== normalizedIdentity(values.broker)) return false
      return values.ticker
        ? normalizedIdentity(position.ticker) === normalizedIdentity(values.ticker)
        : normalizedIdentity(position.name) === normalizedIdentity(values.name)
    })
    if (matchingRows.length > 1) {
      return { ...fallback, status: 'ambiguous', message: 'Hay varias posiciones actuales con esta identidad; no se actualizará ninguna.' }
    }

    const { match, ambiguous } = findMatch(values, existing)
    if (ambiguous) {
      return { ...fallback, status: 'ambiguous', message: 'La identidad no coincide de forma única. Revisa broker, nombre y ticker antes de importar.' }
    }

    if (!match) {
      if (!values.category) throw new Error('Una posición nueva requiere categoría; no se asigna una por defecto.')
      const currentPrice = values.current_price.provided ? values.current_price.value : null
      if (currentPrice !== null && values.quantity === null) throw new Error('Para importar un precio por unidad necesitas indicar también las unidades.')
      const currency = values.currency ?? null
      const priceAsOf = values.price_as_of.provided ? values.price_as_of.value : null
      const priceSource = values.price_source.provided ? values.price_source.value : null
      const fxRate = values.fx_rate_to_eur.provided ? values.fx_rate_to_eur.value : null
      const fxAsOf = values.fx_as_of.provided ? values.fx_as_of.value : null
      const fxSource = values.fx_source.provided ? values.fx_source.value : null
      const estimate = values.estimated_value_eur.provided ? values.estimated_value_eur.value : null
      if (currency === 'EUR' && (fxRate !== null || fxAsOf !== null || fxSource !== null)) {
        throw new Error('No se registra tipo de cambio para EUR.')
      }

      const candidate = {
        quantity: values.quantity,
        avg_price: values.avg_price.provided ? values.avg_price.value : null,
        current_price: currentPrice,
        currency,
        price_as_of: priceAsOf,
        price_source: priceSource,
        fx_rate_to_eur: fxRate,
        fx_as_of: fxAsOf,
        fx_source: fxSource,
        estimated_value_eur: estimate,
        estimated_value_as_of: estimate === null ? null : statementDate,
      }
      const valuation = validateValuation(candidate, statementDate)
      const confirmed = valuation.quality === 'confirmed'
      const insert = {
        name: values.name,
        ticker: values.ticker ?? null,
        category: values.category,
        broker: values.broker,
        quantity: values.quantity,
        avg_price: candidate.avg_price,
        current_price: candidate.current_price,
        target_weight: null,
        currency: candidate.currency,
        price_as_of: candidate.price_as_of,
        price_source: candidate.price_source,
        fx_rate_to_eur: candidate.fx_rate_to_eur,
        fx_as_of: candidate.fx_as_of,
        fx_source: candidate.fx_source,
        estimated_value_eur: confirmed ? null : candidate.estimated_value_eur,
        estimated_value_as_of: confirmed ? null : candidate.estimated_value_as_of,
      }
      const message = confirmed
        ? 'Nueva posición; la valoración tiene precio, fecha, fuente y conversión verificables.'
        : valuation.quality === 'estimated'
          ? 'Nueva posición; se usará la estimación EUR de la fecha de corte.'
          : 'Nueva posición; no se sumará al total orientativo hasta añadir una estimación o una valoración detallada.'
      const mutation: PositionImportMutation = {
        id: `new-${row.line}-${identity}`,
        line: row.line,
        status: 'new',
        message,
        current: null,
        insert,
        patch: null,
        valued: valuation.quality !== 'missing',
      }
      return { ...fallback, status: 'new', message, name: values.name, broker: values.broker, ticker: values.ticker ?? '', mutation, valued: valuation.quality !== 'missing', quality: valuation.quality, valueEur: valuation.valueEur }
    }

    const nextCurrency = values.currency === undefined ? match.currency : values.currency
    const currencyChanged = values.currency !== undefined && values.currency !== match.currency
    const incomingPrice = values.current_price.provided ? values.current_price.value : match.current_price
    const priceChanged = values.current_price.provided && !valuesEqual(values.current_price.value, match.current_price)
    const priceCleared = values.current_price.provided && values.current_price.value === null
    const nextPriceAsOf = priceCleared
      ? null
      : priceChanged && !values.priceReferenceProvided
      ? null
      : values.price_as_of.provided ? values.price_as_of.value : match.price_as_of
    const nextPriceSource = priceCleared
      ? null
      : priceChanged && !values.priceReferenceProvided
      ? null
      : values.price_source.provided ? values.price_source.value : match.price_source
    if (priceChanged && !priceCleared && !values.priceReferenceProvided) {
      throw new Error('El precio difiere del actual: incluye también su fecha y fuente en el CSV.')
    }
    if (currencyChanged && match.current_price !== null && (!values.current_price.provided || !values.priceReferenceProvided)) {
      throw new Error('Al cambiar la moneda de una posición valorada, confirma también el precio, fecha y fuente en esa moneda.')
    }

    let nextFxRate = match.fx_rate_to_eur
    let nextFxAsOf = match.fx_as_of
    let nextFxSource = match.fx_source
    if (currencyChanged) {
      nextFxRate = null
      nextFxAsOf = null
      nextFxSource = null
    }
    if (values.fxReferenceProvided) {
      nextFxRate = values.fx_rate_to_eur.value
      nextFxAsOf = values.fx_as_of.value
      nextFxSource = values.fx_source.value
    }
    if (nextCurrency === 'EUR' || nextCurrency === null) {
      if (values.fxReferenceProvided && (nextFxRate !== null || nextFxAsOf !== null || nextFxSource !== null)) {
        throw new Error('No se registra tipo de cambio para EUR o moneda sin confirmar.')
      }
      nextFxRate = null
      nextFxAsOf = null
      nextFxSource = null
    }
    if (priceCleared) {
      nextFxRate = null
      nextFxAsOf = null
      nextFxSource = null
    }

    let nextEstimatedValue = values.estimated_value_eur.provided
      ? values.estimated_value_eur.value
      : match.estimated_value_eur ?? null
    let nextEstimatedAsOf = nextEstimatedValue === null
      ? null
      : values.estimated_value_eur.provided
        ? statementDate
        : match.estimated_value_as_of ?? statementDate

    const nextQuantity = values.quantityProvided ? values.quantity : match.quantity
    if (nextQuantity === null && incomingPrice !== null) {
      throw new Error('No se puede dejar la cantidad vacía mientras haya un precio por unidad; borra o completa ambas cifras.')
    }

    const candidate = {
      quantity: nextQuantity,
      avg_price: values.avg_price.provided ? values.avg_price.value : match.avg_price,
      current_price: incomingPrice,
      currency: nextCurrency,
      price_as_of: nextPriceAsOf,
      price_source: nextPriceSource,
      fx_rate_to_eur: nextFxRate,
      fx_as_of: nextFxAsOf,
      fx_source: nextFxSource,
      estimated_value_eur: nextEstimatedValue,
      estimated_value_as_of: nextEstimatedAsOf,
    }
    const valuation = validateValuation(candidate, statementDate)
    if (valuation.quality === 'confirmed') {
      nextEstimatedValue = null
      nextEstimatedAsOf = null
    }
    const patch: Record<string, string | number | null> = {}
    const setIfChanged = (key: string, next: string | number | null, current: string | number | null) => {
      if (!valuesEqual(next, current)) patch[key] = next
    }

    setIfChanged('name', values.name, match.name)
    if (normalizedIdentity(values.broker) !== normalizedIdentity(match.broker)) setIfChanged('broker', values.broker, match.broker)
    if (values.ticker !== undefined) setIfChanged('ticker', values.ticker, match.ticker)
    if (values.category !== undefined) {
      if (match.investment_asset_id && values.category !== match.category) {
        throw new Error('La categoría la define el activo consolidado vinculado; cambia esa categoría desde Activos y objetivos.')
      }
      setIfChanged('category', values.category, match.category)
    }
    if (values.quantityProvided) setIfChanged('quantity', values.quantity, match.quantity)
    if (values.avg_price.provided) setIfChanged('avg_price', values.avg_price.value, match.avg_price)
    if (values.current_price.provided) setIfChanged('current_price', values.current_price.value, match.current_price)
    if (values.currency !== undefined) setIfChanged('currency', nextCurrency, match.currency)
    if (values.priceReferenceProvided || (priceChanged && !nextPriceAsOf)) {
      setIfChanged('price_as_of', nextPriceAsOf, match.price_as_of)
      setIfChanged('price_source', nextPriceSource, match.price_source)
    }
    if (priceCleared) {
      setIfChanged('price_as_of', null, match.price_as_of)
      setIfChanged('price_source', null, match.price_source)
    } else if (values.priceReferenceProvided || (priceChanged && !nextPriceAsOf)) {
      setIfChanged('price_as_of', nextPriceAsOf, match.price_as_of)
      setIfChanged('price_source', nextPriceSource, match.price_source)
    }
    if (values.fxReferenceProvided || currencyChanged || priceCleared) {
      setIfChanged('fx_rate_to_eur', nextFxRate, match.fx_rate_to_eur)
      setIfChanged('fx_as_of', nextFxAsOf, match.fx_as_of)
      setIfChanged('fx_source', nextFxSource, match.fx_source)
    }
    if (values.estimated_value_eur.provided || valuation.quality === 'confirmed') {
      setIfChanged('estimated_value_eur', nextEstimatedValue, match.estimated_value_eur ?? null)
      setIfChanged('estimated_value_as_of', nextEstimatedAsOf, match.estimated_value_as_of ?? null)
    }

    if (match.ledger_started_at) {
      const lockedChanged = ['broker', 'quantity', 'avg_price', 'currency', 'estimated_value_eur'].some((key) => key in patch)
      if (lockedChanged) {
        const currentValuation = getPositionOverviewValuation(match)
        return {
          ...fallback,
          status: 'ledger_locked',
          message: 'La posición tiene seguimiento activo; cantidad, coste medio, moneda y broker solo se cambian registrando operaciones.',
          name: values.name,
          broker: values.broker,
          ticker: values.ticker ?? match.ticker ?? '',
          current: match,
          valued: currentValuation.quality !== 'missing',
          quality: currentValuation.quality,
          valueEur: currentValuation.valueEur,
        }
      }
    }

    if (Object.keys(patch).length === 0) {
      return { ...fallback, status: 'unchanged', message: 'Los datos importados coinciden; no hace falta guardar cambios.', name: values.name, broker: values.broker, ticker: values.ticker ?? match.ticker ?? '', current: match, valued: valuation.quality !== 'missing', quality: valuation.quality, valueEur: valuation.valueEur }
    }

    const message = valuation.quality === 'confirmed'
      ? `${Object.keys(patch).length} campo(s) cambiarán; la valoración tiene referencias completas.`
      : valuation.quality === 'estimated'
        ? `${Object.keys(patch).length} campo(s) cambiarán; se usará la estimación EUR de la fecha del extracto.`
        : `${Object.keys(patch).length} campo(s) cambiarán; seguirá sin importe para el total orientativo.`
    const mutation: PositionImportMutation = {
      id: match.id,
      line: row.line,
      status: 'update',
      message,
      current: match,
      insert: null,
      patch,
      valued: valuation.quality !== 'missing',
    }
    return { ...fallback, status: 'update', message, name: values.name, broker: values.broker, ticker: values.ticker ?? match.ticker ?? '', current: match, mutation, valued: valuation.quality !== 'missing', quality: valuation.quality, valueEur: valuation.valueEur }
  } catch (error) {
    return { ...fallback, message: error instanceof Error ? error.message : 'La fila no es válida.' }
  }
}

export function preparePositionImport(
  rows: PositionImportSourceRow[],
  existing: PositionImportExisting[],
  statementDate: string,
  today: string,
  format: PositionImportNumberFormat,
): PositionImportPreviewRow[] {
  const previews = rows.map((row) => buildRowPlan(row, existing, statementDate, today, format))
  const rowsByIdentity = new Map<string, PositionImportPreviewRow[]>()
  for (const preview of previews) {
    if (!preview.broker || !preview.name) continue
    const identity = preview.ticker
      ? `${normalizedIdentity(preview.broker)}|ticker:${normalizedIdentity(preview.ticker)}`
      : `${normalizedIdentity(preview.broker)}|name:${normalizedIdentity(preview.name)}`
    rowsByIdentity.set(identity, [...(rowsByIdentity.get(identity) ?? []), preview])
  }
  for (const duplicateRows of rowsByIdentity.values()) {
    if (duplicateRows.length < 2) continue
    for (const preview of duplicateRows) {
      preview.status = 'ambiguous'
      preview.message = 'El archivo repite la misma identidad de broker y ticker/nombre; revisa las filas antes de importar.'
      preview.mutation = null
    }
  }
  return previews
}
