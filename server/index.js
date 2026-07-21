import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

import express from 'express';
import cors from 'cors';
import chatRouter from './routes/chat.js';
import leadsRouter from './routes/leads.js';
import feedbackRouter from './routes/feedback.js';
import followupRouter from './routes/followup.js';
import webhooksRouter from './routes/webhooks.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    /\.masheleng\.com$/,   // Allow all masheleng subdomains
    /localhost:\d+$/       // Allow any localhost port in dev
  ],
  credentials: true
}));

// Raw body needed for Facebook signature verification
app.use('/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
  if (req.body && Buffer.isBuffer(req.body)) {
    req.rawBody = req.body;
    req.body = JSON.parse(req.body.toString());
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ───────────────────────────────────────────────────
app.use('/api/chat', chatRouter);
app.use('/api/lead', leadsRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/feedbacks', feedbackRouter);
app.use('/api/followup', followupRouter);
app.use('/webhook', webhooksRouter);

// ── Health check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      ai: !!process.env.GEMINI_API_KEY,
      whatsapp: !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID),
      facebook: !!process.env.FACEBOOK_PAGE_TOKEN,
      email: !!(process.env.SMTP_USER && process.env.SMTP_PASS)
    }
  });
});

// ── 404 handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Error handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Masheleng Backend running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   AI:        ${process.env.GEMINI_API_KEY ? '✅ Gemini connected' : '⚠️  No GEMINI_API_KEY'}`);
  console.log(`   WhatsApp:  ${process.env.WHATSAPP_TOKEN ? '✅ Connected' : '⚠️  Not configured'}`);
  console.log(`   Facebook:  ${process.env.FACEBOOK_PAGE_TOKEN ? '✅ Connected' : '⚠️  Not configured'}`);
  console.log(`   Email:     ${process.env.SMTP_USER ? '✅ SMTP ready' : '⚠️  Not configured'}\n`);
});
