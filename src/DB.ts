import sqlite3 from 'sqlite3'
import sql from 'sql-template-tag'
import { open, type Database } from 'sqlite'
import consola from 'consola';

interface createTableOptions { table: string, schema: string }
interface prepareJSONOptions { table: string, field: string }
interface insertJSONOptions { table: string, field: string, json: Record<any, unknown> | Array<unknown> }

interface TableData<
  T extends Record<string, unknown> | Array<unknown> = Record<string, unknown> | Array<unknown>
> {
  schema: string;
  data: T;
}

export default class DatabaseManager {
  public debug = false;
  public db: Database<sqlite3.Database, sqlite3.Statement>
  public tables = new Map<string, TableData>();

  private schemas = new Map([
    ['cauldron' as const, `
CREATE TABLE IF NOT EXISTS "cauldron" (
    "version"	TEXT NOT NULL COLLATE RTRIM,
    PRIMARY KEY("version")
);`],
    ['dependencies' as const, `
CREATE TABLE IF NOT EXISTS "dependencies" (
    "id"	INTEGER,
    "name"	TEXT NOT NULL UNIQUE,
    "version"	TEXT,
    PRIMARY KEY("id" AUTOINCREMENT)
);`],
    ['familiars' as const, `
CREATE TABLE IF NOT EXISTS "familiars" (
    "id"	integer,
    "name"	TEXT NOT NULL UNIQUE COLLATE RTRIM,
    "display_name"	TEXT COLLATE RTRIM,
    "familiar_type"	TEXT NOT NULL COLLATE RTRIM,
    "unlocked"	INTEGER NOT NULL DEFAULT 0,
    "cow_src_ext"	INTEGER DEFAULT 0,
    "nickname"	TEXT COLLATE NOCASE,
    PRIMARY KEY("id" AUTOINCREMENT)
);`],
    ['unlocked_familiars' as const, `CREATE VIEW IF NOT EXISTS "unlocked_familiars" AS SELECT * FROM familiars WHERE unlocked = 1;`]
  ]);
  private familiarSchemas = [
    `INSERT INTO "familiars" ("id", "name", "display_name", "familiar_type", "unlocked", "cow_src_ext", "nickname") VALUES ('1', 'koala', NULL, 'Woodland-Cute', '1', NULL, NULL)
      ON CONFLICT("id") DO UPDATE SET "name"=excluded."name", "display_name"=excluded."display_name", "familiar_type"=excluded."familiar_type", "unlocked"=excluded."unlocked", "cow_src_ext"=excluded."cow_src_ext", "nickname"=excluded."nickname";`,
    `INSERT INTO "familiars"("id", "name", "display_name", "familiar_type", "unlocked", "cow_src_ext", "nickname") VALUES('2', 'hellokitty', 'Hello Kitty', 'Mascot-Cute', '1', NULL, NULL)
      ON CONFLICT("id") DO UPDATE SET "name"=excluded."name", "display_name"=excluded."display_name", "familiar_type"=excluded."familiar_type", "unlocked"=excluded."unlocked", "cow_src_ext"=excluded."cow_src_ext", "nickname"=excluded."nickname";`,
    `INSERT INTO "familiars"("id", "name", "display_name", "familiar_type", "unlocked", "cow_src_ext", "nickname") VALUES('3', 'suse', NULL, 'Jungle-Cute', '1', NULL, NULL)
      ON CONFLICT("id") DO UPDATE SET "name"=excluded."name", "display_name"=excluded."display_name", "familiar_type"=excluded."familiar_type", "unlocked"=excluded."unlocked", "cow_src_ext"=excluded."cow_src_ext", "nickname"=excluded."nickname";`,
    `INSERT INTO "familiars"("id", "name", "display_name", "familiar_type", "unlocked", "cow_src_ext", "nickname") VALUES('4', 'tux', NULL, 'Artic-Cute', '1', NULL, NULL)
      ON CONFLICT("id") DO UPDATE SET "name"=excluded."name", "display_name"=excluded."display_name", "familiar_type"=excluded."familiar_type", "unlocked"=excluded."unlocked", "cow_src_ext"=excluded."cow_src_ext", "nickname"=excluded."nickname";`,
    `INSERT INTO "familiars"("id", "name", "display_name", "familiar_type", "unlocked", "cow_src_ext", "nickname") VALUES('5', 'cock', 'Rooster', 'Farm', '1', NULL, NULL)
      ON CONFLICT("id") DO UPDATE SET "name"=excluded."name", "display_name"=excluded."display_name", "familiar_type"=excluded."familiar_type", "unlocked"=excluded."unlocked", "cow_src_ext"=excluded."cow_src_ext", "nickname"=excluded."nickname";`,
    `INSERT INTO "familiars"("id", "name", "display_name", "familiar_type", "unlocked", "cow_src_ext", "nickname") VALUES('6', 'duck', NULL, 'Farm-Urban-Cute', '1', NULL, NULL)
      ON CONFLICT("id") DO UPDATE SET "name"=excluded."name", "display_name"=excluded."display_name", "familiar_type"=excluded."familiar_type", "unlocked"=excluded."unlocked", "cow_src_ext"=excluded."cow_src_ext", "nickname"=excluded."nickname";`,
    `INSERT INTO "familiars"("id", "name", "display_name", "familiar_type", "unlocked", "cow_src_ext", "nickname") VALUES('7', 'trogdor', NULL, 'Meme', '1', '1', NULL)
      ON CONFLICT("id") DO UPDATE SET "name"=excluded."name", "display_name"=excluded."display_name", "familiar_type"=excluded."familiar_type", "unlocked"=excluded."unlocked", "cow_src_ext"=excluded."cow_src_ext", "nickname"=excluded."nickname";`
  ]

