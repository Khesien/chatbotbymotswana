// This file is intentionally minimal.
// All data is fetched from the backend API (server/index.js).
// See src/utils/api.js for all API helper functions.

export const RE_ENGAGEMENT_TEMPLATES = [
  {
    id: 're1',
    name: 'Long Absence — Check In',
    subject: 'We\'ve been thinking about you',
    body: (name) => `Hi ${name},

It's been a while since we last connected, and we just wanted to check in.

Life gets busy — especially when you're juggling financial goals and everything else going on. We're here whenever you're ready to take the next step.

Is there anything we can help you with today?

With care,
The Masheleng Team`
  },
  {
    id: 're2',
    name: 'Post-Consultation Follow-up',
    subject: 'How are things going after your consultation?',
    body: (name) => `Hi ${name},

A little while back you had a consultation with our team. We'd love to know how things have been going for you.

Have you been able to make any progress toward your goals? We're here to support you — whether that's booking another session or just answering a question.

Here for you,
The Masheleng Team`
  },
  {
    id: 're3',
    name: 'Special Offer — Re-Engage',
    subject: 'A personal invitation back to Masheleng',
    body: (name) => `Hi ${name},

We're inviting a select group of people — including you — to a free 30-minute financial reset call.

No sales pitch. Just a genuine conversation about where you are and where you want to go.

Would you like to book a slot? Simply reply to this email and we'll set it up.

Talk soon,
The Masheleng Team`
  }
];
