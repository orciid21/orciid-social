# Orciid Social — Setup Guide

## Project Structure

```
orciid-social/
├── backend/          Node.js + Express + Prisma
├── frontend/         React + Vite + Tailwind CSS
├── docker-compose.yml
└── SETUP.md
```

---

## 1. Local Development Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+

### Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your credentials
npm install
npx prisma migrate dev --name init
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

---

## 2. Environment Variables (backend/.env)

### Required for basic login/register:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — random 32+ char string (e.g. `openssl rand -base64 32`)
- `JWT_REFRESH_SECRET` — another random string

### Required for social login:
Register developer apps on each platform:

| Platform | Developer URL |
|----------|--------------|
| Facebook/Instagram | https://developers.facebook.com |
| Twitter/X | https://developer.twitter.com |
| LinkedIn | https://developer.linkedin.com |
| TikTok | https://developers.tiktok.com |

Set callback URLs to: `https://api.orciid.online/auth/{platform}/callback`

### Required for payments:
- Create account at https://stripe.com
- Get API keys from Dashboard → Developers
- Create 6 products (Starter/Pro/Agency × Monthly/Yearly)
- Set up webhook pointing to `https://api.orciid.online/api/subscriptions/webhook`

### Required for emails:
- Use Hostinger SMTP: `smtp.hostinger.com:587`
- Create email `noreply@orciid.online` in Hostinger panel

---

## 3. Deploy to Hostinger (VPS)

Hostinger VPS supports Node.js directly.

### Option A: Docker (Recommended)
```bash
# On VPS
git clone your-repo
cd orciid-social
cp backend/.env.example backend/.env
# Fill in .env
docker-compose up -d
```

### Option B: Manual
```bash
# Install Node.js, PostgreSQL, Redis, nginx on VPS

# Backend
cd backend
npm install --production
npx prisma migrate deploy
pm2 start src/server.js --name orciid-api

# Frontend
cd frontend
npm install
npm run build
# Copy dist/ to nginx root
```

### Nginx config for domain:
```nginx
server {
    server_name orciid.online www.orciid.online;
    
    location /api { proxy_pass http://localhost:5000; }
    location /auth { proxy_pass http://localhost:5000; }
    location /uploads { proxy_pass http://localhost:5000; }
    location / {
        root /var/www/orciid-social/dist;
        try_files $uri /index.html;
    }
}
```

```bash
# SSL
certbot --nginx -d orciid.online -d www.orciid.online
```

---

## 4. Social Media API Setup

### Facebook & Instagram
1. Create app at developers.facebook.com (Business type)
2. Add Facebook Login & Instagram Basic Display products
3. Permissions needed: `pages_manage_posts`, `instagram_content_publish`
4. Submit for app review (required for production)

### Twitter/X
1. Apply for developer account at developer.twitter.com
2. Create project → app → OAuth 2.0 settings
3. Permissions: `tweet.read`, `tweet.write`, `users.read`

### LinkedIn
1. Create app at developer.linkedin.com
2. Products: Sign In with LinkedIn, Share on LinkedIn
3. Permissions: `w_member_social`, `r_liteprofile`

---

## 5. Stripe Setup

1. Create products in Stripe Dashboard:
   - Starter Monthly ($19/mo)
   - Starter Yearly ($180/yr)
   - Pro Monthly ($49/mo)
   - Pro Yearly ($468/yr)
   - Agency Monthly ($99/mo)
   - Agency Yearly ($948/yr)

2. Copy price IDs to .env

3. Set webhook endpoint:
   - URL: `https://api.orciid.online/api/subscriptions/webhook`
   - Events: `customer.subscription.*`, `invoice.payment_failed`

---

## Phase 2 (Mobile App)
- React Native (Expo) using the same backend API
- iOS & Android from single codebase
