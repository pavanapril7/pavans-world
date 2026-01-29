import fs from 'fs';
import path from 'path';

describe('Project Structure', () => {
  describe('Directory Structure', () => {
    const requiredDirectories = [
      'src/components',
      'src/lib',
      'src/schemas',
      'src/types',
    ];

    test.each(requiredDirectories)(
      'should have %s directory',
      (directory) => {
        const dirPath = path.join(process.cwd(), directory);
        expect(fs.existsSync(dirPath)).toBe(true);
        expect(fs.statSync(dirPath).isDirectory()).toBe(true);
      }
    );
  });

  describe('Environment Variables', () => {
    test('should have .env.example file', () => {
      const envExamplePath = path.join(process.cwd(), '.env.example');
      expect(fs.existsSync(envExamplePath)).toBe(true);
    });

    test('.env.example should contain DATABASE_URL', () => {
      const envExamplePath = path.join(process.cwd(), '.env.example');
      const content = fs.readFileSync(envExamplePath, 'utf-8');
      expect(content).toContain('DATABASE_URL');
    });

    test('.env.example should contain NEXT_PUBLIC_APP_URL', () => {
      const envExamplePath = path.join(process.cwd(), '.env.example');
      const content = fs.readFileSync(envExamplePath, 'utf-8');
      expect(content).toContain('NEXT_PUBLIC_APP_URL');
    });
  });

  describe('Code Quality Configuration', () => {
    test('should have ESLint configuration', () => {
      const eslintConfigPath = path.join(process.cwd(), 'eslint.config.mjs');
      expect(fs.existsSync(eslintConfigPath)).toBe(true);
    });

    test('should have Prettier configuration', () => {
      const prettierConfigPath = path.join(process.cwd(), '.prettierrc.json');
      expect(fs.existsSync(prettierConfigPath)).toBe(true);
    });

    test('Prettier configuration should be valid JSON', () => {
      const prettierConfigPath = path.join(process.cwd(), '.prettierrc.json');
      const content = fs.readFileSync(prettierConfigPath, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });
  });

  describe('Package Configuration', () => {
    test('should have package.json', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      expect(fs.existsSync(packageJsonPath)).toBe(true);
    });

    test('package.json should be valid JSON', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const content = fs.readFileSync(packageJsonPath, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    test('package.json should have required scripts', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(
        fs.readFileSync(packageJsonPath, 'utf-8')
      );

      const requiredScripts = [
        'dev',
        'build',
        'start',
        'lint',
        'test',
        'format',
      ];

      requiredScripts.forEach((script) => {
        expect(packageJson.scripts).toHaveProperty(script);
      });
    });

    test('package.json should not have dependency conflicts', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(
        fs.readFileSync(packageJsonPath, 'utf-8')
      );

      const dependencies = packageJson.dependencies || {};
      const devDependencies = packageJson.devDependencies || {};

      // Check for packages that appear in both dependencies and devDependencies
      const dependencyNames = Object.keys(dependencies);
      const devDependencyNames = Object.keys(devDependencies);

      const conflicts = dependencyNames.filter((name) =>
        devDependencyNames.includes(name)
      );

      expect(conflicts).toEqual([]);
    });

    test('package.json should have all required dependencies', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(
        fs.readFileSync(packageJsonPath, 'utf-8')
      );

      const requiredDependencies = [
        'next',
        'react',
        'react-dom',
        '@reduxjs/toolkit',
        'react-redux',
        'zod',
        '@prisma/client',
        'prisma',
      ];

      requiredDependencies.forEach((dep) => {
        expect(packageJson.dependencies).toHaveProperty(dep);
      });
    });

    test('package.json should have all required devDependencies', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(
        fs.readFileSync(packageJsonPath, 'utf-8')
      );

      const requiredDevDependencies = [
        'typescript',
        'eslint',
        'prettier',
        'tailwindcss',
        '@types/node',
        '@types/react',
      ];

      requiredDevDependencies.forEach((dep) => {
        expect(packageJson.devDependencies).toHaveProperty(dep);
      });
    });
  });
});
