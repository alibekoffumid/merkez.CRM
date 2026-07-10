const { Client } = require('../node_modules/pg');

const query = `
-- Add checked_by, received_by, and handed_over_by columns to stocktakes
ALTER TABLE stocktakes ADD COLUMN IF NOT EXISTS checked_by UUID REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE stocktakes ADD COLUMN IF NOT EXISTS received_by UUID REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE stocktakes ADD COLUMN IF NOT EXISTS handed_over_by UUID REFERENCES staff(id) ON DELETE SET NULL;
`;

async function run() {
  const connectionString = 'postgresql://postgres:postgres@localhost:54322/postgres';
  const client = new Client({ connectionString });
  
  console.log("Connecting to local emulator database (localhost:54322)...");
  try {
    await client.connect();
    console.log("Connected successfully! Running stocktake staff columns migrations...");
    await client.query(query);
    console.log("Migration executed successfully on local database!");
  } catch (err) {
    console.log("Local database migration warning/failure:", err.message);
  } finally {
    await client.end();
  }
}

run();
