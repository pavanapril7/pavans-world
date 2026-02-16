import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface ImageUploadOptions {
  file: Buffer;
  filename: string;
  mimeType: string;
  type: 'vendor' | 'product';
}

export interface ImageUploadResult {
  url: string;
  size: number;
  format: string;
}

export class ImageUploadService {
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
  private static readonly VENDOR_SIZE = 800;
  private static readonly PRODUCT_SIZE = 1200;
  private static readonly QUALITY = 80;
  
  private static supabaseClient = process.env.NODE_ENV === 'production' 
    ? createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
    : null;

  /**
   * Main upload method - routes to appropriate storage based on environment
   */
  static async uploadImage(options: ImageUploadOptions): Promise<ImageUploadResult> {
    // Validate file
    this.validateFile(options);
    
    // Process image with sharp
    const processedBuffer = await this.processImage(options);
    
    // Route to appropriate storage
    if (process.env.NODE_ENV === 'production') {
      return await this.uploadToSupabase(processedBuffer, options.type);
    } else {
      return await this.saveToLocal(processedBuffer, options.type);
    }
  }

  /**
   * Validate file size, format, and MIME type
   */
  private static validateFile(options: ImageUploadOptions): void {
    // Check file size
    if (options.file.length > this.MAX_FILE_SIZE) {
      throw new Error('File size exceeds 5MB limit');
    }
    
    // Check MIME type
    if (!this.SUPPORTED_FORMATS.includes(options.mimeType)) {
      throw new Error('Only JPEG, PNG, and WebP formats are supported');
    }
    
    // Check for executable extensions
    const ext = path.extname(options.filename).toLowerCase();
    const dangerousExts = ['.exe', '.sh', '.bat', '.cmd', '.com'];
    if (dangerousExts.includes(ext)) {
      throw new Error('Invalid file type');
    }
    
    // Sanitize filename - check for path traversal attempts
    if (options.filename.includes('..') || options.filename.includes('/') || options.filename.includes('\\')) {
      throw new Error('Invalid filename');
    }
  }

  /**
   * Process image: resize, convert to WebP, compress
   */
  private static async processImage(options: ImageUploadOptions): Promise<Buffer> {
    const targetSize = options.type === 'vendor' ? this.VENDOR_SIZE : this.PRODUCT_SIZE;
    
    return await sharp(options.file)
      .resize(targetSize, targetSize, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: this.QUALITY })
      .toBuffer();
  }

  /**
   * Save to local filesystem (development)
   */
  private static async saveToLocal(
    buffer: Buffer,
    type: 'vendor' | 'product'
  ): Promise<ImageUploadResult> {
    const filename = `${type}_${uuidv4()}.webp`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', `${type}s`);
    const filePath = path.join(uploadDir, filename);
    
    // Ensure directory exists
    await fs.mkdir(uploadDir, { recursive: true });
    
    // Write file
    await fs.writeFile(filePath, buffer);
    
    return {
      url: `/uploads/${type}s/${filename}`,
      size: buffer.length,
      format: 'webp'
    };
  }

  /**
   * Delete image from local filesystem (development)
   */
  private static async deleteFromLocal(imageUrl: string): Promise<void> {
    try {
      const filePath = path.join(process.cwd(), 'public', imageUrl);
      await fs.unlink(filePath);
    } catch (error) {
      // Log but don't throw - file might already be deleted
      console.error('Failed to delete local file:', error);
    }
  }

  /**
   * Upload to Supabase Storage (production)
   */
  private static async uploadToSupabase(
    buffer: Buffer,
    type: 'vendor' | 'product'
  ): Promise<ImageUploadResult> {
    if (!this.supabaseClient) {
      throw new Error('Supabase client not initialized');
    }
    
    const filename = `${type}s/${type}_${uuidv4()}.webp`;
    
    const { data, error } = await this.supabaseClient.storage
      .from('images')
      .upload(filename, buffer, {
        contentType: 'image/webp',
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }
    
    // Get public URL
    const { data: urlData } = this.supabaseClient.storage
      .from('images')
      .getPublicUrl(filename);
    
    return {
      url: urlData.publicUrl,
      size: buffer.length,
      format: 'webp'
    };
  }

  /**
   * Delete image from Supabase Storage (production)
   */
  private static async deleteFromSupabase(imageUrl: string): Promise<void> {
    if (!this.supabaseClient) return;
    
    try {
      // Extract path from URL
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/');
      const filename = pathParts.slice(-2).join('/'); // e.g., "vendors/vendor_uuid.webp"
      
      await this.supabaseClient.storage
        .from('images')
        .remove([filename]);
    } catch (error) {
      console.error('Failed to delete from Supabase:', error);
    }
  }

  /**
   * Delete image from storage - routes to appropriate storage based on environment
   */
  static async deleteImage(imageUrl: string): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      await this.deleteFromSupabase(imageUrl);
    } else {
      await this.deleteFromLocal(imageUrl);
    }
  }
}
