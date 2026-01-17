/**
 * Database Migrations for YourScore
 * Handles schema upgrades between versions
 */

/**
 * Migration definitions
 * Each key is the version number, value is a function that performs the migration
 * Migrations run in sequence from oldVersion+1 to newVersion
 */
const migrations = {
  /**
   * Version 1: Initial schema
   * Creates all base object stores
   * Note: This is handled by db.js createStores() on initial creation
   */
  1: (_db, _transaction) => {
    // Initial schema is created by db.js
    // This is here for documentation and future reference
    console.log('Migration v1: Initial schema created by db.js');
  }

  // Future migrations will be added here as:
  // 2: (db, transaction) => { ... },
  // 3: (db, transaction) => { ... },
};

/**
 * Run migrations between versions
 * Called from the onupgradeneeded event in db.js
 * @param {IDBDatabase} db - Database instance
 * @param {IDBTransaction} transaction - Upgrade transaction
 * @param {number} oldVersion - Previous database version
 * @param {number} newVersion - Target database version
 */
function runMigrations(db, transaction, oldVersion, newVersion) {
  console.log(`Running migrations from v${oldVersion} to v${newVersion}`);

  for (let version = oldVersion + 1; version <= newVersion; version++) {
    if (migrations[version]) {
      console.log(`Running migration v${version}...`);
      try {
        migrations[version](db, transaction);
        console.log(`Migration v${version} completed`);
      } catch (error) {
        console.error(`Migration v${version} failed:`, error);
        throw error;
      }
    }
  }
}

/**
 * Get the current migration version
 * @returns {number}
 */
function getCurrentVersion() {
  return Object.keys(migrations).length;
}

export { migrations, runMigrations, getCurrentVersion };
export default runMigrations;
