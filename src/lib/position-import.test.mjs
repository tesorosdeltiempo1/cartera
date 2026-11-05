import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parsePositionCsv,
  parsePositionImportNumber,
  preparePositionImport,
} from './positionImport.ts'

const headers = 'broker;name;ticker;category;quantity;avg_price;current_price;currency;price_as_of;price_source;fx_rate_to_eur;fx_as_of;fx_source;estimated_value_eur'

function csvRow(values) {
  return [
    values.broker ?? 'Broker A',
    values.name ?? 'Global Fund',
    values.ticker ?? 'GLOB',
    values.category ?? 'Núcleo Pasivo',
    values.quantity ?? '2',
    values.avg_price ?? '',
    values.current_price ?? '',
    values.currency ?? '',
    values.price_as_of ?? '',
    values.price_source ?? '',
    values.fx_rate_to_eur ?? '',
    values.fx_as_of ?? '',
    values.fx_source ?? '',
    values.estimated_value_eur ?? '',
  ].join(';')
}

function parseRows(text) {
  return parsePositionCsv(`${headers}\r\n${text}\r\n`)
}

function existing(overrides = {}) {
  return {
    id: 'position-1',
    name: 'Global Fund',
    ticker: 'GLOB',
    category: 'Núcleo Pasivo',
    broker: 'Broker A',
    quantity: 1,
    avg_price: 8,
    current_price: 10,
    target_weight: null,
    investment_asset_id: null,
    currency: 'EUR',
    price_as_of: '2026-10-20',
    price_source: 'Broker A',
    fx_rate_to_eur: null,
    fx_as_of: null,
    fx_source: null,
    estimated_value_eur: null,
    estimated_value_as_of: null,
    cost_basis_eur: null,
    ledger_started_at: null,
    ...overrides,
  }
}

const cutoff = '2026-10-22'
const today = '2026-11-05'

test('CSV parser accepts UTF-8 BOM, semicolon delimiter, quoted values and Spanish headers', () => {
  const rows = parsePositionCsv(`\uFEFFcustodio;nombre;ticker;categoria;unidades;precio_actual;moneda;fecha_precio;fuente_precio\r\nBroker A;"Fondo; global";GLOB;Núcleo Pasivo;1,25;12,50;EUR;2026-10-22;"Extracto, página 2"\r\n`)

  assert.equal(rows.length, 1)
  assert.equal(rows[0].line, 2)
  assert.equal(rows[0].values.name, 'Fondo; global')
  assert.equal(rows[0].values.quantity, '1,25')
  assert.equal(rows[0].values.price_source, 'Extracto, página 2')
})

test('CSV parser rejects unsupported or duplicate headers and malformed rows', () => {
  assert.throws(() => parsePositionCsv('broker;name;quantity;portfolio_total\nA;B;1;2'), /columnas no reconocidas/)
  assert.throws(() => parsePositionCsv('broker;name;nombre;quantity\nA;B;B;1'), /duplica/)
  assert.throws(() => parsePositionCsv(`${headers}\n${csvRow({ name: 'Bad "quoted' })};extra`), /más valores que encabezados|entrecomillado/)
  assert.throws(() => parsePositionCsv(headers), /solo tiene encabezados/)
})

test('numeric parsing follows the selected decimal locale and rejects ambiguous formats', () => {
  assert.equal(parsePositionImportNumber('1.234,56', 'es', 'price'), 1234.56)
  assert.equal(parsePositionImportNumber('0,007331', 'es', 'quantity'), 0.007331)
  assert.equal(parsePositionImportNumber('1,234.56', 'en', 'price'), 1234.56)
  assert.equal(parsePositionImportNumber('1234.56', 'en', 'price'), 1234.56)
  assert.throws(() => parsePositionImportNumber('1,2.3', 'es', 'price'), /formato español/)
  assert.throws(() => parsePositionImportNumber('-1', 'es', 'price'), /mayor que cero/)
})

