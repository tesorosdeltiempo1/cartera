const BACKUP_PAGE_SIZE = 500
const BACKUP_FORMAT_VERSION = 7
const BACKUP_ERROR_LIMIT = 50
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const BACKUP_TABLE_NAMES = [
  'assets',
  'investment_assets',
  'portfolio_snapshots',
  'portfolio_snapshot_assets',
  'portfolio_cash_accounts',
  'portfolio_transactions',
  'real_estate_assets',
  'mortgage_liabilities',
  'wealth_snapshots',
  'portfolio_contribution_plans',
] as const

export type BackupTableName = typeof BACKUP_TABLE_NAMES[number]

export type BackupValidationResult = {
  valid: boolean
  exportedAt: string | null
  counts: Record<BackupTableName, number>
  errors: string[]
}

type BackupTables = Record<BackupTableName, unknown[]>

const EMPTY_COUNTS = Object.fromEntries(BACKUP_TABLE_NAMES.map((table) => [table, 0])) as Record<BackupTableName, number>

const BACKUP_REFERENCES: {
  table: BackupTableName
  column: string
  referencedTable: BackupTableName
  optional?: boolean
}[] = [
  { table: 'assets', column: 'investment_asset_id', referencedTable: 'investment_assets', optional: true },
  { table: 'portfolio_snapshot_assets', column: 'snapshot_id', referencedTable: 'portfolio_snapshots' },
  { table: 'portfolio_snapshot_assets', column: 'investment_asset_id', referencedTable: 'investment_assets', optional: true },
  { table: 'portfolio_transactions', column: 'position_id', referencedTable: 'assets', optional: true },
  { table: 'portfolio_transactions', column: 'cash_account_id', referencedTable: 'portfolio_cash_accounts' },
  { table: 'portfolio_transactions', column: 'property_id', referencedTable: 'real_estate_assets', optional: true },
  { table: 'portfolio_transactions', column: 'mortgage_id', referencedTable: 'mortgage_liabilities', optional: true },
  { table: 'portfolio_transactions', column: 'reversal_of_transaction_id', referencedTable: 'portfolio_transactions', optional: true },
  { table: 'mortgage_liabilities', column: 'property_id', referencedTable: 'real_estate_assets' },
  { table: 'portfolio_contribution_plans', column: 'target_position_id', referencedTable: 'assets', optional: true },
]

type BackupPage<T> = {
  data: T[] | null
  error: { message: string } | null
  count: number | null
}

export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<BackupPage<T>>,
): Promise<T[]> {
  const rows: T[] = []
  let expectedCount: number | null = null

  for (let from = 0; ; from += BACKUP_PAGE_SIZE) {
    const { data, error, count } = await fetchPage(from, from + BACKUP_PAGE_SIZE - 1)
    if (error) throw error
    if (count === null) throw new Error('No se pudo verificar el total de filas; no se descargó el respaldo.')
    if (data === null) throw new Error('No se recibieron filas de una tabla; no se descargó el respaldo.')
    if (expectedCount !== null && count !== expectedCount) {
      throw new Error('Los datos cambiaron durante la exportación. Vuelve a intentarlo.')
    }
    expectedCount = count

    rows.push(...data)
    if (rows.length > expectedCount) {
      throw new Error('La exportación recibió más filas de las esperadas; no se descargó el respaldo.')
    }
    if (data.length < BACKUP_PAGE_SIZE) {
      if (rows.length !== expectedCount) {
        throw new Error('La exportación no recibió todas las filas; no se descargó un respaldo parcial.')
      }
      return rows
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function emptyValidationResult(error: string): BackupValidationResult {
  return { valid: false, exportedAt: null, counts: { ...EMPTY_COUNTS }, errors: [error] }
}

export function validateBackupJson(content: string): BackupValidationResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    return emptyValidationResult('El archivo no contiene JSON válido.')
  }

  if (!isRecord(parsed)) return emptyValidationResult('El contenido debe ser un objeto JSON.')

  const errors: string[] = []
  let omittedErrorCount = 0
  const addError = (message: string) => {
    if (errors.length < BACKUP_ERROR_LIMIT) errors.push(message)
    else omittedErrorCount += 1
  }
  const getErrors = () => omittedErrorCount === 0
    ? errors
    : [...errors, `Se omitieron ${omittedErrorCount.toLocaleString('es-ES')} errores adicionales.`]

  if (parsed.app !== 'Cartera') addError('El archivo no identifica a Cartera como aplicación de origen.')
  if (parsed.formatVersion !== BACKUP_FORMAT_VERSION) {
    addError(`Versión de respaldo no compatible: se esperaba ${BACKUP_FORMAT_VERSION}.`)
  }
  const exportedAt = typeof parsed.exportedAt === 'string' && Number.isFinite(Date.parse(parsed.exportedAt))
    ? parsed.exportedAt
    : null
  if (exportedAt === null) addError('La fecha de exportación falta o no es válida.')
  if (!isRecord(parsed.tables)) {
    addError('Falta el objeto de tablas.')
    return { valid: false, exportedAt, counts: { ...EMPTY_COUNTS }, errors: getErrors() }
  }

  const rawTables = parsed.tables
  const tables = {} as BackupTables
  const counts = { ...EMPTY_COUNTS }
  for (const tableName of BACKUP_TABLE_NAMES) {
    const tableRows = rawTables[tableName]
    if (!Array.isArray(tableRows)) {
      addError(`Falta la tabla ${tableName} o no es una lista.`)
      tables[tableName] = []
      continue
    }
    counts[tableName] = tableRows.length
    tables[tableName] = tableRows
  }
  if (BACKUP_TABLE_NAMES.some((tableName) => !Array.isArray(rawTables[tableName]))) {
    return { valid: false, exportedAt, counts, errors: getErrors() }
  }

  const ids = {} as Record<BackupTableName, Set<string>>
  for (const tableName of BACKUP_TABLE_NAMES) {
    ids[tableName] = new Set()
    tables[tableName].forEach((row, index) => {
      if (!isRecord(row) || typeof row.id !== 'string' || !UUID_PATTERN.test(row.id)) {
        addError(`${tableName}, fila ${index + 1}: falta un identificador UUID válido.`)
        return
      }
      const id = row.id.toLowerCase()
      if (ids[tableName].has(id)) addError(`${tableName}: identificador duplicado en más de una fila.`)
      ids[tableName].add(id)
    })
  }

  for (const reference of BACKUP_REFERENCES) {
    tables[reference.table].forEach((row, index) => {
      if (!isRecord(row)) return
      const value = row[reference.column]
      if (value === null || value === undefined || value === '') {
        if (!reference.optional) addError(`${reference.table}, fila ${index + 1}: falta ${reference.column}.`)
        return
      }
      if (typeof value !== 'string' || !UUID_PATTERN.test(value) || !ids[reference.referencedTable].has(value.toLowerCase())) {
        addError(`${reference.table}, fila ${index + 1}: ${reference.column} no tiene referencia válida en ${reference.referencedTable}.`)
      }
    })
  }

  return { valid: errors.length === 0 && omittedErrorCount === 0, exportedAt, counts, errors: getErrors() }
}
