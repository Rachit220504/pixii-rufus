# Rufus AI Shopper - Deployment Guide

This guide covers deploying the Rufus AI Shopper application to production.

## Architecture Overview

The app consists of three parts:
1. **Frontend**: Next.js app (deploy to Vercel)
2. **Backend**: Express API (deploy to Railway/Render)
3. **Database**: PostgreSQL (already on Neon)

---

## Step 1: Prepare Your Code

### 1.1 Ensure all changes are committed
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 1.2 Verify package.json has nodemailer
Check that these are in dependencies:
- `nodemailer` (for email)
- `@types/nodemailer` (devDependencies)

If missing:
```bash
npm install nodemailer
npm install -D @types/nodemailer
```

---

## Step 2: Deploy Backend API (Railway)

Railway offers free hosting with easy deployment.

### 2.1 Sign up & Install
1. Go to https://railway.app and sign up with GitHub
2. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

### 2.2 Create Project
```bash
# Login
railway login

# Navigate to project
cd d:/pixii2/rufus-ai-shopper

# Initialize Railway project
railway init
# Select "Create new project" → name it "rufus-backend"
```

### 2.3 Add Environment Variables
```bash
railway variables set GOOGLE_API_KEY="your_api_key"
railway variables set POSTGRES_URL="your_neon_postgres_url"
railway variables set GOOGLE_CLIENT_ID="your_oauth_client_id"
railway variables set APIFY_TOKEN="your_apify_token"
railway variables set SMTP_HOST="smtp.gmail.com"
railway variables set SMTP_PORT="587"
railway variables set SMTP_SECURE="false"
railway variables set SMTP_USER="your_email@gmail.com"
railway variables set SMTP_PASS="your_app_password"
railway variables set SMTP_FROM="Rufus AI Shopper <your_email@gmail.com>"
railway variables set FRONTEND_URL="https://your-frontend-url.vercel.app"
railway variables set NODE_ENV="production"
railway variables set PORT="3001"
```

### 2.4 Deploy Backend
```bash
# Deploy the backend folder
railway up --service=rufus-backend

# Get your backend URL
railway domain
# Copy this URL - you'll need it for the frontend
```

Your backend URL will be: `https://rufus-backend-production.up.railway.app`

---

## Step 3: Deploy Frontend (Vercel)

Vercel is the easiest platform for Next.js apps.

### 3.1 Sign up
1. Go to https://vercel.com
2. Sign up with GitHub
3. Import your repository

### 3.2 Configure Project
**Settings to configure:**

| Setting | Value |
|---------|-------|
| Framework Preset | Next.js |
| Root Directory | `./` (default) |
| Build Command | `next build` |
| Output Directory | `.next` |

### 3.3 Add Environment Variables
In Vercel dashboard → Project Settings → Environment Variables:

```
NEXT_PUBLIC_API_URL=https://your-railway-backend-url/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_oauth_client_id
```

**Note**: Use the Railway backend URL from Step 2.4

### 3.4 Deploy
Click "Deploy" - Vercel will build and deploy automatically.

Your frontend URL will be: `https://rufus-ai-shopper.vercel.app`

---

## Step 4: Update Backend with Frontend URL

After getting your Vercel URL, update the backend:

```bash
railway login
railway variables set FRONTEND_URL="https://your-vercel-url.vercel.app"
```

---

## Step 5: Database Setup (Neon)

Your database is already on Neon. Ensure:

1. **Connection string** is in Railway env vars
2. **IP Allowlist**: Add Railway IPs (0.0.0.0/0 for all, or Railway-specific)
3. **SSL Mode**: Enabled (already in your connection string with `sslmode=require`)

---

## Step 6: Test Everything

### 6.1 Health Check
```bash
curl https://your-backend-url/api/health
```
Should return: `{"status":"ok"}`

### 6.2 Test Frontend
1. Open your Vercel URL
2. Check landing page loads
3. Test login/signup
4. Test chat functionality

### 6.3 Test Password Reset
1. Go to forgot password page
2. Enter email
3. Check email for reset token

---

## Quick Reference: Environment Variables

### Backend (Railway)
```env
GOOGLE_API_KEY=required
POSTGRES_URL=required
GOOGLE_CLIENT_ID=optional_for_oauth
APIFY_TOKEN=optional_for_scraping
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email
SMTP_PASS=your_app_password
FRONTEND_URL=https://frontend-url
NODE_ENV=production
PORT=3001
```

### Frontend (Vercel)
```env
NEXT_PUBLIC_API_URL=https://backend-url/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_oauth_client_id
```

---

## Alternative: Deploy Backend to Render (Free Tier)

If Railway doesn't work, use Render:

1. Go to https://render.com
2. Click "New" → "Web Service"
3. Connect GitHub repo
4. Configure:
   - **Name**: rufus-backend
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm run server`
5. Add same environment variables as Railway
6. Deploy

---

## Troubleshooting

### Issue: Backend won't start
- Check `GOOGLE_API_KEY` is set
- Check `POSTGRES_URL` is correct
- View logs: `railway logs`

### Issue: Frontend can't connect to backend
- Verify `NEXT_PUBLIC_API_URL` matches Railway URL
- Check backend CORS allows frontend domain
- Check `/api` path - should be `https://backend.com/api` not `https://backend.com`

### Issue: Database connection fails
- Verify Neon connection string
- Check IP allowlist in Neon dashboard
- Ensure `sslmode=require` in URL

### Issue: Emails not sending
- Verify SMTP credentials
- For Gmail: Use App Password, not regular password
- Check spam folders

---

## Post-Deployment Checklist

- [ ] Frontend loads without errors
- [ ] Login works
- [ ] Signup works
- [ ] Chat responds to queries
- [ ] Password reset email arrives
- [ ] Dark mode works
- [ ] Product recommendations display
- [ ] Mobile responsive

---

## Support

For issues:
1. Check Railway/Vercel logs
2. Verify environment variables
3. Test locally with production env vars
