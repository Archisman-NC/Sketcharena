# SketchArena Deployment Guide

## 🚀 Quick Deploy (Render.com)

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Deploy Backend
1. Go to [render.com](https://render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repo
4. Settings:
   - Name: `sketcharena-backend`
   - Root Directory: `backend`
   - Build: `npm run build`
   - Start: `npm start`
   - Instance Type: Free
5. Environment Variables:
   ```
   PORT=3000
   FRONTEND_URL=https://your-frontend-url.onrender.com
   ```

### Step 3: Deploy Frontend
1. Click "New" → "Static Site"
2. Settings:
   - Name: `sketcharena-frontend`
   - Root Directory: `frontend`
   - Build: `npm run build`
   - Publish: `dist`
3. Environment Variables:
   ```
   VITE_BACKEND_URL=https://your-backend-url.onrender.com
   ```

### Step 4: Update URLs
After both deploy, update the environment variables:
- Backend: Set `FRONTEND_URL` to your frontend URL
- Frontend: Set `VITE_BACKEND_URL` to your backend URL

## 🎯 That's it! Your app will be live at:
- Frontend: `https://sketcharena-frontend.onrender.com`
- Backend: `https://sketcharena-backend.onrender.com`

## 🐳 Alternative: Docker Deploy
```bash
docker-compose up -d
```
Access at `http://localhost`
