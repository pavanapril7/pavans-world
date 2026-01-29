import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

describe('Database Migration Tests', () => {
  const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');

  describe('Migration Files', () => {
    it('should have migrations directory created', () => {
      expect(fs.existsSync(migrationsDir)).toBe(true);
    });

    it('should have at least one migration file', () => {
      const migrations = fs.readdirSync(migrationsDir);
      const migrationFolders = migrations.filter(item => {
        const itemPath = path.join(migrationsDir, item);
        return fs.statSync(itemPath).isDirectory();
      });
      
      expect(migrationFolders.length).toBeGreaterThan(0);
    });

    it('should have migration.sql file in migration folder', () => {
      const migrations = fs.readdirSync(migrationsDir);
      const migrationFolders = migrations.filter(item => {
        const itemPath = path.join(migrationsDir, item);
        return fs.statSync(itemPath).isDirectory();
      });

      expect(migrationFolders.length).toBeGreaterThan(0);
      
      const firstMigration = migrationFolders[0];
      const migrationSqlPath = path.join(migrationsDir, firstMigration, 'migration.sql');
      
      expect(fs.existsSync(migrationSqlPath)).toBe(true);
    });

    it('should have migration SQL that creates User table', () => {
      const migrations = fs.readdirSync(migrationsDir);
      const migrationFolders = migrations.filter(item => {
        const itemPath = path.join(migrationsDir, item);
        return fs.statSync(itemPath).isDirectory();
      });

      const firstMigration = migrationFolders[0];
      const migrationSqlPath = path.join(migrationsDir, firstMigration, 'migration.sql');
      const migrationContent = fs.readFileSync(migrationSqlPath, 'utf-8');
      
      expect(migrationContent).toContain('CREATE TABLE');
      expect(migrationContent.toLowerCase()).toContain('user');
    });
  });

  describe('Database Schema Validation', () => {
    let prisma: PrismaClient;
    let pool: Pool;

    beforeAll(() => {
      pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const adapter = new PrismaPg(pool);
      prisma = new PrismaClient({ adapter });
    });

    afterAll(async () => {
      await prisma.$disconnect();
      await pool.end();
    });

    it('should be able to connect to database', async () => {
      await prisma.$connect();
      const result = await prisma.$queryRaw`SELECT 1 as connected`;
      expect(result).toBeDefined();
      
      // Debug: Check which database we're connected to
      const dbInfo = await prisma.$queryRaw<Array<{
        current_database: string;
      }>>`SELECT current_database()`;
      console.log('Connected to database:', dbInfo[0].current_database);
    });

    it('should have User table with correct columns', async () => {
      // First, let's verify what tables exist
      const tables = await prisma.$queryRaw<Array<{
        table_name: string;
      }>>`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name IN ('User', 'users')
        ORDER BY table_name;
      `;

      // Either User or users table should exist (depending on migration)
      const tableNames = tables.map(t => t.table_name);
      const tableName = tableNames.find(t => t === 'User' || t === 'users');
      expect(tableName).toBeDefined();

      // Query the information schema to verify table structure
      const columns = await prisma.$queryRaw<Array<{
        column_name: string;
        data_type: string;
        is_nullable: string;
      }>>`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${tableName}
        ORDER BY ordinal_position;
      `;

      const columnNames = columns.map(col => col.column_name);
      
      expect(columnNames.length).toBeGreaterThan(0);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('email');
      expect(columnNames).toContain('firstName');
      expect(columnNames).toContain('lastName');
      expect(columnNames).toContain('createdAt');
      expect(columnNames).toContain('updatedAt');
    });

    it('should have unique constraint on email column', async () => {
      // Check for User or users table
      const tables = await prisma.$queryRaw<Array<{
        table_name: string;
      }>>`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name IN ('User', 'users')
        ORDER BY table_name;
      `;
      
      const tableName = tables.map(t => t.table_name).find(t => t === 'User' || t === 'users');
      
      // Check for unique indexes on email column
      const indexes = await prisma.$queryRaw<Array<{
        indexname: string;
        indexdef: string;
      }>>`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = ${tableName}
          AND indexdef LIKE '%email%'
          AND indexdef LIKE '%UNIQUE%';
      `;

      expect(indexes.length).toBeGreaterThan(0);
    });

    it('should have primary key on id column', async () => {
      // Check for User or users table
      const tables = await prisma.$queryRaw<Array<{
        table_name: string;
      }>>`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name IN ('User', 'users')
        ORDER BY table_name;
      `;
      
      const tableName = tables.map(t => t.table_name).find(t => t === 'User' || t === 'users');
      
      const constraints = await prisma.$queryRaw<Array<{
        constraint_name: string;
        constraint_type: string;
      }>>`
        SELECT tc.constraint_name, tc.constraint_type
        FROM information_schema.table_constraints tc
        WHERE tc.table_schema = 'public' 
          AND tc.table_name = ${tableName}
          AND tc.constraint_type = 'PRIMARY KEY';
      `;

      expect(constraints.length).toBe(1);
    });
  });
});
