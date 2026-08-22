# Deploy Instructions

## Step 1: Push to GitHub
git init
git add .
git commit -m "MedRadar initial build"
Create repo on github.com named "medradar"
git remote add origin https://github.com/[yourusername]/medradar.git
git push -u origin main

## Step 2: Deploy to Vercel
1. vercel.com → Add New Project → Import from GitHub → select medradar repo
2. Framework: Next.js (auto-detected)
3. Environment Variables: add all from your .env.local file one by one
4. Click Deploy
5. Wait for build to complete (~2 minutes)
6. Copy your deployment URL: https://medradar-xxxx.vercel.app

## Step 3: Configure Twilio Webhook
1. Twilio Console → Messaging → Settings → WhatsApp Sandbox Settings
2. "When a message comes in" field: https://medradar-xxxx.vercel.app/api/webhook/twilio
3. HTTP Method: POST
4. Save
5. Test: text any message to +1 415 523 8886 from your joined WhatsApp

## Step 4: Verify Everything
- Open https://medradar-xxxx.vercel.app → patient page loads
- Open https://medradar-xxxx.vercel.app/dashboard → red heatmap visible
- Text "Metformin" to +1 415 523 8886 → should ask for location
- Share location → should return pharmacy list
- Dashboard simulate button → should show success
