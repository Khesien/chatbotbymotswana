import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEADS_FILE = path.join(__dirname, '../data/leads.json');

const readLeads = () => {
  try {
    return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
  } catch {
    return [];
  }
};

const writeLeads = (leads) => {
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
};

// POST /api/lead — Save new lead
router.post('/', (req, res) => {
  try {
    const { name, email, phone, path, originalConcern, keywords, bookingDate, channel } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const leads = readLeads();

    // Prevent duplicate emails
    const exists = leads.find(l => l.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return res.json({ success: true, lead: exists, duplicate: true });
    }

    const newLead = {
      id: `lead-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || 'N/A',
      date: new Date().toISOString(),
      path: path || 'General',
      originalConcern: originalConcern || '',
      keywords: keywords || [],
      bookingDate: bookingDate || null,
      status: 'New',
      channel: channel || 'Web',
      notes: [`Lead registered via ${channel || 'Web'} channel on ${new Date().toLocaleDateString()}`]
    };

    leads.unshift(newLead);
    writeLeads(leads);

    res.json({ success: true, lead: newLead });
  } catch (err) {
    console.error('Lead save error:', err);
    res.status(500).json({ error: 'Failed to save lead' });
  }
});

// GET /api/leads — Get all leads (admin only)
router.get('/', (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json(readLeads());
});

// PATCH /api/lead/:id — Update lead status/notes
router.patch('/:id', (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const leads = readLeads();
    const idx = leads.findIndex(l => l.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Lead not found' });

    leads[idx] = { ...leads[idx], ...req.body, id: leads[idx].id };
    writeLeads(leads);
    res.json({ success: true, lead: leads[idx] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

export default router;
