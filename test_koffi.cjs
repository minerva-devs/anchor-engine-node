const koffi = require('koffi');
const path = require('path');

const dllPath = path.join(__dirname, 'packages', 'anchor-core', 'lib', 'win-x64', 'anchor_core.dll');
console.log('Loading DLL from:', dllPath);

try {
    const lib = koffi.load(dllPath);
    console.log('DLL loaded successfully');
    
    // Try to get functions
    try {
        const beginTx = lib.func('database_begin_transaction', 'bool', ['void *']);
        console.log('database_begin_transaction found');
    } catch (e) {
        console.log('database_begin_transaction not found:', e.message);
    }
    
    try {
        const createDb = lib.func('database_create', 'void *', ['string']);
        console.log('database_create found');
    } catch (e) {
        console.log('database_create not found:', e.message);
    }
    
} catch (e) {
    console.error('Failed to load DLL:', e);
}