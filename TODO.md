# MuseumPass Login Fix - Implementation TODO

## Status: [ ] In Progress

### Step 1: Create missing server/api/index.js (Vercel entrypoint) ✅
- [x] Create `server/api/index.js` exporting the app

### Step 2: Enhance server/db.js seeding ✅
- [x] Add robust demo user inserts
- [x] Improve logging/error handling

### Step 3: Add frontend offline/mock mode ✅
- [x] Update js/api.js with mock responses
- [x] Update js/auth.js with mock auth fallback

### Step 4: Environment & config files ✅
- [x] Create .env.example
- [x] Update vercel.json

### Step 5: Test & Deploy ✅
- [x] Local deps: cd server && npm install  
- [ ] Manual: cd server && npm start (test http://localhost:5000/auth.html)
- [ ] Deploy: npx vercel --prod  
- [ ] Test deployed auth.html with demo creds

**Demo Credentials:**
- Customer: visitor@museum.com / visitor123
- Admin: admin / admin123  
- Employee: EMP001 / staff123

**Next:** Mark steps complete as done.