test('new positions require an explicit category and retain incomplete valuation as pending', () => {
  const noCategory = csvRow({ category: '', currency: 'USD', current_price: '100', price_as_of: cutoff, price_source: 'Extracto X' })
  const missingCategory = preparePositionImport(parseRows(noCategory), [], cutoff, today, 'es')[0]
  assert.equal(missingCategory.status, 'invalid')
  assert.match(missingCategory.message, /requiere categoría/)

  const pending = preparePositionImport(
    parseRows(csvRow({ currency: 'USD', current_price: '100', price_as_of: cutoff, price_source: 'Extracto X' })),
    [],
    cutoff,
    today,
    'es',
  )[0]
  assert.equal(pending.status, 'new')
  assert.equal(pending.valued, false)
  assert.equal(pending.quality, 'missing')
  assert.equal(pending.valueEur, null)
  assert.equal(pending.mutation.insert.fx_rate_to_eur, null)
})

test('CSV imports can use a direct EUR estimate dated to the statement cut', () => {
  const estimate = preparePositionImport(
    parseRows(csvRow({ estimated_value_eur: '1.234,56' })),
    [],
    cutoff,
    today,
    'es',
  )[0]

  assert.equal(estimate.status, 'new')
  assert.equal(estimate.valued, true)
  assert.equal(estimate.quality, 'estimated')
  assert.equal(estimate.valueEur, 1234.56)
  assert.equal(estimate.mutation.insert.estimated_value_eur, 1234.56)
  assert.equal(estimate.mutation.insert.estimated_value_as_of, cutoff)
  assert.equal(estimate.mutation.insert.currency, null)
})

test('CSV estimates do not require inventing units', () => {
  const estimate = preparePositionImport(
    parseRows(csvRow({ quantity: '', estimated_value_eur: '500' })),
    [],
    cutoff,
    today,
    'es',
  )[0]

  assert.equal(estimate.status, 'new')
  assert.equal(estimate.valueEur, 500)
  assert.equal(estimate.mutation.insert.quantity, null)
})

test('updates match by broker and ticker, preview only explicit changes, and ignore blank optional fields', () => {
  const row = csvRow({
    quantity: '2',
    avg_price: '8,5',
    current_price: '11',
    currency: 'EUR',
    price_as_of: cutoff,
    price_source: 'Broker A cierre',
  })
  const preview = preparePositionImport(parseRows(row), [existing()], cutoff, today, 'es')[0]

  assert.equal(preview.status, 'update')
  assert.equal(preview.mutation.id, 'position-1')
  assert.deepEqual(preview.mutation.patch, {
    quantity: 2,
    avg_price: 8.5,
    current_price: 11,
    price_as_of: cutoff,
    price_source: 'Broker A cierre',
  })
  assert.equal(preview.valued, true)
  assert.equal(preview.quality, 'confirmed')
  assert.equal(preview.valueEur, 22)
})

test('unchanged rows are not mutated and identity collisions are blocked', () => {
  const same = csvRow({ quantity: '1' })
  const unchanged = preparePositionImport(parseRows(same), [existing()], cutoff, today, 'es')[0]
  assert.equal(unchanged.status, 'unchanged')
  assert.equal(unchanged.mutation, null)

  const repeated = preparePositionImport(parseRows(`${same}\r\n${same}`), [existing()], cutoff, today, 'es')
  assert.deepEqual(repeated.map((row) => row.status), ['ambiguous', 'ambiguous'])
  assert.ok(repeated.every((row) => row.mutation === null))

  const existingAmbiguous = preparePositionImport(
    parseRows(same),
    [existing(), existing({ id: 'position-2' })],
    cutoff,
    today,
    'es',
  )[0]
  assert.equal(existingAmbiguous.status, 'ambiguous')
})

test('ledger-managed positions reject edits to quantity and cost basis but allow quote refreshes', () => {
  const tracked = existing({ ledger_started_at: '2026-01-01T00:00:00Z' })
  const quantityChange = preparePositionImport(parseRows(csvRow({ quantity: '2' })), [tracked], cutoff, today, 'es')[0]
  assert.equal(quantityChange.status, 'ledger_locked')
  assert.match(quantityChange.message, /seguimiento activo/)

  const priceRefresh = preparePositionImport(parseRows(csvRow({
    quantity: '1',
    current_price: '11',
    currency: 'EUR',
    price_as_of: cutoff,
    price_source: 'Broker A cierre',
  })), [tracked], cutoff, today, 'es')[0]
  assert.equal(priceRefresh.status, 'update')
  assert.equal(priceRefresh.mutation.patch.current_price, 11)
})

