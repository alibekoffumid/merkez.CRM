import pg from 'pg';

const { Pool } = pg;

// Load configuration from environment variables
const localDbUrl = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';
const cloudDbUrl = process.env.CLOUD_DATABASE_URL;

if (!cloudDbUrl) {
  console.error('ERROR: CLOUD_DATABASE_URL environment variable is not defined.');
  process.exit(1);
}

console.log('Starting Warehouse Sync Agent...');
console.log(`Local DB: ${localDbUrl.split('@')[1] || 'localhost'}`);
console.log(`Cloud DB: ${cloudDbUrl.split('@')[1] || 'cloud'}`);

const localPool = new Pool({ connectionString: localDbUrl });
const cloudPool = new Pool({ connectionString: cloudDbUrl });

// Helper to generate dynamic Upsert Query
function buildUpsertQuery(tableName, payload) {
  const cols = Object.keys(payload);
  const valPlaceholders = cols.map((_, idx) => `$${idx + 1}`).join(', ');
  const updateCols = cols.filter(c => c !== 'id');
  const updateSet = updateCols.map(c => `${c} = EXCLUDED.${c}`).join(', ');
  
  const sql = `
    INSERT INTO ${tableName} (${cols.join(', ')})
    VALUES (${valPlaceholders})
    ON CONFLICT (id) DO UPDATE
    SET ${updateSet}
    WHERE EXCLUDED.updated_at > ${tableName}.updated_at OR ${tableName}.updated_at IS NULL
  `;
  
  const values = cols.map(c => payload[c]);
  return { sql, values };
}

// Replicate a batch of sync queue items from source to destination
async function replicateBatch(srcPool, destPool, directionLabel) {
  // Fetch a batch of unsynced records
  const selectRes = await srcPool.query(
    'SELECT * FROM sync_queue WHERE synced_at IS NULL ORDER BY created_at ASC LIMIT 50'
  );

  if (selectRes.rows.length === 0) {
    return 0;
  }

  console.log(`[${directionLabel}] Found ${selectRes.rows.length} unsynced items.`);

  let successCount = 0;

  for (const item of selectRes.rows) {
    const { id, table_name, action, record_id, payload } = item;
    const destClient = await destPool.connect();

    try {
      await destClient.query('BEGIN');
      // Set transaction-local parameter to tell triggers to ignore this write
      await destClient.query("SET LOCAL app.current_sync = 'true'");

      if (action === 'DELETE') {
        await destClient.query(`UPDATE ${table_name} SET is_deleted = true, updated_at = now() WHERE id = $1`, [record_id]);
      } else {
        const { sql, values } = buildUpsertQuery(table_name, payload);
        await destClient.query(sql, values);
      }

      await destClient.query('COMMIT');
      
      // Mark as successfully synced in the source DB
      await srcPool.query('UPDATE sync_queue SET synced_at = now() WHERE id = $1', [id]);
      successCount++;
    } catch (err) {
      await destClient.query('ROLLBACK');
      console.error(`[${directionLabel}] Failed to sync item ${id} (table: ${table_name}, action: ${action}):`, err.message);
      // We do not stop the loop, we continue with other items. This item will be retried on next poll.
    } finally {
      destClient.release();
    }
  }

  return successCount;
}

// Main sync loop function
async function runSyncCycle() {
  try {
    // 1. Sync Local -> Cloud
    const localToCloudCount = await replicateBatch(localPool, cloudPool, 'LOCAL -> CLOUD');
    if (localToCloudCount > 0) {
      console.log(`[LOCAL -> CLOUD] Replicated ${localToCloudCount} items successfully.`);
    }

    // 2. Sync Cloud -> Local
    const cloudToLocalCount = await replicateBatch(cloudPool, localPool, 'CLOUD -> LOCAL');
    if (cloudToLocalCount > 0) {
      console.log(`[CLOUD -> LOCAL] Replicated ${cloudToLocalCount} items successfully.`);
    }
  } catch (err) {
    console.error('Error running synchronization cycle:', err.message);
  }
}

// Start polling loop
const POLL_INTERVAL_MS = 2000;
console.log(`Sync agent active. Polling database changes every ${POLL_INTERVAL_MS / 1000}s.`);

setInterval(runSyncCycle, POLL_INTERVAL_MS);

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down sync agent...');
  await localPool.end();
  await cloudPool.end();
  console.log('Sync agent stopped.');
  process.exit(0);
});
