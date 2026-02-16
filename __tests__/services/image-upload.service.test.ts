import { ImageUploadService } from '@/services/image-upload.service';
import sharp from 'sharp';

// Mock uuid to avoid ESM issues in Jest
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-1234'
}));

describe('ImageUploadService - Core Functionality', () => {
  describe('validateFile', () => {
    it('should reject files exceeding 5MB', () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
      
      expect(() =>
        (ImageUploadService as any).validateFile({
          file: largeBuffer,
          filename: 'test.jpg',
          mimeType: 'image/jpeg',
          type: 'vendor'
        })
      ).toThrow('File size exceeds 5MB limit');
    });

    it('should reject unsupported formats', () => {
      const buffer = Buffer.alloc(1024);
      
      expect(() =>
        (ImageUploadService as any).validateFile({
          file: buffer,
          filename: 'test.gif',
          mimeType: 'image/gif',
          type: 'vendor'
        })
      ).toThrow('Only JPEG, PNG, and WebP formats are supported');
    });

    it('should reject executable extensions', () => {
      const buffer = Buffer.alloc(1024);
      
      expect(() =>
        (ImageUploadService as any).validateFile({
          file: buffer,
          filename: 'malicious.exe',
          mimeType: 'image/jpeg',
          type: 'vendor'
        })
      ).toThrow('Invalid file type');
    });

    it('should reject filenames with path traversal', () => {
      const buffer = Buffer.alloc(1024);
      
      expect(() =>
        (ImageUploadService as any).validateFile({
          file: buffer,
          filename: '../../../etc/passwd',
          mimeType: 'image/jpeg',
          type: 'vendor'
        })
      ).toThrow('Invalid filename');
    });

    it('should accept valid JPEG files', () => {
      const buffer = Buffer.alloc(1024);
      
      expect(() =>
        (ImageUploadService as any).validateFile({
          file: buffer,
          filename: 'test.jpg',
          mimeType: 'image/jpeg',
          type: 'vendor'
        })
      ).not.toThrow();
    });

    it('should accept valid PNG files', () => {
      const buffer = Buffer.alloc(1024);
      
      expect(() =>
        (ImageUploadService as any).validateFile({
          file: buffer,
          filename: 'test.png',
          mimeType: 'image/png',
          type: 'product'
        })
      ).not.toThrow();
    });

    it('should accept valid WebP files', () => {
      const buffer = Buffer.alloc(1024);
      
      expect(() =>
        (ImageUploadService as any).validateFile({
          file: buffer,
          filename: 'test.webp',
          mimeType: 'image/webp',
          type: 'vendor'
        })
      ).not.toThrow();
    });
  });

  describe('processImage', () => {
    it('should resize vendor images to 800x800', async () => {
      // Create a test image buffer (1000x1000 red square)
      const inputBuffer = await sharp({
        create: {
          width: 1000,
          height: 1000,
          channels: 3,
          background: { r: 255, g: 0, b: 0 }
        }
      })
        .jpeg()
        .toBuffer();

      const result = await (ImageUploadService as any).processImage({
        file: inputBuffer,
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        type: 'vendor'
      });

      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBeLessThanOrEqual(800);
      expect(metadata.height).toBeLessThanOrEqual(800);
      expect(metadata.format).toBe('webp');
    });

    it('should resize product images to 1200x1200', async () => {
      // Create a test image buffer (1500x1500 blue square)
      const inputBuffer = await sharp({
        create: {
          width: 1500,
          height: 1500,
          channels: 3,
          background: { r: 0, g: 0, b: 255 }
        }
      })
        .jpeg()
        .toBuffer();

      const result = await (ImageUploadService as any).processImage({
        file: inputBuffer,
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        type: 'product'
      });

      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBeLessThanOrEqual(1200);
      expect(metadata.height).toBeLessThanOrEqual(1200);
      expect(metadata.format).toBe('webp');
    });

    it('should convert images to WebP format', async () => {
      // Create a PNG test image
      const inputBuffer = await sharp({
        create: {
          width: 500,
          height: 500,
          channels: 3,
          background: { r: 0, g: 255, b: 0 }
        }
      })
        .png()
        .toBuffer();

      const result = await (ImageUploadService as any).processImage({
        file: inputBuffer,
        filename: 'test.png',
        mimeType: 'image/png',
        type: 'vendor'
      });

      const metadata = await sharp(result).metadata();
      expect(metadata.format).toBe('webp');
    });

    it('should not enlarge small images', async () => {
      // Create a small image (200x200)
      const inputBuffer = await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 3,
          background: { r: 128, g: 128, b: 128 }
        }
      })
        .jpeg()
        .toBuffer();

      const result = await (ImageUploadService as any).processImage({
        file: inputBuffer,
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        type: 'vendor'
      });

      const metadata = await sharp(result).metadata();
      // Should not be enlarged beyond original size
      expect(metadata.width).toBeLessThanOrEqual(200);
      expect(metadata.height).toBeLessThanOrEqual(200);
    });

    it('should compress images with quality 80', async () => {
      // Create a large uncompressed image
      const inputBuffer = await sharp({
        create: {
          width: 1000,
          height: 1000,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      })
        .jpeg({ quality: 100 })
        .toBuffer();

      const result = await (ImageUploadService as any).processImage({
        file: inputBuffer,
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        type: 'vendor'
      });

      // Compressed WebP should be smaller than original
      expect(result.length).toBeLessThan(inputBuffer.length);
    });
  });

  describe('saveToLocal', () => {
    it('should save vendor image to correct directory', async () => {
      const buffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 255, g: 0, b: 0 }
        }
      })
        .webp()
        .toBuffer();

      const result = await (ImageUploadService as any).saveToLocal(buffer, 'vendor');

      expect(result.url).toBe('/uploads/vendors/vendor_test-uuid-1234.webp');
      expect(result.size).toBe(buffer.length);
      expect(result.format).toBe('webp');

      // Cleanup
      await (ImageUploadService as any).deleteFromLocal(result.url);
    });

    it('should save product image to correct directory', async () => {
      const buffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 0, g: 255, b: 0 }
        }
      })
        .webp()
        .toBuffer();

      const result = await (ImageUploadService as any).saveToLocal(buffer, 'product');

      expect(result.url).toBe('/uploads/products/product_test-uuid-1234.webp');
      expect(result.size).toBe(buffer.length);
      expect(result.format).toBe('webp');

      // Cleanup
      await (ImageUploadService as any).deleteFromLocal(result.url);
    });

    it('should create directory if it does not exist', async () => {
      const buffer = await sharp({
        create: {
          width: 50,
          height: 50,
          channels: 3,
          background: { r: 128, g: 128, b: 128 }
        }
      })
        .webp()
        .toBuffer();

      // This should not throw even if directory doesn't exist
      const result = await (ImageUploadService as any).saveToLocal(buffer, 'vendor');

      expect(result.url).toBe('/uploads/vendors/vendor_test-uuid-1234.webp');

      // Cleanup
      await (ImageUploadService as any).deleteFromLocal(result.url);
    });
  });

  describe('deleteFromLocal', () => {
    it('should delete existing file without throwing', async () => {
      const buffer = await sharp({
        create: {
          width: 50,
          height: 50,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      })
        .webp()
        .toBuffer();

      const result = await (ImageUploadService as any).saveToLocal(buffer, 'vendor');

      await expect(
        (ImageUploadService as any).deleteFromLocal(result.url)
      ).resolves.not.toThrow();
    });

    it('should not throw when deleting non-existent file', async () => {
      await expect(
        (ImageUploadService as any).deleteFromLocal('/uploads/vendors/nonexistent.webp')
      ).resolves.not.toThrow();
    });
  });
});
