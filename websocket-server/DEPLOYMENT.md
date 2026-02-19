# WebSocket Server Deployment Guide

## Monorepo Architecture

This WebSocket server lives in the same repository as the Next.js application but deploys separately.

```
Repository Structure:
├── src/                    # Next.js app (deploys to Vercel)
├── prisma/                 # Shared database schema
└── websocket-server/       # WebSocket server (deploys to Railway/Render)
```

## Why Separate Deployments?

1. **Different Runtime Requirements:**
   - Next.js: Serverless functions (Vercel)
   - WebSocket: Long-running process (Railway/Render)

2. **Scaling:**
   - Next.js scales automatically with Vercel
   - WebSocket server scales independently

3. **Cost Optimization:**
   - Pay only for what each service needs

## Deployment Strategies

### Strategy 1: Monorepo with Separate Deploys (Current)

**Pros:**
- ✅ Shared Prisma schema
- ✅ Single source of truth
- ✅ Coordinated updates
- ✅ Easy local development

**Cons:**
- ⚠️ Need platform-specific ignore files
- ⚠️ Slightly larger repo

**Best For:** Small to medium teams, rapid development

### Strategy 2: Separate Repositories (Alternative)

If you prefer completely separate repos:

1. Create new repo: `marketplace-websocket-server`
2. Move `websocket-server/` contents to new repo
3. Copy `prisma/` to new repo (or use git submodule)
4. Update both repos independently

**Pros:**
- ✅ Complete separation
- ✅ Independent versioning
- ✅ Cleaner deployments

**Cons:**
- ⚠️ Prisma schema sync required
- ⚠️ More complex coordination
- ⚠️ Duplicate dependencies

**Best For:** Large teams, microservices architecture

## Platform-Specific Configurations

### Vercel (Next.js App)

**File:** `.vercelignore`
```
websocket-server/
```

This prevents Vercel from including WebSocket server files in the build.

### Railway (WebSocket Server)

**Configuration:**
- Root Directory: `websocket-server`
- Build Command: Auto-detected from `package.json`
- Start Command: `npm start`

**Prisma Handling:**
Railway automatically runs `prisma generate` if it detects a schema.

### Render (WebSocket Server)

**Configuration:**
- Root Directory: `websocket-server`
- Build Command: `npm install && npx prisma generate && npm run build`
- Start Command: `npm start`

### Docker (Any Platform)

Use the provided `Dockerfile` for containerized deployments.

**Build:**
```bash
docker build -t websocket-server ./websocket-server
```

**Run:**
```bash
docker run -p 8080:8080 -p 8081:8081 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="..." \
  websocket-server
```

## Common Deployment Issues

### Issue 1: Prisma Client Not Found

**Symptom:** `Cannot find module '@prisma/client'`

**Solution:**
```bash
# In websocket-server directory
npx prisma generate
```

**For Deployment:** Ensure build command includes `npx prisma generate`

### Issue 2: Symlink Doesn't Work in Docker

**Symptom:** `ENOENT: no such file or directory, scandir 'prisma'`

**Solution:** The Dockerfile copies the actual prisma directory instead of using symlinks.

### Issue 3: JWT Verification Fails

**Symptom:** WebSocket authentication fails

**Solution:** Ensure `JWT_SECRET` is EXACTLY the same in both Next.js and WebSocket server.

### Issue 4: Database Connection Fails

**Symptom:** `Can't reach database server`

**Solution:**
- Verify `DATABASE_URL` is correct
- Ensure WebSocket server can access the database (firewall rules)
- Check if database allows connections from deployment platform's IP range

### Issue 5: Port Already in Use

**Symptom:** `EADDRINUSE: address already in use`

**Solution:** Change `WS_PORT` or `HTTP_PORT` in environment variables.

## Security Checklist

Before deploying to production:

- [ ] `JWT_SECRET` is strong and matches Next.js app
- [ ] `HTTP_API_SECRET` is strong and unique
- [ ] `DATABASE_URL` uses SSL (`?sslmode=require`)
- [ ] Environment variables are not committed to git
- [ ] WebSocket server uses WSS (TLS) in production
- [ ] HTTP API uses HTTPS in production
- [ ] Rate limiting is configured
- [ ] CORS is properly configured (if needed)

## Monitoring

### Health Checks

Add a health check endpoint (to be implemented in Task 14):

```bash
curl https://your-websocket-server.com/health
```

### Logs

Monitor logs on your deployment platform:

**Railway:**
```bash
railway logs
```

**Render:**
Check logs in Render dashboard

**Docker:**
```bash
docker logs <container-id>
```

### Metrics to Monitor

- Active WebSocket connections
- Message throughput
- Database query performance
- Memory usage
- CPU usage
- Error rates

## Scaling

### Horizontal Scaling

For high traffic, run multiple WebSocket server instances:

1. **Use Redis for Pub/Sub:**
   - Share events between instances
   - Maintain connection state

2. **Load Balancer:**
   - Distribute WebSocket connections
   - Sticky sessions recommended

3. **Database Connection Pooling:**
   - Use PgBouncer or similar
   - Limit connections per instance

### Vertical Scaling

Increase resources on deployment platform:
- More CPU for handling concurrent connections
- More memory for connection state

## Cost Optimization

### Railway
- Free tier: 500 hours/month
- Pro: $5/month + usage
- Estimate: ~$10-20/month for small-medium traffic

### Render
- Free tier: Available with limitations
- Starter: $7/month
- Estimate: ~$7-15/month for small-medium traffic

### Tips
- Use connection pooling to reduce database costs
- Implement connection cleanup to free resources
- Monitor and optimize message sizes
- Use compression for large payloads

## Rollback Strategy

If deployment fails:

1. **Railway:** Use "Rollback" button in dashboard
2. **Render:** Redeploy previous commit
3. **Docker:** Keep previous image tagged

Always test in staging environment first!

## Next Steps

After successful deployment:

1. Update Next.js app with WebSocket server URL
2. Test end-to-end flow
3. Monitor logs for 24 hours
4. Set up alerts for errors
5. Document any platform-specific quirks
