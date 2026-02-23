/**
 * PostgreSQL adapter that mimics MySQL2 API so existing routes work unchanged.
 * Converts ? placeholders to $1, $2, ... and normalizes result shape (insertId, affectedRows).
 */
const pg = require('./postgres-database');

let paramIndex = 0;
function convertPlaceholders(sql) {
  paramIndex = 0;
  return sql.replace(/\?/g, () => `$${++paramIndex}`);
}

function normalizeResult(result, sql) {
  const u = (sql || '').trim().toUpperCase();
  const isInsert = u.startsWith('INSERT');
  const isUpdate = u.startsWith('UPDATE');
  const isDelete = u.startsWith('DELETE');
  const rows = result.rows || [];
  const rowCount = result.rowCount != null ? result.rowCount : rows.length;
  const meta = { affectedRows: rowCount };
  if (isInsert && rows.length > 0 && rows[0].id != null) meta.insertId = rows[0].id;

  if (isInsert || isUpdate || isDelete) return [meta, rows];
  return [rows];
}

async function query(sql, params = []) {
  const converted = convertPlaceholders(sql);
  const client = await pg.connect();
  try {
    const result = await client.query(converted, params);
    return normalizeResult(result, sql);
  } finally {
    client.release();
  }
}

async function getConnection() {
  const client = await pg.connect();
  return {
    query: async (sql, params = []) => {
      const converted = convertPlaceholders(sql);
      const result = await client.query(converted, params);
      return normalizeResult(result, sql);
    },
    release: () => client.release(),
    beginTransaction: () => client.query('BEGIN'),
    commit: () => client.query('COMMIT'),
    rollback: () => client.query('ROLLBACK')
  };
}

const dbManager = require('./postgres-database').manager;

module.exports = { query, getConnection, manager: dbManager };
