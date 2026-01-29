import fs from 'fs';
import path from 'path';

// Validates: Requirements 3.3, 3.4

describe('Tailwind Configuration Tests', () => {
  let tailwindConfig: unknown;

  beforeAll(async () => {
    // Dynamically import the Tailwind config
    const configPath = path.join(process.cwd(), 'tailwind.config.ts');
    
    // Read and evaluate the config file
    const configContent = fs.readFileSync(configPath, 'utf-8');
    
    // Use dynamic import for TypeScript config
    tailwindConfig = await import('../tailwind.config');
    tailwindConfig = tailwindConfig.default;
  });

  it('should have correct content paths configured', () => {
    expect(tailwindConfig.content).toBeDefined();
    expect(Array.isArray(tailwindConfig.content)).toBe(true);
    
    // Verify content paths include all necessary directories
    const contentPaths = tailwindConfig.content;
    expect(contentPaths).toContain('./src/pages/**/*.{js,ts,jsx,tsx,mdx}');
    expect(contentPaths).toContain('./src/components/**/*.{js,ts,jsx,tsx,mdx}');
    expect(contentPaths).toContain('./src/app/**/*.{js,ts,jsx,tsx,mdx}');
  });

  it('should have dark mode configured', () => {
    expect(tailwindConfig.darkMode).toBeDefined();
    expect(tailwindConfig.darkMode).toBe('class');
  });

  it('should have theme extensions configured', () => {
    expect(tailwindConfig.theme).toBeDefined();
    expect(tailwindConfig.theme.extend).toBeDefined();
  });

  it('should have custom color values in theme', () => {
    // Requirement 3.4: Custom theme values should be available
    expect(tailwindConfig.theme.extend.colors).toBeDefined();
    expect(tailwindConfig.theme.extend.colors.background).toBe('hsl(var(--background))');
    expect(tailwindConfig.theme.extend.colors.foreground).toBe('hsl(var(--foreground))');
    expect(tailwindConfig.theme.extend.colors.primary).toBeDefined();
    expect(tailwindConfig.theme.extend.colors.secondary).toBeDefined();
  });

  it('should have custom theme values in theme', () => {
    // Requirement 3.4: Custom theme values should generate utility classes
    expect(tailwindConfig.theme.extend.colors).toBeDefined();
    expect(tailwindConfig.theme.extend.borderRadius).toBeDefined();
  });

  it('should be a valid TypeScript Config type', () => {
    // Verify the config has the expected structure
    expect(typeof tailwindConfig).toBe('object');
    expect(tailwindConfig).toHaveProperty('content');
    expect(tailwindConfig).toHaveProperty('theme');
    expect(tailwindConfig).toHaveProperty('darkMode');
  });
});

describe('Tailwind Production Build Tests', () => {
  it('should have content paths configured for CSS purging', () => {
    // Requirement 3.3: Production build should purge unused CSS classes
    // This is verified by checking that content paths are properly configured
    const configPath = path.join(process.cwd(), 'tailwind.config.ts');
    const configExists = fs.existsSync(configPath);
    
    expect(configExists).toBe(true);
    
    const configContent = fs.readFileSync(configPath, 'utf-8');
    
    // Verify content array is defined (required for purging)
    expect(configContent).toContain('content:');
    expect(configContent).toContain('./src/');
    
    // Verify it includes the necessary file extensions
    expect(configContent).toMatch(/\.\{js,ts,jsx,tsx,mdx\}/);
  });

  it('should have PostCSS configured with Tailwind plugin', () => {
    const postcssConfigPath = path.join(process.cwd(), 'postcss.config.mjs');
    expect(fs.existsSync(postcssConfigPath)).toBe(true);
    
    const postcssConfig = fs.readFileSync(postcssConfigPath, 'utf-8');
    expect(postcssConfig).toContain('@tailwindcss/postcss');
  });
});
