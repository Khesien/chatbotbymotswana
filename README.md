# Masheleng AI Financial Concierge — Production Setup Guide

A fully functional AI-powered chatbot platform with real WhatsApp, Facebook Messenger, and email integrations. Built with React + Node.js.

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Edit `server/.env` with your real credentials:
```env
GEMINI_API_KEY=       # From aistudio.google.com
ADMIN_SECRET=         # Choose a strong admin password
SMTP_USER=            # Your Gmail address
SMTP_PASS=            # Gmail App Password
```

### 3. Run both servers (two terminals)

**Terminal 1 — Frontend:**
```bash
npm run dev
```
→ Opens at http://localhost:5173

**Terminal 2 — Backend:**
```bash
npm run server
```
→ Runs at http://localhost:3001

---

## Getting Your API Keys

### 🤖 Google Gemini AI (Required)
1. Visit https://aistudio.google.com
2. Sign in with Google
3. Click **"Get API Key"** → Create new key
4. Copy to `GEMINI_API_KEY` in `server/.env`

### 📱 WhatsApp Business API
1. Go to https://developers.facebook.com → Create App → Select **"Business"**
2. Add the **WhatsApp** product to your app
3. Go to WhatsApp → Getting Started → note your **Phone Number ID**
4. Generate a **System User Token** (permanent, not temporary)
5. In your app settings, set webhook URL to:
   ```
   https://YOUR_DOMAIN/webhook/whatsapp
   ```
6. Set Verify Token to: `masheleng_whatsapp_verify_2026` (or your custom value)
7. Subscribe to the **"messages"** field

### 💬 Facebook Messenger API
1. Go to https://developers.facebook.com → Create App → **"Consumer"**
2. Add **Messenger** product
3. Connect your Facebook Page → Generate Page Access Token
4. Set webhook URL to:
   ```
   https://YOUR_DOMAIN/webhook/facebook
   ```
5. Set Verify Token to: `masheleng_facebook_verify_2026`
6. Subscribe to **"messages"** and **"messaging_postbacks"**

### 📧 Email (Gmail)
1. Enable 2-Factor Authentication on your Gmail
2. Go to https://myaccount.google.com/apppasswords
3. Create an App Password → select **"Mail"**
4. Copy the 16-character password to `SMTP_PASS` in `.env`

---

## Embedding the Widget on Any Website

After running `npm run build:widget`, a file `dist-widget/masheleng-widget.iife.js` is generated.

**Option A: Direct script tag**
```html
<script 
  src="https://YOUR_DOMAIN/masheleng-widget.iife.js"
  data-color="#7c3aed"
  data-position="bottom-right"
  data-greeting="Hi! How can I help you today?">
</script>
```

**Option B: Host on CDN and embed**
Upload `masheleng-widget.iife.js` to any CDN and reference it the same way.

**Customisation attributes:**
| Attribute | Default | Description |
|-----------|---------|-------------|
| `data-color` | `#7c3aed` | Primary brand color |
| `data-position` | `bottom-right` | `bottom-right` or `bottom-left` |
| `data-greeting` | Default message | Custom opening message |

---

## Production Deployment

### Deploy backend (e.g. Railway, Render, Fly.io)
```bash
# Set all environment variables in your hosting dashboard
# Then deploy:
git push
```

### Deploy frontend (e.g. Vercel, Netlify)
```bash
VITE_API_URL=https://your-backend.railway.app npm run build
```
Then deploy the `dist/` folder.

### Set `VITE_API_URL` for the widget
```bash
VITE_API_URL=https://your-backend.railway.app npm run build:widget
```

---

## Architecture

```
Frontend (React/Vite)    →  Backend (Node.js/Express)
  Chatbot.jsx              POST /api/chat     → Gemini AI
  Dashboard.jsx            GET  /api/leads    → leads.json
  Widget.jsx               POST /api/followup/email   → Nodemailer
                           POST /api/followup/whatsapp → Meta API
                           POST /webhook/whatsapp  ← Meta sends here
                           POST /webhook/facebook  ← Meta sends here
```

---

## Admin Dashboard

1. Open http://localhost:5173 → Click **"Marketing Hub"**
2. Enter your `ADMIN_SECRET` from `.env`
3. Default: `masheleng_admin_2026`

Dashboard features:
- 📊 Live analytics with lead growth chart
- 👥 Full leads database with filters
- 📬 Email + WhatsApp composer per lead
- 🔗 Integration status & setup guides
- ⭐ Feedback centre

---

## Project Structure

```
chatbot/
├── server/
│   ├── index.js              # Express server entry
│   ├── .env                  # Your secrets (never commit!)
│   ├── .env.example          # Safe template to share
│   ├── data/
│   │   ├── leads.json        # Persistent lead storage
│   │   └── feedbacks.json    # Persistent feedback storage
│   └── routes/
│       ├── chat.js           # Gemini AI chat
│       ├── leads.js          # Lead CRUD
│       ├── feedback.js       # Feedback storage
│       ├── followup.js       # Email + WhatsApp sending
│       └── webhooks.js       # Live WA + FB webhooks
├── src/
│   ├── App.jsx               # Root + health check
│   ├── components/
│   │   ├── Chatbot.jsx       # Main chatbot UI
│   │   └── Dashboard.jsx     # Admin marketing hub
│   ├── widget/
│   │   └── Widget.jsx        # Embeddable floating widget
│   └── utils/
│       ├── api.js            # All backend API calls
│       └── mockData.js       # Email templates
├── vite.config.js            # Main app build
└── vite.widget.config.js     # Widget build
```

---

## Support

For integration help or customisation, contact Motswana Intelligence Development Team.
