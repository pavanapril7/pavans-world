# Implementation Plan: Vendor and Product Image Upload

## Overview

This implementation plan breaks down the image upload feature into discrete coding tasks. The feature implements dual storage strategy (local filesystem for development, Supabase Storage for production) with image processing using Sharp. Each task builds incrementally, with testing integrated throughout to validate functionality early.

## Tasks

- [x] 1. Install dependencies and configure environment
  - Install @supabase/supabase-js, sharp, and uuid packages
  - Add TypeScript types for uuid
  - Create environment variable validation schema
  - Update .env.example with Supabase configuration
  - _Requirements: 4.1, 4.3, 11.1, 11.2, 11.3_

- [x] 2. Update database schema
  - [x] 2.1 Add imageUrl fields to Vendor and Product models in Prisma schema
    - Add optional String field imageUrl to Vendor model
    - Add optional String field imageUrl to Product model
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [x] 2.2 Generate and apply database migration
    - Run prisma migrate dev to create migration
    - Verify migration adds imageUrl columns
    - _Requirements: 7.1, 7.2_

- [x] 3. Implement ImageUploadService core functionality
  - [x] 3.1 Create ImageUploadService class with validation methods
    - Implement validateFile method for size and format checks
    - Add constants for MAX_FILE_SIZE, SUPPORTED_FORMATS, image dimensions
    - Implement filename sanitization and security checks
    - _Requirements: 1.2, 1.3, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 9.2, 9.6_
  
  - [ ]* 3.2 Write property tests for file validation
    - **Property 1: Format Validation**
    - **Property 2: Size Validation**
    - **Property 6: MIME Type Validation**
    - **Property 18: Executable Extension Rejection**
    - **Property 20: Filename Sanitization**
    - **Validates: Requirements 1.2, 1.3, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 9.2, 9.6**
  
  - [x] 3.3 Implement image processing with Sharp
    - Create processImage method that resizes based on type (vendor: 800x800, product: 1200x1200)
    - Convert all images to WebP format with quality 80
    - Ensure compression maintains acceptable quality
    - _Requirements: 11.1, 11.2, 11.3_
  
  - [ ]* 3.4 Write property tests for image processing
    - **Property 21: Image Compression**
    - **Property 22: Image Resizing (vendor)**
    - **Property 23: Product Image Resizing**
    - **Property 24: WebP Conversion**
    - **Validates: Requirements 11.1, 11.2, 11.3**

