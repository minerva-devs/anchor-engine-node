import {Pglite} from 'pglite';

const db = new Pglite({uri: process.env.PGLITE_URI || 'sqlite:/tmp/anchor.db'});

async function checkSchema() {
  await db.ready;
  
  // Check all tables
  const tables = await db.all('SELECT name FROM sqlite_master WHERE type="table";');
  console.log("Current tables:", tables.map(t => t.name));
  
  // Check columns in molecules table
  const moleculesColumns = await db.all('PRAGMA table_info(molecules);');
  console.log("\nMolecules table columns:", moleculesColumns.map(c => c.name).join(', '));
  
  // Check if provenance exists in molecules
  const hasProvenanceInMolecules = await db.get('SELECT * FROM molecules WHERE provenance IS NOT NULL LIMIT 1;');
  console.log("Molecules with provenance data:", !!hasProvenanceInMolecules);
  
  // Check columns in atoms table  
  const atomsColumns = await db.all('PRAGMA table_info(atoms);');
  console.log("Atoms table columns:", atomsColumns.map(c => c.name).join(', '));
  
  // Check if provenance exists in atoms
  const hasProvenanceInAtoms = await db.get('SELECT * FROM atoms WHERE provenance IS NOT NULL LIMIT 1;');
  console.log("Atoms with provenance data:", !!hasProvenanceInAtoms);
  
  // Check if compounds table exists and its data
  const compoundsResult = await db.get('SELECT * FROM compounds LIMIT 1;', ['compounds']);
  console.log("\nCompounds table exists:", !!compoundsResult);
  
  if (Array.isArray(compoundsResult)) {
    const compoundsData = await db.all('SELECT * FROM compounds LIMIT 5;');
    console.log("First compound record:", compoundsData[0]);
  } else if (!compoundsResult) {
    console.log("Compounds table does NOT exist");
  }
}

checkSchema().catch(console.error);