test('currency changes require a fresh price reference and invalidate the old FX conversion', () => {
  const usdWithoutPrice = preparePositionImport(
    parseRows(csvRow({ quantity: '1', currency: 'USD' })),
    [existing()],
    cutoff,
    today,
    'es',
  )[0]
  assert.equal(usdWithoutPrice.status, 'invalid')
  assert.match(usdWithoutPrice.message, /confirma también el precio/)

  const usdWithPrice = preparePositionImport(
    parseRows(csvRow({
      quantity: '1',
      current_price: '10',
      currency: 'USD',
      price_as_of: cutoff,
      price_source: 'Broker A USD',
    })),
    [existing()],
    cutoff,
    today,
    'es',
  )[0]
  assert.equal(usdWithPrice.status, 'update')
  assert.equal(usdWithPrice.valued, false)

  const usdToEur = preparePositionImport(
    parseRows(csvRow({
      quantity: '1',
      current_price: '10',
      currency: 'EUR',
      price_as_of: cutoff,
      price_source: 'Broker A EUR',
    })),
    [existing({ currency: 'USD', fx_rate_to_eur: 0.9, fx_as_of: '2026-10-20', fx_source: 'Fuente FX' })],
    cutoff,
    today,
    'es',
  )[0]
  assert.equal(usdToEur.status, 'update')
  assert.equal(usdToEur.mutation.patch.fx_rate_to_eur, null)
  assert.equal(usdToEur.mutation.patch.fx_as_of, null)
  assert.equal(usdToEur.mutation.patch.fx_source, null)
})

test('price provenance, FX groups and dates are validated before import', () => {
  const noPriceSource = preparePositionImport(
    parseRows(csvRow({ current_price: '11', currency: 'EUR', price_as_of: cutoff })),
    [existing()],
    cutoff,
    today,
    'es',
  )[0]
  assert.equal(noPriceSource.status, 'invalid')
  assert.match(noPriceSource.message, /fecha y la fuente/)

  const partialFx = preparePositionImport(
    parseRows(csvRow({ current_price: '11', currency: 'USD', price_as_of: cutoff, price_source: 'Broker', fx_rate_to_eur: '0,9' })),
    [existing()],
    cutoff,
    today,
    'es',
  )[0]
  assert.equal(partialFx.status, 'invalid')
  assert.match(partialFx.message, /tipo de cambio, su fecha y su fuente/)

  const futurePrice = preparePositionImport(
    parseRows(csvRow({ current_price: '11', currency: 'EUR', price_as_of: '2026-10-23', price_source: 'Broker' })),
    [existing()],
    cutoff,
    today,
    'es',
  )[0]
  assert.equal(futurePrice.status, 'invalid')
  assert.match(futurePrice.message, /posterior a la fecha de corte/)
})

test('clearing a current price also clears its attached quote references', () => {
  const preview = preparePositionImport(
    parseRows(csvRow({ current_price: '__CLEAR__' })),
    [existing({ currency: 'USD', fx_rate_to_eur: 0.9, fx_as_of: '2026-10-20', fx_source: 'Fuente FX' })],
    cutoff,
    today,
    'es',
  )[0]

  assert.equal(preview.status, 'update')
  assert.equal(preview.mutation.patch.current_price, null)
  assert.equal(preview.mutation.patch.price_as_of, null)
  assert.equal(preview.mutation.patch.price_source, null)
  assert.equal(preview.mutation.patch.fx_rate_to_eur, null)
})

test('future statement dates are blocked and invalid rows do not prevent other rows previewing', () => {
  const rows = preparePositionImport(
    parseRows(`${csvRow({ name: '', quantity: '1' })}\r\n${csvRow({ name: 'Valid', ticker: 'VALID', quantity: '1' })}`),
    [],
    '2026-11-06',
    today,
    'es',
  )
  assert.equal(rows[0].status, 'invalid')
  assert.equal(rows[1].status, 'invalid')
  assert.match(rows[1].message, /no esté en el futuro/)
})