- [x] 4. Implement local filesystem storage (development)
  - [x] 4.1 Create saveToLocal method in ImageUploadService
    - Generate UUID-based filename with .webp extension
    - Create directory structure: public/uploads/vendors/ and public/uploads/products/
    - Write processed buffer to filesystem
    - Return relative URL path
    - _Requirements: 1.4, 2.4, 4.1, 4.2, 4.3, 9.3_
  
  - [x] 4.2 Implement deleteFromLocal method for cleanup
    - Extract file path from URL
    - Delete file from filesystem
    - Handle errors gracefully (log but don't throw)
    - _Requirements: 1.7, 2.7_
  
  - [ ]* 4.3 Write property tests for local storage
    - **Property 8: Unique Filename Generation**
    - **Property 25: Environment-Based Storage Routing (development)**
    - **Validates: Requirements 4.1, 4.3**

- [x] 5. Implement Supabase Storage (production)
  - [x] 5.1 Create Supabase client initialization
    - Initialize client with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
    - Only initialize in production environment
    - _Requirements: 4.1, 4.3_
  
  - [x] 5.2 Create uploadToSupabase method in ImageUploadService
    - Generate UUID-based filename with folder structure (vendors/, products/)
    - Upload to 'images' bucket with WebP content type
    - Set cache control headers (3600s)
    - Get and return public URL
    - _Requirements: 1.4, 2.4, 4.1, 4.2, 4.3, 4.5, 9.3_
  
  - [x] 5.3 Implement deleteFromSupabase method for cleanup
    - Extract filename from Supabase URL
    - Delete from 'images' bucket
    - Handle errors gracefully
    - _Requirements: 1.7, 2.7_
  
  - [ ]* 5.4 Write property tests for Supabase storage
    - **Property 10: URL Accessibility**
    - **Property 12: HTTPS Protocol**
    - **Property 26: Production Storage Routing**
    - **Validates: Requirements 4.3, 4.5**

- [x] 6. Implement main upload routing logic
  - [x] 6.1 Create uploadImage method with environment detection
    - Accept ImageUploadOptions (file, filename, mimeType, type)
    - Call validateFile
    - Call processImage
    - Route to saveToLocal or uploadToSupabase based on NODE_ENV
    - Return ImageUploadResult with url, size, format
    - _Requirements: 1.4, 2.4, 4.1, 4.2, 4.3_
  
  - [x] 6.2 Implement deleteImage method with environment detection
    - Route to deleteFromLocal or deleteFromSupabase based on NODE_ENV
    - _Requirements: 1.7, 2.7, 4.4_
  
  - [ ]* 6.3 Write property tests for upload routing
    - **Property 3: Storage and URL Return**
    - **Property 9: Complete Metadata Return**
    - **Validates: Requirements 1.4, 2.4, 4.2**

- [x] 7. Checkpoint - Ensure service layer tests pass
  - Run all ImageUploadService tests
  - Verify both local and Supabase storage paths work
  - Ask the user if questions arise

- [x] 8. Implement vendor image upload API endpoint
  - [x] 8.1 Create POST /api/vendors/[id]/image route handler
    - Wrap with withAuth middleware for VENDOR role
    - Parse multipart/form-data
    - Verify vendor owns the profile (user.vendorId === id)
    - Get current vendor record to check for existing image
    - Call ImageUploadService.uploadImage
    - Update vendor record with new imageUrl
    - Delete old image if exists
    - Return 200 with url, size, format
    - Handle errors with appropriate status codes (400, 403, 404, 500)
    - _Requirements: 1.1, 1.4, 1.5, 1.7, 5.1, 5.3, 5.4, 5.5, 5.6, 5.8, 9.5_
  
  - [ ]* 8.2 Write property tests for vendor upload endpoint
    - **Property 4: Database Persistence**
    - **Property 5: Image Replacement**
    - **Property 13: Authorization Enforcement**
    - **Property 15: Success Response Format**
    - **Property 16: Validation Error Response**
    - **Property 19: Ownership Verification**
    - **Validates: Requirements 1.5, 1.7, 5.3, 5.5, 5.6, 5.8, 9.5**
  
  - [ ]* 8.3 Write unit tests for vendor upload endpoint
    - Test successful upload with valid image
    - Test upload with oversized file returns 400
    - Test upload with invalid format returns 400
    - Test unauthorized user returns 403
    - Test vendor uploading to another vendor's profile returns 403
    - _Requirements: 1.2, 1.3, 5.6, 5.8, 9.5_

- [x] 9. Implement product image upload API endpoint
  - [x] 9.1 Create POST /api/products/[id]/image route handler
    - Wrap with withAuth middleware for VENDOR role
    - Parse multipart/form-data
    - Get product and verify vendor ownership (product.vendorId === user.vendorId)
    - Call ImageUploadService.uploadImage
    - Update product record with new imageUrl
    - Delete old image if exists
    - Return 200 with url, size, format
    - Handle errors with appropriate status codes
    - _Requirements: 2.1, 2.4, 2.5, 2.7, 5.2, 5.3, 5.4, 5.5, 5.6, 5.8, 9.5_
  
  - [ ]* 9.2 Write property tests for product upload endpoint
    - **Property 7: State Preservation on Failure**
    - **Property 11: Atomic Replacement**
    - **Validates: Requirements 2.7, 3.5, 4.4**
  
  - [ ]* 9.3 Write unit tests for product upload endpoint
    - Test successful upload with valid image
    - Test vendor uploading to another vendor's product returns 403
    - Test product not found returns 404
    - _Requirements: 2.2, 2.3, 5.6, 9.5_

- [x] 10. Implement admin vendor image upload API endpoint
  - [x] 10.1 Create POST /api/admin/vendors/[id]/image route handler
    - Wrap with withAuth middleware for SUPER_ADMIN role
    - Parse multipart/form-data
    - Get current vendor record
    - Call ImageUploadService.uploadImage
    - Update vendor record with new imageUrl
    - Log admin action using AuditLogService
    - Delete old image if exists
    - Return 200 with url, size, format
    - _Requirements: 10.1, 10.2, 10.5, 10.6_
  
  - [ ]* 10.2 Write unit tests for admin vendor upload
    - Test successful admin upload
    - Test audit log is created
    - Test non-admin user returns 403
    - _Requirements: 10.5, 10.6_

- [x] 11. Implement admin product image upload API endpoint
  - [x] 11.1 Create POST /api/admin/products/[id]/image route handler
    - Wrap with withAuth middleware for SUPER_ADMIN role
    - Parse multipart/form-data
    - Get current product record
    - Call ImageUploadService.uploadImage
    - Update product record with new imageUrl
    - Log admin action using AuditLogService
    - Delete old image if exists
    - Return 200 with url, size, format
    - _Requirements: 10.3, 10.4, 10.5, 10.6_
  
  - [ ]* 11.2 Write unit tests for admin product upload
    - Test successful admin upload
    - Test audit log is created
    - _Requirements: 10.5, 10.6_

- [x] 12. Checkpoint - Ensure API tests pass
  - Run all API endpoint tests
  - Verify authentication and authorization work correctly
  - Verify database updates persist correctly
  - Ask the user if questions arise

- [x] 13. Create ImageUpload UI component
  - [x] 13.1 Implement ImageUpload component
    - Accept props: currentImageUrl, onUploadSuccess, uploadEndpoint, type, alt
    - Implement file selection with input[type=file]
    - Display image preview before upload
    - Validate file size and format client-side
    - Show loading indicator during upload
    - Display success/error messages
    - Show current image with hover actions (replace/remove)
    - Use Next.js Image component for optimized display
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_
  
  - [ ]* 13.2 Write component tests for ImageUpload
    - Test file selection updates preview
    - Test oversized file shows error
    - Test invalid format shows error
    - Test successful upload calls onUploadSuccess
    - Test loading state displays during upload
    - _Requirements: 6.2, 6.3, 6.4, 6.5_

- [x] 14. Integrate ImageUpload component into vendor profile form
  - [x] 14.1 Add ImageUpload to vendor profile creation/edit page
    - Import ImageUpload component
    - Pass uploadEndpoint as /api/vendors/[id]/image
    - Handle onUploadSuccess to update form state
    - Display current vendor image if exists
    - _Requirements: 1.1, 1.6, 1.7_
  
  - [ ]* 14.2 Write integration tests for vendor profile image upload
    - Test vendor can upload profile image during creation
    - Test vendor can replace existing profile image
    - _Requirements: 1.1, 1.7_

- [x] 15. Integrate ImageUpload component into product form
  - [x] 15.1 Add ImageUpload to product creation/edit page
    - Import ImageUpload component
    - Pass uploadEndpoint as /api/products/[id]/image
    - Handle onUploadSuccess to update form state
    - Display current product image if exists
    - _Requirements: 2.1, 2.6, 2.7_
  
  - [ ]* 15.2 Write integration tests for product image upload
    - Test vendor can upload product image during creation
    - Test vendor can replace existing product image
    - _Requirements: 2.1, 2.7_

- [x] 16. Integrate ImageUpload into admin vendor management
  - [x] 16.1 Add ImageUpload to admin vendor edit page
    - Import ImageUpload component
    - Pass uploadEndpoint as /api/admin/vendors/[id]/image
    - Display current vendor image in admin dashboard
    - _Requirements: 10.1, 10.2_

- [x] 17. Integrate ImageUpload into admin product management
  - [x] 17.1 Add ImageUpload to admin product edit page
    - Import ImageUpload component
    - Pass uploadEndpoint as /api/admin/products/[id]/image
    - Display current product image in admin dashboard
    - _Requirements: 10.3, 10.4_

- [x] 18. Update Next.js configuration for image domains
  - [x] 18.1 Add Supabase domain to next.config.ts
    - Add Supabase project domain to images.remotePatterns
    - Allow HTTPS protocol for Supabase URLs
    - _Requirements: 4.3, 4.5_

- [x] 19. Create Supabase bucket setup documentation
  - [x] 19.1 Document Supabase Storage configuration
    - Create setup instructions for 'images' bucket
    - Document bucket policies for public read access
    - Add folder structure documentation
    - _Requirements: 4.1, 4.3_

- [x] 20. Final checkpoint - End-to-end testing
  - Test complete vendor profile image upload flow
  - Test complete product image upload flow
  - Test admin image management flows
  - Verify images display correctly in all contexts
  - Verify old images are cleaned up on replacement
  - Test both development (local) and production (Supabase) storage
  - Ensure all tests pass
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples, edge cases, and integration points
- The dual storage strategy allows seamless development without Supabase setup
- All images are optimized automatically (WebP conversion, resizing, compression)
- Security is enforced at multiple layers (validation, authorization, filename generation)
