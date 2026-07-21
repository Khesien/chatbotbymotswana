import React, { useState, useEffect, useRef } from 'react';
import { Send, Calendar, User, Star, MessageSquare, Check, Cpu } from 'lucide-react';
import { sendChatMessage, saveLead, saveFeedback } from '../utils/api';

const Chatbot = ({ onNewLead, onNewFeedback, channel = 'Web' }) => {
  const GREETING = channel === 'WhatsApp'
    ? "Hi! Welcome to Masheleng on WhatsApp 👋 What's on your mind money-wise today?"
    : channel === 'Facebook'
      ? "Hello! Thanks for messaging Masheleng on Facebook 👋 What's your current financial goal?"
      : "Hey! Thanks for reaching out to Masheleng 👋 What's on your mind money-wise right now — building it, fixing something stressful, or just figuring out where to start?";

  const [messages, setMessages] = useState([
    { id: 'init', sender: 'bot', text: GREETING, timestamp: new Date().toISOString() }
  ]);
  const [history, setHistory] = useState([]); // For Gemini conversation context
  const [step, setStep] = useState('CHAT'); // CHAT, BOOKING, LEAD_CAPTURE, FEEDBACK, DONE
  const [routedPath, setRoutedPath] = useState(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Lead form state
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [savedLead, setSavedLead] = useState(null);

  // Feedback state
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');

  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, step]);

  // Channel theme
  useEffect(() => {
    const root = document.documentElement;
    if (channel === 'WhatsApp') {
      root.style.setProperty('--accent-primary', 'hsl(142, 60%, 40%)');
      root.style.setProperty('--accent-primary-glow', 'hsla(142, 60%, 40%, 0.12)');
    } else if (channel === 'Facebook') {
      root.style.setProperty('--accent-primary', 'hsl(214, 80%, 48%)');
      root.style.setProperty('--accent-primary-glow', 'hsla(214, 80%, 48%, 0.12)');
    } else {
      root.style.setProperty('--accent-primary', 'hsl(256, 75%, 54%)');
      root.style.setProperty('--accent-primary-glow', 'hsla(256, 75%, 54%, 0.12)');
    }
  }, [channel]);

  const addMessage = (sender, text) => {
    const msg = { id: `${sender}-${Date.now()}`, sender, text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, msg]);
    return msg;
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isLoading || step !== 'CHAT') return;
    setInput('');

    addMessage('user', text);
    const newHistory = [...history, { sender: 'user', text }];

    setIsTyping(true);
    setIsLoading(true);
    try {
      const { reply, detectedPath, wantsCapture } = await sendChatMessage(text, newHistory);
      setIsTyping(false);
      addMessage('bot', reply);

      const updatedHistory = [...newHistory, { sender: 'bot', text: reply }];
      setHistory(updatedHistory);

      if (detectedPath && !routedPath) setRoutedPath(detectedPath);

      // Transition to lead capture when AI wants it or after enough back-and-forth
      if (wantsCapture || updatedHistory.filter(m => m.sender === 'user').length >= 4) {
        setTimeout(() => setStep('LEAD_CAPTURE'), 800);
      }
    } catch (err) {
      setIsTyping(false);
      addMessage('bot', "I'm having a moment connecting — please try again in a second.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    if (!leadName.trim() || !leadEmail.trim()) return;

    const pathToSave = routedPath || (selectedSlot ? 'Consultation' : 'General');
    const concern = history.filter(m => m.sender === 'user').map(m => m.text).join(' | ').slice(0, 300);

    const lead = {
      name: leadName.trim(),
      email: leadEmail.trim(),
      phone: leadPhone.trim() || 'N/A',
      path: pathToSave,
      originalConcern: concern || 'Reached out via chatbot',
      keywords: routedPath ? [routedPath.toLowerCase()] : [],
      bookingDate: selectedSlot || null,
      channel
    };

    try {
      const { lead: saved } = await saveLead(lead);
      setSavedLead(saved);
      onNewLead?.(saved);

      const confirmMsg = selectedSlot
        ? `Perfect! Your consultation is booked for **${new Date(selectedSlot).toLocaleString([], { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}**. A confirmation will be sent to ${leadEmail}. How was your experience with our chat today?`
        : `You're all set! We've saved your details and will follow up at **${leadEmail}** shortly. Would you mind leaving a quick rating?`;

      addMessage('bot', confirmMsg);
      setStep('FEEDBACK');
    } catch (err) {
      addMessage('bot', "There was an issue saving your details — please try again.");
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) return;
    try {
      const fb = await saveFeedback({
        name: leadName || 'Anonymous',
        rating,
        comment: feedbackComment.trim()
      });
      onNewFeedback?.(fb.feedback);
      addMessage('bot', "Thank you so much! Your feedback helps us improve Masheleng for everyone. Have an amazing day! 🚀");
      setStep('DONE');
    } catch {
      addMessage('bot', "Couldn't save feedback — but thank you for chatting with us!");
      setStep('DONE');
    }
  };

  const slots = (() => {
    const out = [];
    for (let d = 1; d <= 3; d++) {
      for (const hour of [10, 14, 16]) {
        const date = new Date();
        date.setDate(date.getDate() + d);
        date.setHours(hour, hour === 16 ? 30 : 0, 0, 0);
        out.push({
          label: date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          value: date.toISOString()
        });
      }
    }
    return out;
  })();

  const avatarColor = channel === 'WhatsApp' ? '#25d366' : channel === 'Facebook' ? '#0084ff' : 'var(--accent-primary)';
  const avatarLetter = channel === 'WhatsApp' ? 'W' : channel === 'Facebook' ? 'f' : 'M';

  return (
    <div className="chatbot-view">
      <div className="chat-card">

        {/* Header */}
        <div className="chat-header">
          <div className="chat-bot-info">
            <div className="bot-avatar" style={{ background: avatarColor }}>
              {avatarLetter}
              <span className="bot-status-indicator"></span>
            </div>
            <div>
              <div className="bot-title" style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                Masheleng {channel !== 'Web' ? `${channel} Assistant` : 'Financial Concierge'}
              </div>
              <div className="bot-subtitle" style={{ color: 'var(--text-muted)' }}>
                <Cpu size={11} /> AI-Powered · Typically replies instantly
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-success)', display: 'inline-block' }}></span>
            Online
          </div>
        </div>

        {/* Messages */}
        <div className="chat-messages" style={{ background: channel === 'WhatsApp' ? 'hsl(140, 20%, 97%)' : undefined }}>
          {messages.map(msg => (
            <div key={msg.id} className={`message-row ${msg.sender}`}>
              <div
                className="message-bubble"
                dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
              />
            </div>
          ))}

          {isTyping && (
            <div className="message-row bot">
              <div className="message-bubble">
                <div className="typing-indicator">
                  <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                </div>
              </div>
            </div>
          )}

          {/* Booking calendar */}
          {!isTyping && step === 'BOOKING' && (
            <div className="chat-form-card" style={{ maxWidth: '85%', margin: '0 auto' }}>
              <div className="chat-form-title"><Calendar size={18} /> Select a Consultation Slot</div>
              <div className="calendar-grid">
                {slots.map((s, i) => (
                  <div key={i} onClick={() => setSelectedSlot(s.value)}
                    className={`calendar-slot ${selectedSlot === s.value ? 'selected' : ''}`}>
                    {s.label.split(' at ')[0]}<br /><strong>{s.label.split(' at ')[1]}</strong>
                  </div>
                ))}
              </div>
              <button disabled={!selectedSlot} className="chat-form-submit"
                onClick={() => {
                  addMessage('user', `I'll take ${new Date(selectedSlot).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`);
                  addMessage('bot', "Great choice! Now let me grab your contact details to lock in that slot.");
                  setStep('LEAD_CAPTURE');
                }}>
                Confirm Slot
              </button>
            </div>
          )}

          {/* Lead capture form */}
          {!isTyping && step === 'LEAD_CAPTURE' && (
            <form onSubmit={handleLeadSubmit} className="chat-form-card" style={{ maxWidth: '85%', margin: '0 auto' }}>
              <div className="chat-form-title"><User size={18} /> Your Details</div>
              <div className="chat-form-group">
                <label className="chat-form-label">Full Name *</label>
                <input required value={leadName} onChange={e => setLeadName(e.target.value)}
                  placeholder="Your name" className="chat-form-input" />
              </div>
              <div className="chat-form-group">
                <label className="chat-form-label">Email Address *</label>
                <input type="email" required value={leadEmail} onChange={e => setLeadEmail(e.target.value)}
                  placeholder="you@example.com" className="chat-form-input" />
              </div>
              <div className="chat-form-group">
                <label className="chat-form-label">Phone (Optional)</label>
                <input type="tel" value={leadPhone} onChange={e => setLeadPhone(e.target.value)}
                  placeholder="+27 XX XXX XXXX" className="chat-form-input" />
              </div>
              {!selectedSlot && routedPath === 'Consultation' && (
                <>
                  <div className="chat-form-group">
                    <label className="chat-form-label">Preferred Call Slot</label>
                    <div className="calendar-grid">
                      {slots.slice(0, 6).map((s, i) => (
                        <div key={i} onClick={() => setSelectedSlot(s.value)}
                          className={`calendar-slot ${selectedSlot === s.value ? 'selected' : ''}`}>
                          {s.label.split(' at ')[0]}<br /><strong>{s.label.split(' at ')[1]}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <button type="submit" className="chat-form-submit">Save & Continue</button>
            </form>
          )}

          {/* Feedback form */}
          {!isTyping && step === 'FEEDBACK' && (
            <form onSubmit={handleFeedbackSubmit} className="chat-form-card" style={{ maxWidth: '85%', margin: '0 auto' }}>
              <div className="chat-form-title"><MessageSquare size={18} /> Rate Your Experience</div>
              <div className="feedback-stars-container">
                {[1,2,3,4,5].map(s => (
                  <button type="button" key={s}
                    onClick={() => setRating(s)}
                    onMouseEnter={() => setHoverRating(s)}
                    onMouseLeave={() => setHoverRating(0)}
                    className={`star-btn ${(hoverRating || rating) >= s ? 'filled' : ''}`}>
                    <Star size={28} fill={(hoverRating || rating) >= s ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
              <div className="chat-form-group">
                <label className="chat-form-label">Comments (Optional)</label>
                <textarea rows={2} value={feedbackComment} onChange={e => setFeedbackComment(e.target.value)}
                  placeholder="Tell us what you liked or how we can improve..." className="chat-form-input" style={{ resize: 'none' }} />
              </div>
              <button type="submit" disabled={rating === 0} className="chat-form-submit">Submit Feedback</button>
            </form>
          )}

          {step === 'DONE' && (
            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--accent-success)' }}>
              <div style={{ display: 'inline-flex', padding: 10, background: 'rgba(16,185,129,0.1)', borderRadius: '50%', marginBottom: 8 }}>
                <Check size={28} />
              </div>
              <div style={{ fontWeight: 600 }}>All done — we'll be in touch!</div>
              <button className="action-btn secondary"
                onClick={() => {
                  setMessages([{ id: 'init2', sender: 'bot', text: GREETING, timestamp: new Date().toISOString() }]);
                  setHistory([]); setStep('CHAT'); setRoutedPath(null);
                  setLeadName(''); setLeadEmail(''); setLeadPhone('');
                  setSelectedSlot(null); setRating(0); setFeedbackComment('');
                }}
                style={{ margin: '1rem auto 0', padding: '0.5rem 1.2rem', fontSize: '0.82rem' }}>
                Start New Chat
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Quick-action chips when no pending form */}
        {step === 'CHAT' && messages.length === 1 && (
          <div style={{ padding: '0 1.25rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {[
              "Just curious / want to learn",
              "Want to fix my finances / need a change",
              "Already have money / want to invest",
              "In debt / stressed about money"
            ].map(opt => (
              <button key={opt} className="choice-chip" onClick={() => {
                setInput(opt);
                setTimeout(() => document.getElementById('chat-send-btn')?.click(), 50);
              }}>
                <span>{opt}</span><Send size={13} />
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSend} className="chat-input-area">
          <div className="chat-input-wrapper">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={isLoading || step !== 'CHAT'}
              placeholder={step === 'CHAT' ? 'Type your message…' : 'Use the form above to continue…'}
              className="chat-text-input"
            />
            <button
              id="chat-send-btn"
              type="submit"
              disabled={!input.trim() || isLoading || step !== 'CHAT'}
              className="input-send-btn"
            >
              <Send size={15} />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default Chatbot;
