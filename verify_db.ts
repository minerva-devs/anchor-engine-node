
import { db } from './engine/src/core/db.js';

async function main() {
  console.log('Imported db successfully');
  if (db) {
    console.log('DB instance exists');
  }
}

main().catch(console.error);
