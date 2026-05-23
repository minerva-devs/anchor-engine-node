import { db } from './engine/dist/core/db.js';

async function checkDbState() {
    await db.init();
    
    console.log('=== Database Schema State ===\n');
    
    // Check if compounds table exists
    const compoundsCheck = await db.run(
        "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'compounds'",
        []
    );
    console.log(`Compounds table exists: ${compoundsCheck.rows[0].count > 0 ? 'YES' : 'NO (dropped or never created)'}`);
    
    // Check atoms table structure
    const atomsCols = await db.run(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'atoms' ORDER BY ordinal_position",
        []
    );
    console.log('\nAtoms table columns:');
    atomsCols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
    
    // Check molecules table structure
    const moleculesCols = await db.run(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'molecules' ORDER BY ordinal_position",
        []
    );
    console.log('\nMolecules table columns:');
    moleculesCols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
    
    // Count records
    const atomsCount = await db.run("SELECT COUNT(*) as count FROM atoms", []);
    const moleculesCount = await db.run("SELECT COUNT(*) as count FROM molecules", []);
    console.log(`\nAtoms record count: ${atomsCount.rows[0].count}`);
    console.log(`Molecules record count: ${moleculesCount.rows[0].count}`);
    
    // Check provenance in atoms
    const atomsProvenance = await db.run(
        "SELECT COUNT(*) as total, COUNT(provenance) as with_provenance FROM atoms",
        []
    );
    console.log(`\nAtoms with provenance: ${atomsProvenance.rows[0].with_provenance}/${atomsProvenance.rows[0].total}`);
    
    // Check provenance in molecules
    const moleculesProvenance = await db.run(
        "SELECT COUNT(*) as total, COUNT(provenance) as with_provenance FROM molecules",
        []
    );
    console.log(`Molecules with provenance: ${moleculesProvenance.rows[0].with_provenance}/${moleculesProvenance.rows[0].total}`);
    
    // Check molecular_signature in molecules
    const sigCheck = await db.run(
        "SELECT COUNT(*) as total, COUNT(molecular_signature) as with_signature FROM molecules",
        []
    );
    console.log(`Molecules with molecular_signature: ${sigCheck.rows[0].with_signature}/${sigCheck.rows[0].total}`);
    
    // Check for orphaned compound_id references in atoms
    const orphanedAtoms = await db.run(
        "SELECT COUNT(*) as count FROM atoms WHERE compound_id IS NOT NULL AND compound_id != ''",
        []
    );
    console.log(`\nAtoms with compound_id reference: ${orphanedAtoms.rows[0].count}`);
    
    // Check for orphaned compound_id references in molecules
    const orphanedMolecules = await db.run(
        "SELECT COUNT(*) as count FROM molecules WHERE compound_id IS NOT NULL AND compound_id != ''",
        []
    );
    console.log(`Molecules with compound_id reference: ${orphanedMolecules.rows[0].count}`);
    
    // Show sample atom record
    const sampleAtom = await db.run("SELECT * FROM atoms LIMIT 1", []);
    if (sampleAtom.rows.length > 0) {
        console.log('\nSample atom record:', JSON.stringify(sampleAtom.rows[0], null, 2));
    }
    
    // Show sample molecule record
    const sampleMol = await db.run("SELECT * FROM molecules LIMIT 1", []);
    if (sampleMol.rows.length > 0) {
        console.log('Sample molecule record:', JSON.stringify(sampleMol.rows[0], null, 2));
    }
    
    process.exit(0);
}

checkDbState().catch(e => {
    console.error("Error:", e.message);
    process.exit(1);
});