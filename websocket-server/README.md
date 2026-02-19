# WebSocket Server

Real-time WebSocket server for geolocation tracking and delivery notifications.

## Features

- Real-time location updates for active deliveries
- Delivery partner notifications for new orders
- JWT-based authentication
- Connection management with automatic cleanup
- HTTP API for triggering events from Next.js app

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration (must match Next.js app settings)

4. Link or copy Prisma schema from main project:
```bash
# Option 1: Symlink (recommended for development)
ln -s ../prisma ./prisma

# Option 2: Copy schema
cp -r ../prisma ./prisma
```

5. Generate Prisma Client:
```bash
npx prisma generate
```

## Development

Run in development mode with auto-reload:
```bash
npm run dev
```

## Production

Build and run:
```bash
npm run build
npm start
```

## Architecture

- **WebSocket Server** (port 8080): Handles client connections and real-time messaging
- **HTTP API** (port 8081): Receives event triggers from Next.js application

## Event Types

- `location_update`: Delivery partner location updates
- `delivery_assigned`: New delivery opportunity notifications
- `order_ready`: Order ready for pickup
- `delivery_completed`: Delivery completion notification
- `notification_cancelled`: Cancel pending notifications

## Deployment

This server should be deployed separately from the Next.js application:
- Railway
- Render
- Heroku
- Any Node.js hosting platform

Ensure the WebSocket server can access the same PostgreSQL database as the Next.js app.
