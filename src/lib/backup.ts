const BACKUP_PAGE_SIZE = 500

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
