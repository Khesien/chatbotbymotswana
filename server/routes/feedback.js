import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FEEDBACKS_FILE = path.join(__dirname, '../data/feedbacks.json');

const readFeedbacks = () => {
  try { return JSON.parse(fs.readFileSync(FEEDBACKS_FILE, 'utf8')); }
  catch { return []; }
};
const writeFeedbacks = (data) => {
  fs.writeFileSync(FEEDBACKS_FILE, JSON.stringify(data, null, 2));
};

// POST /api/feedback
router.post('/', (req, res) => {
  try {
    const { name, rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    const sentiment = rating >= 4 ? 'Positive' : rating === 3 ? 'Neutral' : 'Negative';
    const entry = {
      id: `fb-${Date.now()}`,
      name: name?.trim() || 'Anonymous',
      rating: Number(rating),
      comment: comment?.trim() || '',
      sentiment,
      date: new Date().toISOString()
    };
    const all = readFeedbacks();
    all.unshift(entry);
    writeFeedbacks(all);
    res.json({ success: true, feedback: entry });
  } catch (err) {
    console.error('Feedback error:', err);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

// GET /api/feedbacks (admin only)
router.get('/', (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json(readFeedbacks());
});

export default router;
