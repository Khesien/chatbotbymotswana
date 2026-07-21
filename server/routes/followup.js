import express from 'express';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';


const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEADS_FILE = path.join(__dirname, '../data/leads.json');

// ── Email transport (SMTP) ──────────────────────────────────
const createTransport = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// ── POST /api/followup/email ────────────────────────────────
router.post('/email', async (req, res) => {
  try {
    const { to, toName, subject, body, leadId } = req.body;
    const secret = req.headers['x-admin-secret'];
    if (secret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'to, subject and body are required' });
    }
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(503).json({ error: 'Email not configured. Add SMTP_USER and SMTP_PASS to your .env file.' });
    }

    const transporter = createTransport();
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `Masheleng <${process.env.SMTP_USER}>`,
      to: `${toName || ''} <${to}>`.trim(),
      subject,
      text: body,
      html: body.replace(/\n/g, '<br>')
    });

    // Log note on lead
    if (leadId) {
      try {
        const leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
        const idx = leads.findIndex(l => l.id === leadId);
        if (idx !== -1) {
          leads[idx].status = 'Followed Up';
          leads[idx].notes = [
            ...leads[idx].notes,
            `Email sent: "${subject}" on ${new Date().toLocaleDateString()}`
          ];
          fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
        }
      } catch {}
    }

    res.json({ success: true, message: `Email sent to ${to}` });
  } catch (err) {
    console.error('Email error:', err);
    res.status(500).json({ error: err.message || 'Failed to send email' });
  }
});

// ── POST /api/followup/whatsapp ─────────────────────────────
router.post('/whatsapp', async (req, res) => {
  try {
    const { to, message, leadId } = req.body;
    const secret = req.headers['x-admin-secret'];
    if (secret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!to || !message) {
      return res.status(400).json({ error: 'to and message are required' });
    }
    if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_ID) {
      return res.status(503).json({ error: 'WhatsApp not configured. Add WHATSAPP_TOKEN and WHATSAPP_PHONE_ID to .env' });
    }

    // Strip non-digits from phone number
    const phone = to.replace(/\D/g, '');

    const response = await fetch(
      `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phone,
          type: 'text',
          text: { preview_url: false, body: message }
        })
      }
    );

    const result = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: result.error?.message || 'WhatsApp API error' });
    }

    // Log note on lead
    if (leadId) {
      try {
        const leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
        const idx = leads.findIndex(l => l.id === leadId);
        if (idx !== -1) {
          leads[idx].status = 'Followed Up';
          leads[idx].notes = [
            ...leads[idx].notes,
            `WhatsApp message sent on ${new Date().toLocaleDateString()}`
          ];
          fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
        }
      } catch {}
    }

    res.json({ success: true, messageId: result.messages?.[0]?.id });
  } catch (err) {
    console.error('WhatsApp send error:', err);
    res.status(500).json({ error: err.message || 'Failed to send WhatsApp message' });
  }
});

export default router;
