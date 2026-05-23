import { db } from './engine/src/core/db.js';
import { config } from './engine/src/config/index.js';

async function migrateCompoundsTable() {
  console.log('[Migration] Starting compounds table removal migration...');

  // First, check if compounds table exists (it shouldn't in a fresh DB)
  const tables = await db.run('SELECT name FROM sqlite_master WHERE type="table";');
  const hasCompounds = tables.some(t => t.name === 'compounds');
  
  console.log('[Migration] Current tables:', tables.map(t => t.name).join(', '));
  console.log('[Migration] Compounds table exists:', hasCompounds);

  if (!hasCompounds) {
    console.log('[Migration] ✅ Compounds table does not exist - migration already complete or DB is fresh');
    return true;
  }

  // Check compounds table data before dropping
  const compounds = await db.run('SELECT * FROM compounds;', ['compounds']);
  console.log('[Migration] Found compounds table with', compounds.length, 'records');

  if (compounds.length === 0) {
    console.log('[Migration] ✅ Compounds table is empty - safe to drop');
    try {
      await db.run('DROP TABLE compounds;');
      console.log('[Migration] ✅ Compounds table dropped successfully');
      return true;
    } catch (e) {
      console.error('[Migration] Error dropping compounds table:', e);
      throw e;
    }
  }

  // Data migration: move compound data to molecules/atoms
  console.log('[Migration] Migrating', compounds.length, 'compounds to molecules/atoms tables...');

  for (const c of compounds) {
    const signature = c.molecular_signature || generateSignature(c.id);
    
    try {
      // Check if molecule already exists with same path+signature
      const existingMol = await db.run(
        'SELECT id FROM molecules WHERE source_path = $1 AND molecular_signature = $2;',
        [c.path, signature]
      );

      if (!existingMol) {
        // Insert into molecules table
        const molId = `mol_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        await db.run(`
          INSERT INTO molecules (id, source_path, timestamp, molecular_signature, provenance, content)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          molId,
          c.path,
          Date.now(),
          signature,
          c.provenance || 'internal',
          '' // No content storage - pointer only (Standard 051)
        ]);
        
        console.log(`[Migration] Migrated compound ${c.id} to molecules table`);
      } else {
        console.log(`[Migration] Compound ${c.id} already has molecule record, skipping`);
      }

    } catch (e) {
      console.error('[Migration] Error migrating compound', c.id, ':', e.message);
    }
  }

  // Drop compounds table after migration
  try {
    await db.run('DROP TABLE compounds;');
    console.log('[Migration] ✅ Compounds table dropped successfully');
  } catch (e) {
    console.error('[Migration] Error dropping compounds table:', e);
    throw e;
  }

  return true;
}

function generateSignature(id, path) {
  // Simple signature generation - combine ID and path for compound-level identification
  const combined = id + path;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return 'sig_' + Math.abs(hash).toString(16);
}

// Run migration
migrateCompoundsTable()
  .then(() => {
    console.log('[Migration] Migration completed successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Migration] Migration failed:', err);
    process.exit(1);
  });