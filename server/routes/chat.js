import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

const SYSTEM_PROMPT = `You are the Masheleng Financial Concierge — a warm, intelligent, non-pushy financial coaching assistant. 

Your personality:
- Curious and empathetic, never judgmental
- Mirror the user's exact words back to them (if they say "stressed", use "stressed" in your reply)
- Never push hard sales. Guide, don't pressure.
- Keep responses concise (2-4 sentences max) and conversational
- Always end with a question that moves them forward

Your role is to understand the user's financial situation and route them to one of 4 paths:
1. BOOK — For curious solo learners who prefer reading at their own pace
2. UNIVERSITY — For community learners who do better in structured cohorts
3. MENTORSHIP — For people who want step-by-step 1-on-1 coaching to fix their finances
4. CONSULTATION — For people in debt/stress OR people with existing money who need a second opinion

Key rules:
- If user mentions debt, stress, loans, bills → lean toward CONSULTATION
- If user mentions investing, portfolio, growing money → lean toward CONSULTATION (second opinion)  
- If user mentions wanting to learn, books, reading → lean toward BOOK or UNIVERSITY
- If user mentions wanting consistent change, step-by-step, fixing habits → lean toward MENTORSHIP
- Always capture: their name, email if they agree to share, their primary concern in their OWN words

Masheleng products:
- "Masheleng Guide to Wealth" (Book) — self-paced ebook
- "Masheleng University" — 8-week structured cohort program
- "Masheleng Mentorship" — 1-on-1 advisor pairing, weekly check-ins
- "Masheleng Consultation" — Free 30-min call to map out a financial plan

Never fabricate prices, guarantees, or specific return figures. Keep everything real and grounded.`;

// POST /api/chat
router.post('/', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ 
        error: 'AI service not configured',
        fallback: true,
        reply: "I'm here to help! Could you tell me a bit more about your current financial situation — are you looking to learn, fix something stressful, or grow what you already have?"
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM_PROMPT
    });

    // Build conversation history for Gemini
    const chatHistory = history.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    const chat = model.startChat({ history: chatHistory });
    const result = await chat.sendMessage(message);
    const reply = result.response.text();

    // Detect routing intent from AI reply or user message
    const combinedText = (message + ' ' + reply).toLowerCase();
    let detectedPath = null;

    if (combinedText.includes('consultation') || combinedText.includes('book a call') || 
        combinedText.includes('free call') || combinedText.includes('30-min')) {
      detectedPath = 'Consultation';
    } else if (combinedText.includes('mentorship') || combinedText.includes('1-on-1') || 
               combinedText.includes('mentor')) {
      detectedPath = 'Mentorship';
    } else if (combinedText.includes('university') || combinedText.includes('cohort') || 
               combinedText.includes('community program')) {
      detectedPath = 'University';
    } else if (combinedText.includes('book') || combinedText.includes('ebook') || 
               combinedText.includes('guide to wealth')) {
      detectedPath = 'Book';
    }

    // Detect if AI is asking for lead capture
    const wantsCapture = reply.toLowerCase().includes('name') && 
                         reply.toLowerCase().includes('email');

    res.json({ 
      reply, 
      detectedPath,
      wantsCapture
    });

  } catch (err) {
    console.error('Gemini error:', err);
    res.status(500).json({ 
      error: 'AI request failed',
      fallback: true,
      reply: "I'm having a moment — could you repeat that? I want to make sure I understand your financial situation correctly."
    });
  }
});

export default router;
