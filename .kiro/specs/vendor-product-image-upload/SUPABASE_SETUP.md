# Supabase Storage Setup Guide

This guide provides step-by-step instructions for configuring Supabase Storage for the vendor and product image upload feature.

## Overview

The application uses a dual storage strategy:
- **Development**: Local filesystem storage in `public/uploads/`
- **Production**: Supabase Storage with cloud-based object storage

This document covers the production setup using Supabase Storage.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- A Supabase project created
- Admin access to your Supabase project dashboard

## Step 1: Create Supabase Project

1. Log in to your Supabase account at https://supabase.com
2. Click "New Project"
3. Fill in the project details:
   - **Name**: Choose a descriptive name (e.g., "marketplace-production")
   - **Database Password**: Generate a strong password
   - **Region**: Select the region closest to your users
4. Click "Create new project"
5. Wait for the project to be provisioned (usually takes 1-2 minutes)

## Step 2: Create Storage Bucket

1. Navigate to the **Storage** section in the left sidebar
2. Click "Create a new bucket"
3. Configure the bucket:
   - **Name**: `images`
   - **Public bucket**: Toggle ON (images need to be publicly accessible)
   - **File size limit**: 5 MB (matches application validation)
   - **Allowed MIME types**: Leave empty or specify `image/jpeg, image/png, image/webp`
4. Click "Create bucket"

## Step 3: Configure Bucket Policies

Supabase uses Row Level Security (RLS) policies for access control. Configure the following policies:

### Policy 1: Public Read Access

This policy allows anyone to read (view) images from the bucket.

1. In the Storage section, click on the `images` bucket
2. Click on "Policies" tab
3. Click "New Policy"
4. Select "For full customization" template
5. Configure the policy:
   - **Policy name**: `Public Access`
   - **Allowed operation**: `SELECT`
   - **Target roles**: `public`
   - **USING expression**:
     ```sql
     bucket_id = 'images'
     ```
6. Click "Review" then "Save policy"

### Policy 2: Service Role Upload Access

This policy allows the backend service (using service role key) to upload images.

1. Click "New Policy" again
2. Select "For full customization" template
3. Configure the policy:
   - **Policy name**: `Service Role Upload`
   - **Allowed operation**: `INSERT`
   - **Target roles**: `authenticated`
   - **WITH CHECK expression**:
     ```sql
     bucket_id = 'images'
     ```
4. Click "Review" then "Save policy"

### Policy 3: Service Role Delete Access

This policy allows the backend service to delete old images during replacement.

1. Click "New Policy" again
2. Select "For full customization" template
3. Configure the policy:
   - **Policy name**: `Service Role Delete`
   - **Allowed operation**: `DELETE`
   - **Target roles**: `authenticated`
   - **USING expression**:
     ```sql
     bucket_id = 'images'
     ```
4. Click "Review" then "Save policy"

## Step 4: Get API Credentials

1. Navigate to **Settings** > **API** in the left sidebar
2. Copy the following values:
   - **Project URL**: This is your `SUPABASE_URL`
   - **Project API keys** > **service_role** (secret): This is your `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **Important**: The service role key bypasses Row Level Security and should NEVER be exposed to the client. Only use it on the server side.

## Step 5: Configure Environment Variables

Add the following environment variables to your production environment:

```bash
# Production Environment Variables
NODE_ENV=production

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### For Vercel Deployment:

1. Go to your project settings in Vercel
2. Navigate to "Environment Variables"
3. Add each variable:
   - Key: `SUPABASE_URL`, Value: Your project URL
   - Key: `SUPABASE_SERVICE_ROLE_KEY`, Value: Your service role key
4. Select "Production" environment
5. Click "Save"

### For Other Platforms:

Refer to your hosting platform's documentation for setting environment variables.

## Step 6: Verify Configuration

After deployment, verify the setup:

1. **Test Image Upload**:
   - Log in as a vendor
   - Navigate to vendor profile or product management
   - Upload a test image
   - Verify the upload succeeds

2. **Check Supabase Storage**:
   - Go to Supabase Dashboard > Storage > images bucket
   - You should see the uploaded image in the appropriate folder:
     - `vendors/vendor_[uuid].webp` for vendor images
     - `products/product_[uuid].webp` for product images

3. **Verify Public Access**:
   - Copy the public URL of an uploaded image
   - Open it in a new browser tab
   - The image should load without authentication

## Folder Structure

The application organizes images in the following structure within the `images` bucket:

```
images/
├── vendors/
│   ├── vendor_[uuid-1].webp
│   ├── vendor_[uuid-2].webp
│   └── ...
└── products/
    ├── product_[uuid-1].webp
    ├── product_[uuid-2].webp
    └── ...
```

This structure is automatically created by the `ImageUploadService` when images are uploaded.

## Image Processing

All uploaded images are automatically processed:

- **Format**: Converted to WebP for optimal compression
- **Vendor Images**: Resized to 800x800px (maintaining aspect ratio)
- **Product Images**: Resized to 1200x1200px (maintaining aspect ratio)
- **Quality**: Compressed at 80% quality
- **Cache**: Cache-Control header set to 3600 seconds (1 hour)

## Storage Costs

Supabase Storage pricing (as of 2024):

- **Free Tier**: 1 GB storage, 2 GB bandwidth per month
- **Pro Plan**: 100 GB storage, 200 GB bandwidth included
- **Additional**: $0.021/GB storage, $0.09/GB bandwidth

### Cost Estimation:

Assuming average image size after processing: ~100 KB

- 1,000 images = ~100 MB storage
- 10,000 images = ~1 GB storage
- 100,000 images = ~10 GB storage

Monitor your usage in the Supabase Dashboard under **Settings** > **Usage**.

## Troubleshooting

### Issue: Images not uploading

**Possible causes**:
1. Service role key not set or incorrect
2. Bucket policies not configured correctly
3. Bucket name mismatch (must be exactly `images`)

**Solution**:
- Verify environment variables are set correctly
- Check Supabase logs in Dashboard > Logs
- Ensure bucket policies allow INSERT operations

### Issue: Images not displaying

**Possible causes**:
1. Bucket is not public
2. Public read policy not configured
3. Next.js image domain not configured

**Solution**:
- Verify bucket is set to public
- Check public read policy exists
- Ensure `*.supabase.co` is in `next.config.ts` remotePatterns

### Issue: Old images not being deleted

**Possible causes**:
1. Delete policy not configured
2. Service role key lacks permissions

**Solution**:
- Verify delete policy exists and is active
- Check application logs for deletion errors
- Manually delete orphaned images if needed

## Security Best Practices

1. **Never expose service role key**: Only use it server-side
2. **Use HTTPS only**: Supabase enforces this by default
3. **Monitor usage**: Set up alerts for unusual activity
4. **Regular audits**: Periodically review bucket contents and policies
5. **Backup strategy**: Consider backing up critical images to another location

## Maintenance

### Cleaning Up Orphaned Images

If images are not properly deleted during replacement, you may accumulate orphaned files:

1. Navigate to Storage > images bucket
2. Review files and identify orphaned images
3. Manually delete files that are no longer referenced in the database

### Monitoring Storage Usage

1. Go to Settings > Usage in Supabase Dashboard
2. Monitor storage and bandwidth metrics
3. Set up alerts for approaching limits

## Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Supabase Storage API Reference](https://supabase.com/docs/reference/javascript/storage)
- [Row Level Security Policies](https://supabase.com/docs/guides/auth/row-level-security)

## Support

For issues specific to:
- **Supabase**: Contact Supabase support or visit their Discord
- **Application**: Check application logs and contact your development team
