
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mocks must be defined before imports
const mockNativeInstance = {
  searchAtoms: jest.fn(),
  insertAtom: jest.fn(),
  getStats: jest.fn(),
  wipeAllData: jest.fn(),
  close: jest.fn(),
};

const MockNativeDatabase = jest.fn(() => mockNativeInstance);

jest.unstable_mockModule('@anchor-engine/native', () => ({
  Database: MockNativeDatabase,
}));

jest.unstable_mockModule('fs', () => ({
  default: {
    existsSync: jest.fn().mockReturnValue(true),
    mkdirSync: jest.fn(),
  },
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
}));

// Dynamic imports
const { Database } = await import('../../src/core/sqlite-database.js');
const fsModule = await import('fs');
const fs = fsModule.default || fsModule;

describe('SQLite Database Adapter', () => {
  let db;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset fs mocks
    if (fs.existsSync.mockReturnValue) {
        fs.existsSync.mockReturnValue(true);
    }
    if (fs.mkdirSync.mockReturnValue) {
        fs.mkdirSync.mockReturnValue(undefined);
    }

    // Reset native mock calls
    MockNativeDatabase.mockClear();

    // Reset instance method mocks
    Object.values(mockNativeInstance).forEach(fn => fn.mockReset());

    // Ensure constructor returns our mock instance
    MockNativeDatabase.mockImplementation(() => mockNativeInstance);
  });

  test('should initialize with default config (in-memory)', async () => {
    db = new Database();
    await db.init();

    expect(MockNativeDatabase).toHaveBeenCalledWith();
    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });

  test('should initialize with file path and create directory', async () => {
    const dbPath = '/tmp/test/db.sqlite';
    fs.existsSync.mockReturnValue(false);

    db = new Database({ path: dbPath });
    await db.init();

    expect(MockNativeDatabase).toHaveBeenCalledWith(dbPath);
    expect(fs.mkdirSync).toHaveBeenCalledWith('/tmp/test', { recursive: true });
  });

  test('should handle SELECT queries via searchAtoms', async () => {
    db = new Database({ inMemory: true });
    await db.init();

    const mockResults = [{ id: 1, content: 'test' }];
    mockNativeInstance.searchAtoms.mockReturnValue(mockResults);

    const result = await db.run('SELECT * FROM atoms WHERE content MATCH "test"');

    expect(mockNativeInstance.searchAtoms).toHaveBeenCalled();
    expect(result.rows).toEqual(mockResults);
  });

  test('should throw error for INSERT/UPDATE/DELETE queries via run', async () => {
    db = new Database({ inMemory: true });
    await db.init();

    await expect(db.run('INSERT INTO atoms VALUES (...)'))
      .rejects.toThrow('Write operations not implemented');

    await expect(db.run('UPDATE atoms SET ...'))
      .rejects.toThrow('Write operations not implemented');

    await expect(db.run('DELETE FROM atoms WHERE ...'))
      .rejects.toThrow('Write operations not implemented');
  });

  test('should handle DDL queries gracefully (no-op)', async () => {
    db = new Database({ inMemory: true });
    await db.init();

    const result = await db.run('CREATE TABLE test (id int)');
    expect(result.rows).toEqual([]);
    expect(mockNativeInstance.searchAtoms).not.toHaveBeenCalled();
    expect(mockNativeInstance.insertAtom).not.toHaveBeenCalled();
  });

  test('should delegate insertAtom to native DB', async () => {
    db = new Database({ inMemory: true });
    await db.init();

    const atom = { content: 'test atom', simhash: '123456789' };
    mockNativeInstance.insertAtom.mockReturnValue(123);

    const id = await db.insertAtom(atom);

    expect(mockNativeInstance.insertAtom).toHaveBeenCalledWith(expect.objectContaining({
      content: 'test atom',
      simhash: expect.any(BigInt)
    }));
    expect(id).toBe(123);
  });

  test('should delegate searchAtoms to native DB', async () => {
    db = new Database({ inMemory: true });
    await db.init();

    const query = 'test';
    const limit = 10;
    const mockResults = [{ id: 1 }];
    mockNativeInstance.searchAtoms.mockReturnValue(mockResults);

    const results = await db.searchAtoms(query, limit);

    expect(mockNativeInstance.searchAtoms).toHaveBeenCalledWith(query, limit);
    expect(results).toBe(mockResults);
  });

  test('should delegate getStats to native DB', async () => {
    db = new Database({ inMemory: true });
    await db.init();

    const stats = { atomCount: 100 };
    mockNativeInstance.getStats.mockReturnValue(stats);

    const result = await db.getStats();

    expect(mockNativeInstance.getStats).toHaveBeenCalled();
    expect(result).toBe(stats);
  });

  test('should delegate wipeAllData to native DB', async () => {
    db = new Database({ inMemory: true });
    await db.init();

    await db.wipeAllData();

    expect(mockNativeInstance.wipeAllData).toHaveBeenCalled();
  });

  test('should delegate close to native DB', async () => {
    db = new Database({ inMemory: true });
    await db.init();

    await db.close();

    expect(mockNativeInstance.close).toHaveBeenCalled();
  });
});
