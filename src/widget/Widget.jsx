import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { sendChatMessage, saveLead, saveFeedback } from '../utils/api';

// ── Embeddable Floating Chat Widget ──────────────────────────
// This file is compiled into a self-contained bundle (masheleng-widget.js)
// that can be dropped onto any website with a single <script> tag.
//
// Usage:
//   <script src="https://yourserver.com/masheleng-widget.js"
//     data-color="#7c3aed"
//     data-position="bottom-right"
//     data-greeting="Hi! How can we help?"
//   ></script>

const GREETING = "Hey! 👋 I'm your Masheleng Financial Concierge. What's on your mind money-wise today?";

const QUICK_REPLIES = [
  "Just curious / want to learn",
  "Want to fix my finances",
  "I have money and want to invest",
  "I'm stressed about debt"
];

const Widget = ({ color = '#7c3aed', greeting = GREETING, position = 'bottom-right' }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ id: 'init', sender: 'bot', text: greeting }]);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [step, setStep] = useState('CHAT'); // CHAT, CAPTURE, DONE
  const [typing, setTyping] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing, step]);

  const addMsg = (sender, text) => setMessages(prev => [...prev, { id: `${sender}-${Date.now()}`, sender, text }]);

  const sendMsg = async (text) => {
    if (!text.trim() || typing || step !== 'CHAT') return;
    setInput('');
    addMsg('user', text);
    const hist = [...history, { sender: 'user', text }];
    setTyping(true);
    try {
      const { reply, wantsCapture } = await sendChatMessage(text, hist);
      setTyping(false);
      addMsg('bot', reply);
      const updHist = [...hist, { sender: 'bot', text: reply }];
      setHistory(updHist);
      if (wantsCapture || updHist.filter(m => m.sender === 'user').length >= 4) {
        setTimeout(() => setStep('CAPTURE'), 600);
      }
    } catch {
      setTyping(false);
      addMsg('bot', "Sorry — I had a connection issue. Could you try again?");
    }
  };

  const handleCapture = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    const concern = history.filter(m => m.sender === 'user').map(m => m.text).join(' | ').slice(0, 200);
    try {
      await saveLead({ name, email, channel: 'Web Widget', originalConcern: concern, path: 'General' });
      addMsg('bot', `Thanks, ${name}! We've got your details and will follow up soon. 🙌`);
      setStep('DONE');
    } catch {
      addMsg('bot', "Couldn't save your details — please try again.");
    }
  };

  const posStyle = position === 'bottom-left'
    ? { bottom: 24, left: 24 }
    : { bottom: 24, right: 24 };

  const styles = {
    // Floating button
    fab: { position: 'fixed', ...posStyle, width: 60, height: 60, borderRadius: '50%', background: color, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999998, transition: 'transform 0.2s', fontSize: 24 },
    // Panel container
    panel: { position: 'fixed', ...posStyle, width: 360, height: 520, borderRadius: 20, boxShadow: '0 12px 40px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 999999, fontFamily: "'Segoe UI', Arial, sans-serif", background: '#ffffff', border: '1px solid #e2e8f0', transform: open ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(20px)', opacity: open ? 1 : 0, pointerEvents: open ? 'all' : 'none', transition: 'all 0.25s cubic-bezier(.22,.61,.36,1)', transformOrigin: posStyle.right ? 'bottom right' : 'bottom left' },
    header: { background: '#ffffff', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #e2e8f0' },
    avatar: { width: 38, height: 38, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: '#fff' },
    msgs: { flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, background: '#f8fafc' },
    botBubble: { alignSelf: 'flex-start', background: '#f1f5f9', color: '#1f2937', borderRadius: '4px 16px 16px 16px', padding: '10px 14px', maxWidth: '80%', fontSize: 13, lineHeight: 1.5, border: '1px solid #e2e8f0' },
    userBubble: { alignSelf: 'flex-end', background: color, color: '#fff', borderRadius: '16px 4px 16px 16px', padding: '10px 14px', maxWidth: '80%', fontSize: 13, lineHeight: 1.5 },
    inputRow: { display: 'flex', padding: '10px', background: '#ffffff', gap: 8, borderTop: '1px solid #e2e8f0' },
    inputEl: { flex: 1, background: '#f1f5f9', border: '1px solid #cbd5e1', outline: 'none', borderRadius: 12, padding: '10px 14px', color: '#1f2937', fontSize: 13 },
    sendBtn: { width: 40, height: 40, borderRadius: '50%', background: color, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16 },
    chip: { background: '#ffffff', border: `1px solid ${color}22`, color: '#475569', borderRadius: 30, padding: '6px 14px', fontSize: 12, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' },
    formField: { width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 14px', color: '#1f2937', fontSize: 13, outline: 'none', boxSizing: 'border-box' },
    submitBtn: { width: '100%', background: color, border: 'none', borderRadius: 10, padding: '11px', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 8 },
  };

  return (
    <>
      {/* Floating button */}
      <button style={styles.fab} onClick={() => setOpen(o => !o)} aria-label="Open Masheleng chat">
        {open ? '✕' : '💬'}
      </button>

      {/* Panel */}
      <div style={styles.panel}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.avatar}>M</div>
          <div>
            <div style={{ color: '#1f2937', fontWeight: 700, fontSize: 14 }}>Masheleng</div>
            <div style={{ color: '#475569', fontSize: 11 }}>🟢 AI Financial Concierge</div>
          </div>
        </div>

        {/* Messages */}
        <div style={styles.msgs}>
          {messages.map(m => (
            <div key={m.id} style={m.sender === 'bot' ? styles.botBubble : styles.userBubble}
              dangerouslySetInnerHTML={{ __html: m.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
          ))}

          {typing && (
            <div style={{ ...styles.botBubble, display: 'flex', gap: 4, alignItems: 'center', padding: '10px 16px' }}>
              {[0,1,2].map(i => (
                <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#64748b', animation: `wdot 1s ease ${i*0.2}s infinite alternate`, display: 'inline-block' }} />
              ))}
            </div>
          )}

          {/* Quick replies on first message */}
          {!typing && step === 'CHAT' && messages.length === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              {QUICK_REPLIES.map(q => (
                <button key={q} style={styles.chip} onClick={() => sendMsg(q)}>{q}</button>
              ))}
            </div>
          )}

          {/* Lead capture */}
          {!typing && step === 'CAPTURE' && (
            <form onSubmit={handleCapture} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <div style={{ color: '#1f2937', fontSize: 13, fontWeight: 600 }}>📋 Leave your details</div>
              <input required value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={styles.formField} />
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email" style={styles.formField} />
              <button type="submit" style={styles.submitBtn}>Save Details</button>
            </form>
          )}

          {step === 'DONE' && (
            <div style={{ textAlign: 'center', color: '#16a34a', fontSize: 13, padding: '1rem' }}>✅ You're all set! We'll be in touch.</div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {step === 'CHAT' && (
          <div style={styles.inputRow}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMsg(input)}
              placeholder="Type a message…" style={styles.inputEl} disabled={typing} />
            <button style={styles.sendBtn} onClick={() => sendMsg(input)}>➤</button>
          </div>
        )}
      </div>

      <style>{`@keyframes wdot { from { opacity: 0.3; transform: scale(0.85); } to { opacity: 1; transform: scale(1.1); } }`}</style>
    </>
  );
};

// ── Auto-mount when loaded as a script tag ────────────────────
const script = document.currentScript || document.querySelector('script[src*="masheleng-widget"]');
const color = script?.getAttribute('data-color') || '#7c3aed';
const greeting = script?.getAttribute('data-greeting') || GREETING;
const position = script?.getAttribute('data-position') || 'bottom-right';

const container = document.createElement('div');
container.id = 'masheleng-widget-root';
document.body.appendChild(container);
createRoot(container).render(<Widget color={color} greeting={greeting} position={position} />);

export default Widget;
