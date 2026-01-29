import fs from 'fs';
import path from 'path';

describe('shadcn/ui Setup', () => {
  describe('components.json configuration', () => {
    it('should exist', () => {
      const configPath = path.join(process.cwd(), 'components.json');
      expect(fs.existsSync(configPath)).toBe(true);
    });

    it('should have correct configuration', () => {
      const configPath = path.join(process.cwd(), 'components.json');
      const configContent = fs.readFileSync(configPath, 'utf-8');
      
      // Ensure the file is not empty
      expect(configContent.trim().length).toBeGreaterThan(0);
      
      const config = JSON.parse(configContent);

      expect(config.style).toBe('default');
      expect(config.rsc).toBe(true);
      expect(config.tsx).toBe(true);
      expect(config.tailwind).toBeDefined();
      expect(config.tailwind.config).toBe('tailwind.config.ts');
      expect(config.tailwind.css).toBe('src/app/globals.css');
      expect(config.tailwind.cssVariables).toBe(true);
      expect(config.aliases).toBeDefined();
      expect(config.aliases.components).toBe('@/components');
      expect(config.aliases.utils).toBe('@/lib/utils');
      expect(config.aliases.ui).toBe('@/components/ui');
    });
  });

  describe('Component files location', () => {
    it('should have Button component in correct location', () => {
      const buttonPath = path.join(process.cwd(), 'src/components/ui/button.tsx');
      expect(fs.existsSync(buttonPath)).toBe(true);
    });

    it('should have utils file in correct location', () => {
      const utilsPath = path.join(process.cwd(), 'src/lib/utils.ts');
      expect(fs.existsSync(utilsPath)).toBe(true);
    });
  });

  describe('Utils function', () => {
    it('should export cn function', () => {
      const { cn } = require('../src/lib/utils');
      expect(typeof cn).toBe('function');
    });

    it('should merge classes correctly', () => {
      const { cn } = require('../src/lib/utils');
      const result = cn('px-2 py-1', 'px-4');
      // tailwind-merge should keep only the last px value
      expect(result).toContain('px-4');
      expect(result).toContain('py-1');
    });
  });
});
