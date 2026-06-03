## Summary of Changes for Distiller Fix

### Files Modified:

1. **engine/src/services/distillation/radial-distiller-v2.ts**
   - Added `max_molecules?: number` to RadialDistillRequest interface
   - Added `timeout_seconds?: number` to RadialDistillRequest interface  
   - Added `include_code?: boolean` to RadialDistillRequest interface

2. **engine/src/routes/v1/memory.ts**
   - Fixed streaming mode to use `body.max_molecules || body.radius || 5` (was missing max_molecules)
   - Changed timeout from hardcoded 120s to user-provided `timeout_seconds` with 60s default
   - Removed corpus-mode workaround that prevented proper seeding

3. **engine/src/services/ingest/github-ingest-service.ts** (from previous commit)
   - Fixed import extensions (.ts → .js for NodeNext module resolution)
   - Fixed `.tson()` → `.json()`, `.tsON.parse` → `JSON.parse()`
   - Removed duplicate entries from LANGUAGE_MAP

4. **scripts/build.ts** (new file)
   - Cross-platform build script using `pnpm exec tsc`
   - Cleans engine/dist/ and compiles TypeScript to JavaScript

### Issues Fixed:

1. **Timeout Errors** - API now uses user-provided `timeout_seconds` instead of hardcoded 120s
2. **Missing max_molecules** - Now respects the limit in collectBlocksFromMolecules() 
3. **Corpus mode bug** - Removed workaround that ignored seed parameters
4. **Import extensions** - NodeNext module resolution requires explicit .js extensions

### Testing:

Build completes successfully with `pnpm build`
Engine starts properly with `pnpm start`
