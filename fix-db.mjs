// This script will be run after the server starts to drop compounds table and add provenance columns
import { exec } from 'child_process';

exec('cd "C:\\Users\\rsbii\\Projects\\anchor-engine-node" && node scripts/run-migration.mjs 2>&1', (error, stdout, stderr) => {
  if (error) {
    console.error('Error running migration:', error);
  } else {
    console.log('Migration completed:', stdout);
  }
  process.exit(0);
});