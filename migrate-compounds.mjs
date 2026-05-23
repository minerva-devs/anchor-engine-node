import { Pglite } from '@electric-sql/pglite';

const dbPath = process.env.PGLITE_DB_PATH || 'C:/Users/rsbii/.anchor/context_data/anchor.db';

async function migrateCompounds() {
  const db = new Pglite({ uri: `sqlite:${dbPath}` });
  
  await db.ready;
  
  console.log('[Migration] Database path:', dbPath);

  // Step 1: Check if compounds table exists and get all data
  try {
    const result = await db.all('SELECT * FROM compounds;', ['compounds']);
    
    if (!Array.isArray(result) || result.length === 0) {
      console.log('[Migration] No compounds to migrate - table is empty or does not exist');
      return true;
    }

    console.log(`[Migration] Found ${result.length} compounds to migrate`);
    
    // Step 2: Migrate each compound's provenance to molecules
    let migrated = 0;
    for (const c of result) {
      try {
        const molId = `mol_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        // Insert into molecules table with provenance from compound
        await db.run(`
          INSERT INTO molecules (id, source_path, timestamp, molecular_signature, provenance, content, compound_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          molId,
          c.path || '',
          Date.now(),
          c.molecular_signature || `sig_${c.id.substring(0, 8)}`,
          c.provenance || 'internal',
          '', // content is empty (pointer-only architecture)
          c.id // Keep compound_id for compatibility
        ]);
        
        migrated++;
      } catch (e) {
        console.error('[Migration] Error inserting molecule:', e);
      }
    }
    
    if (migrated > 0) {
      console.log(`[Migration] Successfully migrated ${migrated} compounds to molecules table`);
      
      // Step 3: Drop the compounds table
      try {
        await db.run('DROP TABLE compounds;');
        console.log('[Migration] ✅ Compounds table dropped successfully');
      } catch (e) {
        console.error('[Migration] Error dropping compounds table:', e);
        throw e;
      }
    } else {
      // Step 3: Drop the empty compounds table
      try {
        await db.run('DROP TABLE compounds;');
        console.log('[Migration] ✅ Compounds table dropped (was empty)');
      } catch (e) {
        console.error('[Migration] Error dropping compounds table:', e);
        throw e;
      }
    }

  } catch (e) {
    // Table doesn't exist - that's also OK
    if (e.message.includes('does not exist')) {
      console.log('[Migration] Compounds table does not exist - already migrated');
    } else {
      throw e;
    }
  }

  await db.close();
  
  // Step 4: Add provenance column to atoms table if it doesn't exist
  try {
    await db.run('ALTER TABLE atoms ADD COLUMN IF NOT EXISTS provenance TEXT;');
    console.log('[Migration] Added provenance column to atoms table');
  } catch (e) {}

  // Step 5: Add molecular_signature column to atoms table if it doesn't exist
  try {
    await db.run('ALTER TABLE atoms ADD COLUMN IF NOT EXISTS molecular_signature TEXT;');
    console.log('[Migration] Added molecular_signature column to atoms table');
  } catch (e) {}

  // Step 6: Add provenance column to molecules table if it doesn't exist
  try {
    await db.run('ALTER TABLE molecules ADD COLUMN IF NOT EXISTS provenance TEXT;');
    console.log('[Migration] Added provenance column to molecules table');
  } catch (e) {}

  // Step 7: Add molecular_signature column to molecules table if it doesn't exist
  try {
    await db.run('ALTER TABLE molecules ADD COLUMN IF NOT EXISTS molecular_signature TEXT;');
    console.log('[Migration] Added molecular_signature column to molecules table');
  } catch (e) {}

  return true;
}

migrateCompounds()
  .then(() => {
    console.log('[Migration] Migration completed successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Migration] Migration failed:', err);
    process.exit(1);
  });