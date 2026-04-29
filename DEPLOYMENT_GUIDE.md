# MuseumPass - Deployment & Fix Guide

## ✅ Login Page Fixes Applied

### Issues Fixed
1. **CORS Headers** - Enhanced CORS configuration for Vercel and production environments
2. **Credentials Handling** - Added proper fetch credentials for same-origin requests
3. **Preflight Requests** - Explicit OPTIONS request handling for all deployment scenarios
4. **Serverless Support** - Added explicit CORS header middleware for Vercel/AWS Lambda

### What Was Changed

#### 1. Server CORS Configuration (`server/server.js`)
- ✅ Enhanced CORS to allow all localhost variants in development
- ✅ Added explicit CORS middleware for Vercel/production
- ✅ Proper OPTIONS request handling
- ✅ Flexible origin checking for deployed environments

#### 2. API Client (`js/api.js`)
- ✅ Added `credentials: 'include'` to fetch requests
- ✅ Proper error handling for non-JSON responses
- ✅ Better API base URL detection

---

## 🚀 Deployment to Vercel

### Step 1: Prerequisites
```bash
npm install -g vercel
```

### Step 2: Push to GitHub
```bash
git add .
git commit -m "Fix: Login page CORS and deployment issues"
git push origin main
```

### Step 3: Deploy to Vercel
```bash
cd c:\Users\HP\OneDrive\Desktop\new
vercel --prod
```

### Step 4: Environment Variables (Vercel Dashboard)
Set these in your Vercel project settings:

```
NODE_ENV=production
JWT_SECRET=museumpass_super_secret_key_2026
JWT_EXPIRES_IN=7d
API_KEY=mp_api_key_2026_secure
CLIENT_URL=https://your-project.vercel.app
```

---

## 🧪 Test Your Login Page

### Local Testing (Before Deployment)
```bash
# Terminal 1: Start the server
cd server
npm start

# Terminal 2: Test login endpoint
# Use these credentials:
# Customer: visitor@museum.com / visitor123
# Employee: EMP001 / staff123
# Admin: admin / admin123

# Visit: http://localhost:5000/auth.html
```

### Post-Deployment Testing
1. Visit: `https://your-project.vercel.app/auth.html`
2. Try login with demo credentials:
   - **Customer Tab**: `visitor@museum.com` / `visitor123`
   - **Staff Tab**: `EMP001` / `staff123`
   - **Manager Tab**: `admin` / `admin123`
3. You should be redirected to the appropriate dashboard

---

## 🔍 Troubleshooting

### Login Button Does Nothing
- Check browser console (F12) for JavaScript errors
- Verify `/api/health` returns `{"ok":true}`
- Check Network tab - POST to `/api/auth/login` should return 200

### CORS Errors in Console
- **Local**: Should be fixed by server CORS middleware
- **Vercel**: Check that `CLIENT_URL` environment variable is set
- **Browser**: May see warnings but login should work

### Invalid Credentials Error
- Demo user may not exist in database
- Check `/server/db.js` for seeding code
- Restart server: `npm start` in server folder

### Database Not Found
- Run `cd server && npm start` - it auto-creates database
- Check that `server/museumpass.db` exists
- On Vercel, database copies to `/tmp` automatically

---

## 📋 Architecture

### File Structure
```
c:\Users\HP\OneDrive\Desktop\new
├── auth.html              # Login page
├── js/
│   ├── api.js            # API client (FIXED)
│   ├── auth.js           # Auth logic
│   └── data.js           # Mock data
├── server/
│   ├── server.js         # Express app (FIXED CORS)
│   ├── db.js             # SQLite database
│   ├── routes/
│   │   ├── auth.js       # Login/Register endpoints
│   │   └── ...
│   └── middleware/
│       └── auth.js       # JWT verification
├── api/
│   └── index.js          # Vercel serverless entry point
├── vercel.json           # Vercel config
└── package.json
```

### How It Works
1. **Local Development**: Express server serves all files + API
2. **Vercel Production**: 
   - `/api/*` routes → `api/index.js` (serverless function)
   - Other routes → Static files
   - Database in `/tmp` (ephemeral - use external DB for persistence)

---

## 🔐 Security Notes

- JWT expires in 7 days (configurable via `JWT_EXPIRES_IN`)
- Passwords hashed with bcryptjs
- CORS restricted to allowed origins
- API key header required: `x-api-key: mp_api_key_2026_secure`

---

## ✨ Testing Checklist

- [ ] Local login works at `http://localhost:5000/auth.html`
- [ ] All 3 user roles can login
- [ ] Deployed URL works: `https://your-project.vercel.app/auth.html`
- [ ] No CORS errors in browser console
- [ ] Login redirects to correct dashboard
- [ ] Session stored in localStorage
- [ ] Token included in subsequent API calls

---

## 📞 Support

If login still doesn't work after these fixes:

1. Check server logs: `npm start` output in Terminal
2. Open browser DevTools (F12) → Console tab
3. Check Network tab → POST to `/api/auth/login`
4. Verify response Status Code and Headers

Common Issues:
- **401 Unauthorized** → Wrong credentials
- **404 Not Found** → Route doesn't exist or API server not running
- **500 Server Error** → Check server logs and database
- **CORS Error** → Check `Access-Control-Allow-Origin` header

