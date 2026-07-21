const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const adminSecret = () => localStorage.getItem('masheleng_admin_secret') || '';

const handle = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
};

// ── AI Chat ──────────────────────────────────────────────────
export const sendChatMessage = async (message, history = []) => {
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history })
  });
  return handle(res);
};

// ── Leads ────────────────────────────────────────────────────
export const saveLead = async (lead) => {
  const res = await fetch(`${BASE}/api/lead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lead)
  });
  return handle(res);
};

export const fetchLeads = async () => {
  const res = await fetch(`${BASE}/api/leads`, {
    headers: { 'x-admin-secret': adminSecret() }
  });
  return handle(res);
};

export const updateLead = async (id, updates) => {
  const res = await fetch(`${BASE}/api/lead/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': adminSecret()
    },
    body: JSON.stringify(updates)
  });
  return handle(res);
};

// ── Feedback ─────────────────────────────────────────────────
export const saveFeedback = async (feedback) => {
  const res = await fetch(`${BASE}/api/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(feedback)
  });
  return handle(res);
};

export const fetchFeedbacks = async () => {
  const res = await fetch(`${BASE}/api/feedbacks`, {
    headers: { 'x-admin-secret': adminSecret() }
  });
  return handle(res);
};

// ── Follow-up ────────────────────────────────────────────────
export const sendEmail = async ({ to, toName, subject, body, leadId }) => {
  const res = await fetch(`${BASE}/api/followup/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': adminSecret()
    },
    body: JSON.stringify({ to, toName, subject, body, leadId })
  });
  return handle(res);
};

export const sendWhatsApp = async ({ to, message, leadId }) => {
  const res = await fetch(`${BASE}/api/followup/whatsapp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': adminSecret()
    },
    body: JSON.stringify({ to, message, leadId })
  });
  return handle(res);
};

// ── Server health ────────────────────────────────────────────
export const checkHealth = async () => {
  try {
    const res = await fetch(`${BASE}/health`);
    return handle(res);
  } catch {
    return null;
  }
};
