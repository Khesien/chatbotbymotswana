import express from 'express';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';


const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEADS_FILE = path.join(__dirname, '../data/leads.json');

// Conversation memory (in-process, keyed by sender phone/psid)
const conversationHistory = {};

const SYSTEM_PROMPT = `You are the Masheleng Financial Concierge — a warm, intelligent, non-pushy financial coaching assistant.

Your personality:
- Curious and empathetic, never judgmental
- Mirror the user's exact words back (if they say "stressed", use "stressed" in your reply)
- Keep replies short: 1-3 sentences max for WhatsApp/Messenger
- Always move the conversation forward with a question
- Guide users toward: Book (solo learning), University (community cohort), Mentorship (1-on-1), or Consultation (free call)
- If user seems stressed or mentions debt → steer toward Consultation call
- If they have money and want to grow it → steer toward Consultation
- If they want to learn → Book or University
- If they want step-by-step change → Mentorship

At the right moment, ask for their name and email to register them. Keep the tone human and friendly.`;

const getAIReply = async (userMessage, senderKey) => {
  if (!process.env.GEMINI_API_KEY) {
    return "Thanks for reaching out to Masheleng! Our team will be with you shortly. In the meantime, could you tell us a bit about your current financial goal?";
  }
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', systemInstruction: SYSTEM_PROMPT });
    const history = conversationHistory[senderKey] || [];
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(userMessage);
    const reply = result.response.text();
    // Store updated history
    conversationHistory[senderKey] = [
      ...history,
      { role: 'user', parts: [{ text: userMessage }] },
      { role: 'model', parts: [{ text: reply }] }
    ];
    // Trim history to last 20 turns to save memory
    if (conversationHistory[senderKey].length > 40) {
      conversationHistory[senderKey] = conversationHistory[senderKey].slice(-40);
    }
    return reply;
  } catch (err) {
    console.error('Gemini error in webhook:', err);
    return "I'm having a moment — could you resend that? I want to make sure I'm giving you the right guidance.";
  }
};

const sendWhatsAppMessage = async (to, message) => {
  await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message }
    })
  });
};

const sendFacebookMessage = async (psid, message) => {
  await fetch(`https://graph.facebook.com/v20.0/me/messages?access_token=${process.env.FACEBOOK_PAGE_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: psid },
      message: { text: message }
    })
  });
};

const saveLead = (name, phone, channel, concern) => {
  try {
    const leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
    const exists = leads.find(l => l.phone === phone);
    if (exists) return;
    leads.unshift({
      id: `lead-${Date.now()}`,
      name: name || 'Unknown',
      email: 'N/A',
      phone,
      date: new Date().toISOString(),
      path: 'General',
      originalConcern: concern,
      keywords: [],
      bookingDate: null,
      status: 'New',
      channel,
      notes: [`Lead captured via ${channel} webhook`]
    });
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
  } catch (err) {
    console.error('Failed to save webhook lead:', err);
  }
};

// ── WHATSAPP WEBHOOK ─────────────────────────────────────────
// GET — Verification handshake
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('WhatsApp webhook verified');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// POST — Incoming messages
router.post('/whatsapp', async (req, res) => {
  res.sendStatus(200); // Always ACK immediately
  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const messages = change.value?.messages;
        if (!messages?.length) continue;

        for (const msg of messages) {
          if (msg.type !== 'text') continue;
          const phone = msg.from;
          const text = msg.text.body;
          const name = change.value?.contacts?.[0]?.profile?.name || 'Friend';
          const key = `wa_${phone}`;

          console.log(`WhatsApp message from ${name} (${phone}): ${text}`);
          saveLead(name, phone, 'WhatsApp', text);

          const reply = await getAIReply(text, key);
          await sendWhatsAppMessage(phone, reply);
        }
      }
    }
  } catch (err) {
    console.error('WhatsApp webhook error:', err);
  }
});

// ── FACEBOOK MESSENGER WEBHOOK ────────────────────────────────
// GET — Verification handshake
router.get('/facebook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.FACEBOOK_VERIFY_TOKEN) {
    console.log('Facebook webhook verified');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// POST — Incoming messages
router.post('/facebook', async (req, res) => {
  res.sendStatus(200); // Always ACK immediately
  try {
    const body = req.body;
    if (body.object !== 'page') return;

    for (const entry of body.entry || []) {
      for (const event of entry.messaging || []) {
        if (!event.message?.text) continue;
        const psid = event.sender.id;
        const text = event.message.text;
        const key = `fb_${psid}`;

        console.log(`Facebook message from PSID ${psid}: ${text}`);
        saveLead(`FB User ${psid.slice(-4)}`, psid, 'Facebook', text);

        const reply = await getAIReply(text, key);
        await sendFacebookMessage(psid, reply);
      }
    }
  } catch (err) {
    console.error('Facebook webhook error:', err);
  }
});

export default router;
