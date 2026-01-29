import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';


describe('Prisma Setup', () => {
  describe('schema.prisma configuration', () => {
    it('should have schema.prisma file', () => {
      const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
      expect(fs.existsSync(schemaPath)).toBe(true);
    });

    it('should have correct generator configuration', () => {
      const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
      const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
      
      expect(schemaContent).toContain('generator client');
      expect(schemaContent).toContain('provider = "prisma-client-js"');
    });

    it('should have correct datasource configuration', () => {
      const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
      const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
      
      expect(schemaContent).toContain('datasource db');
      expect(schemaContent).toContain('provider = "postgresql"');
    });

    it('should have User model defined', () => {
      const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
      const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
      
      expect(schemaContent).toContain('model User');
      expect(schemaContent).toContain('id');
      expect(schemaContent).toContain('email');
      expect(schemaContent).toContain('name');
      expect(schemaContent).toContain('createdAt');
      expect(schemaContent).toContain('updatedAt');
    });
  });

  describe('Prisma client singleton', () => {
    it('should have prisma.ts file in src/lib', () => {
      const prismaClientPath = path.join(process.cwd(), 'src', 'lib', 'prisma.ts');
      expect(fs.existsSync(prismaClientPath)).toBe(true);
    });

    it('should export prisma client instance', () => {
      const { prisma } = require('../src/lib/prisma');
      expect(prisma).toBeDefined();
      // Verify it has expected Prisma client methods
      expect(typeof prisma.$connect).toBe('function');
      expect(typeof prisma.$disconnect).toBe('function');
      expect(typeof prisma.$transaction).toBe('function');
    });

    it('should be a singleton (same instance on multiple imports)', () => {
      // Clear the require cache to test singleton behavior
      const prismaPath = path.join(process.cwd(), 'src', 'lib', 'prisma.ts');
      delete require.cache[require.resolve('../src/lib/prisma')];
      
      const { prisma: prisma1 } = require('../src/lib/prisma');
      const { prisma: prisma2 } = require('../src/lib/prisma');
      
      expect(prisma1).toBe(prisma2);
    });
  });

  describe('Generated Prisma Client', () => {
    it('should have type-safe User model methods', () => {
      const { prisma } = require('../src/lib/prisma');
      
      // Check that the User model exists with expected methods
      expect(prisma.user).toBeDefined();
      expect(typeof prisma.user.findMany).toBe('function');
      expect(typeof prisma.user.findUnique).toBe('function');
      expect(typeof prisma.user.create).toBe('function');
      expect(typeof prisma.user.update).toBe('function');
      expect(typeof prisma.user.delete).toBe('function');
    });
  });

  describe('Environment variables', () => {
    it('should have DATABASE_URL in .env file', () => {
      const envPath = path.join(process.cwd(), '.env');
      expect(fs.existsSync(envPath)).toBe(true);
      
      const envContent = fs.readFileSync(envPath, 'utf-8');
      expect(envContent).toContain('DATABASE_URL');
    });

    it('should have .env.example file with DATABASE_URL', () => {
      const envExamplePath = path.join(process.cwd(), '.env.example');
      expect(fs.existsSync(envExamplePath)).toBe(true);
      
      const envExampleContent = fs.readFileSync(envExamplePath, 'utf-8');
      expect(envExampleContent).toContain('DATABASE_URL');
    });

    it('should have prisma.config.ts with datasource configuration', () => {
      const configPath = path.join(process.cwd(), 'prisma.config.ts');
      expect(fs.existsSync(configPath)).toBe(true);
      
      const configContent = fs.readFileSync(configPath, 'utf-8');
      expect(configContent).toContain('datasource');
      expect(configContent).toContain('DATABASE_URL');
    });
  });
});