  private constructor({ db, debug }: { db: Database<sqlite3.Database, sqlite3.Statement>, debug?: boolean }) {
    this.db = db;
    this.debug = debug ?? false;
  }

  /** Loads the Tables names, schema, and current data */
  private async loadTableMetadata() {
    try {
      // Step 1: Load table names and schema
      const nameAndSchemaResponse = await this.db.all<{ name: string, sql: string }[]>(`
      SELECT name, sql FROM sqlite_master WHERE type='table'
    `);

      // Initialize a structure to hold the table data
      this.tables = new Map();

      // Step 2: Load data for each table
      for (const { name, sql: schema } of nameAndSchemaResponse) {
        // Fetch all rows from the table
        const rows = await this.db.all<Record<any, unknown>[]>(`SELECT * FROM "${name}"`);

        // The rows are already in the desired format (an array of objects),
        // so you can directly use them without needing to parse JSON.
        const data = rows;

        // Step 3: Store the name, schema, and data in the map
        this.tables.set(name, { schema, data });
      }

      if (this.debug) consola.success('Table metadata and data loaded');
    } catch (error) {
      console.error('[DB]', error);
    }
  }

  public async refreshTableSchema() {
    for await (const [table, schema] of this.schemas) {
      await this.db.exec(schema);
      if (this.debug) consola.success(`Updated ${table} schema`);

      this.tables.set(table, { schema, data: [] });
    }
    for await (const familiarSchema of this.familiarSchemas) {
      await this.db.exec(familiarSchema);
      if (this.debug) consola.success(`Updated familiar schema`);
    }

    await this.loadTableMetadata();

    return this.tables;
  }

  public toString(pretty = true) {
    return JSON.stringify(
      Object.fromEntries(this.tables),
      null,
      pretty ? 2 : undefined
    );
  }

  public async createTable({ table, schema }: createTableOptions) {
    try {
      if (this.tables.has(table)) {
        console.error(`Table ${table} already exists`);
        return;
      }

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS ${table} (
        id INTEGER PRIMARY KEY,
        ${schema}
      )`);

      if (this.debug) consola.success(`Table ${table} created`);

      // Update the table metadata
      await this.loadTableMetadata();

      return this.tables.get(table);
    } catch (error) { console.error('[DB]', error) }
  }

  private async prepareJSON({ table, field }: prepareJSONOptions) {
    return this.db.prepare(sql`INSERT INTO ${table} (${field}) VALUES (?)`)
  }

  public async insertJSON({ json, table, field }: insertJSONOptions) {
    try {
      const statement = await this.prepareJSON({ table, field })
      await statement.bind([JSON.stringify(json)])
      return await statement.run()
    } catch (error) { console.error('[DB]', error) }
  }

  public async close() {
    try {
      await this.db.close();
    } catch (error) {
      console.error('[DB]', error)
    } finally {
      console.info('Database closed');
    }
  }

  public static async init(databasePath: string, debug = false) {
    try {
      // Move into verbose mode
      if (debug) sqlite3.verbose();
      // Create connection to DB with cache
      const db = await open({ filename: databasePath, driver: sqlite3.cached.Database });
      // Add a listener for errors
      db.on('error', (err: unknown) => console.error('Database error', err));
      if (debug) db.on('trace', (s: unknown) => console.log('SQL Executed:', s));
      // Return a new instance of Database Manager
      const DB = new DatabaseManager({ db, debug });
      await DB.loadTableMetadata();
      return DB;
    } catch (error) { console.error('[DB]', error) }
  }
}
