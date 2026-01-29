import * as fs from 'fs';
import * as path from 'path';

describe('TypeScript Configuration', () => {
  describe('tsconfig.json', () => {
    let tsconfig: any;

    beforeAll(() => {
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
      const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf-8');
      tsconfig = JSON.parse(tsconfigContent);
    });

    it('should exist', () => {
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
      expect(fs.existsSync(tsconfigPath)).toBe(true);
    });

    it('should have strict mode enabled', () => {
      expect(tsconfig.compilerOptions.strict).toBe(true);
    });

    it('should target ES2017 or higher', () => {
      const target = tsconfig.compilerOptions.target;
      const validTargets = ['ES2017', 'ES2018', 'ES2019', 'ES2020', 'ES2021', 'ES2022', 'ESNext'];
      expect(validTargets).toContain(target);
    });

    it('should include required libraries', () => {
      expect(tsconfig.compilerOptions.lib).toContain('dom');
      expect(tsconfig.compilerOptions.lib).toContain('dom.iterable');
      expect(tsconfig.compilerOptions.lib).toContain('esnext');
    });

    it('should have module resolution set to bundler', () => {
      expect(tsconfig.compilerOptions.moduleResolution).toBe('bundler');
    });

    it('should have jsx configured', () => {
      expect(tsconfig.compilerOptions.jsx).toBeDefined();
    });

    it('should have path aliases configured', () => {
      expect(tsconfig.compilerOptions.paths).toBeDefined();
      expect(tsconfig.compilerOptions.paths['@/*']).toEqual(['./src/*']);
    });

    it('should have Next.js plugin configured', () => {
      expect(tsconfig.compilerOptions.plugins).toBeDefined();
      const hasNextPlugin = tsconfig.compilerOptions.plugins.some(
        (plugin: any) => plugin.name === 'next'
      );
      expect(hasNextPlugin).toBe(true);
    });

    it('should have isolatedModules enabled', () => {
      expect(tsconfig.compilerOptions.isolatedModules).toBe(true);
    });

    it('should have esModuleInterop enabled', () => {
      expect(tsconfig.compilerOptions.esModuleInterop).toBe(true);
    });

    it('should exclude node_modules', () => {
      expect(tsconfig.exclude).toContain('node_modules');
    });
  });

  describe('next.config.ts', () => {
    it('should exist', () => {
      const nextConfigPath = path.join(process.cwd(), 'next.config.ts');
      expect(fs.existsSync(nextConfigPath)).toBe(true);
    });

    it('should have proper TypeScript structure', () => {
      const nextConfigPath = path.join(process.cwd(), 'next.config.ts');
      const nextConfigContent = fs.readFileSync(nextConfigPath, 'utf-8');
      
      // Check for TypeScript import
      expect(nextConfigContent).toContain('NextConfig');
      
      // Check for config export
      expect(nextConfigContent).toContain('export default');
    });
  });
});
