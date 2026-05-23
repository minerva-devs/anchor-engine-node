const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://localhost/anchor' });

async function checkDatabase() {
  try {
    await client.connect();
    
    // Check which tables exist
    const result = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name IN ('compounds', 'molecules', 'atoms')"
    );
    
    console.log('Tables found:', result.rows.map(r => r.table_name).join(', ') || 'none');
    
    // Check compounds table specifically
    const compoundsExists = await client.query(
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'compounds')"
    );
    console.log('Compounds exists:', compoundsExists.rows[0].exists);
    
    if (compoundsExists.rows[0].exists) {
      const count = await client.query('SELECT COUNT(*) as count FROM compounds');
      console.log('Compounds record count:', count.rows[0].count);
      
      // Check columns in compounds
      const compoundColumns = await client.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'compounds'"
      );
      console.log('Compounds columns:', compoundColumns.rows.map(r => `${r.column_name}(${r.data_type})`).join(', '));
    } else {
      console.log('Compounds table does not exist - already removed');
    }
    
    // Check molecules table structure
    const moleculesResult = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'molecules'"
    );
    console.log('Molecules columns:', moleculesResult.rows.map(r => `${r.column_name}(${r.data_type})`).join(', '));
    
    // Check atoms table structure
    const atomsResult = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'atoms'"
    );
    console.log('Atoms columns:', atomsResult.rows.map(r => `${r.column_name}(${r.data_type})`).join(', '));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkDatabase();