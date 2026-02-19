# WebSocket Server Setup Guide

## Prerequisites

- Node.js 20+
- Access to the same PostgreSQL database as the Next.js application
- JWT_SECRET from the Next.js application

## Installation Steps

### 1. Install Dependencies

```bash
cd websocket-server
npm install
```

### 2. Link Prisma Schema

The WebSocket server needs access to the same Prisma schema as the main application.

**Option A: Symlink (Recommended for Development)**

On Unix/Linux/macOS:
```bash
chmod +x setup-prisma.sh
./setup-prisma.sh
```

Or manually:
```bash
ln -s ../prisma ./prisma
```

On Windows:
```cmd
mklink /D prisma ..\prisma
```

**Option B: Copy Schema (For Production)**

```bash
cp -r ../prisma ./prisma
```

Note: If you copy the schema, you'll need to manually sync changes.

### 3. Generate Prisma Client

```bash
npx prisma generate
```

### 4. Configure Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and configure:

```env
# Database (must match Next.js app)
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# JWT Secret (must match Next.js app)
JWT_SECRET="your-jwt-secret-key"

# WebSocket Server
WS_PORT=8080
WS_HOST=0.0.0.0

# HTTP API for event triggering
HTTP_PORT=8081
HTTP_HOST=0.0.0.0

# Shared secret for HTTP API authentication
HTTP_API_SECRET="your-http-api-secret"

# Environment
NODE_ENV=development
```

**Important:** The `JWT_SECRET` must match the one in your Next.js application's `.env` file.

### 5. Run the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

## Verification

### Test WebSocket Connection

You can test the WebSocket connection using a tool like `wscat`:

```bash
npm install -g wscat
wscat -c ws://localhost:8080
```

Then send an authentication message:
```json
{"type": "auth", "token": "your-jwt-token"}
```

### Test HTTP API

Test the HTTP API endpoint:

```bash
curl -X POST http://localhost:8081/trigger/location-update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-http-api-secret" \
  -d '{
    "deliveryId": "test-delivery-id",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "eta": 15
  }'
```

## Deployment

### Important: Monorepo Considerations

This WebSocket server is in a monorepo with the Next.js application. Each platform needs specific configuration:

- **Vercel** (Next.js): Uses `.vercelignore` to exclude `websocket-server/`
- **Railway/Render** (WebSocket): Configured to only build the `websocket-server/` directory

### Railway (Recommended)

1. Create a new project on Railway
2. Connect your GitHub repository
3. Configure the service:
   - **Root Directory**: `websocket-server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Add environment variables:
   ```
   DATABASE_URL=your-postgres-url
   JWT_SECRET=your-jwt-secret
   WS_PORT=8080
   HTTP_PORT=8081
   HTTP_API_SECRET=your-api-secret
   NODE_ENV=production
   ```
5. Deploy

**Railway Prisma Setup:**
Railway will automatically detect and run `prisma generate` during build.

### Render

1. Create a new Web Service
2. Connect your GitHub repository
3. Configure:
   - **Root Directory**: `websocket-server`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm start`
4. Add environment variables (same as Railway)
5. Deploy

### Docker Deployment

For platforms that support Docker (Railway, Render, AWS, GCP):

```bash
cd websocket-server
docker build -t websocket-server .
docker run -p 8080:8080 -p 8081:8081 --env-file .env websocket-server
```

**Note:** The Dockerfile handles Prisma schema copying since symlinks don't work in containers.

### Heroku

1. Create a new Heroku app
2. Add buildpack: `heroku/nodejs`
3. Configure:
   ```bash
   heroku config:set ROOT_DIR=websocket-server
   ```
4. Create `Procfile` in repo root:
   ```
   web: cd websocket-server && npm start
   ```
5. Add environment variables
6. Deploy using Git

### Environment Variables Checklist

Ensure these are set in your deployment platform:

- ✅ `DATABASE_URL` - PostgreSQL connection string (same as Next.js app)
- ✅ `JWT_SECRET` - Must match Next.js app exactly
- ✅ `WS_PORT` - WebSocket port (default: 8080)
- ✅ `HTTP_PORT` - HTTP API port (default: 8081)
- ✅ `HTTP_API_SECRET` - Shared secret for Next.js to WebSocket communication
- ✅ `NODE_ENV` - Set to `production`

### Post-Deployment

1. **Update Next.js Environment Variables:**
   Add the WebSocket server URL to your Next.js app's `.env`:
   ```
   WEBSOCKET_SERVER_URL=https://your-websocket-server.railway.app
   WEBSOCKET_SERVER_SECRET=your-http-api-secret
   ```

2. **Test Connection:**
   ```bash
   # Test WebSocket
   wscat -c wss://your-websocket-server.railway.app
   
   # Test HTTP API
   curl https://your-websocket-server.railway.app:8081/health
   ```

3. **Monitor Logs:**
   Check deployment platform logs for any connection or authentication issues.

## Troubleshooting

### Prisma Client Not Found

If you get "Cannot find module '@prisma/client'":
```bash
npx prisma generate
```

### Database Connection Issues

Ensure the `DATABASE_URL` is correct and the database is accessible from the WebSocket server.

### JWT Verification Fails

Ensure the `JWT_SECRET` matches exactly with the Next.js application.

### Port Already in Use

Change the `WS_PORT` or `HTTP_PORT` in `.env` if the default ports are already in use.
