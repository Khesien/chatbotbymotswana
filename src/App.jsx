import React, { useState, useEffect } from 'react';
import Chatbot from './components/Chatbot';
import Dashboard from './components/Dashboard';
import { checkHealth } from './utils/api';

const TABS = ['Chatbot', 'Marketing Hub'];
const CHANNELS = ['Web', 'WhatsApp', 'Facebook'];

export default function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [channel, setChannel] = useState('Web');
  const [health, setHealth] = useState(null);
  const [serverOnline, setServerOnline] = useState(null); // null = checking
  const [toast, setToast] = useState(null);

  // Check backend server health on mount
  useEffect(() => {
    const ping = async () => {
      const result = await checkHealth();
      setHealth(result);
      setServerOnline(!!result);
    };
    ping();
    const interval = setInterval(ping, 30000); // Re-check every 30s
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleNewLead = (lead) => {
    showToast(`New lead: ${lead.name} (${lead.path})`, 'success');
  };

  const handleNewFeedback = (fb) => {
    showToast(`New ${fb.sentiment} feedback: ${fb.rating}/5 stars`, fb.sentiment === 'Positive' ? 'success' : 'info');
  };

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <div className="logo-container">
          <div className="logo-icon">M</div>
          <div>
            <div className="logo-text">Masheleng</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Financial Concierge Platform</div>
          </div>
        </div>

        <div className="nav-tabs">
          {TABS.map((tab, i) => (
            <button key={i} onClick={() => setActiveTab(i)}
              className={`nav-tab ${activeTab === i ? 'active' : ''}`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Channel selector (only on Chatbot tab) */}
          {activeTab === 0 && (
            <div className="nav-tabs" style={{ padding: '0.15rem', gap: '2px', borderRadius: '8px' }}>
              {CHANNELS.map(ch => (
                <button key={ch} onClick={() => setChannel(ch)}
                  className={`nav-tab ${channel === ch ? 'active' : ''}`}
                  style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', borderRadius: '6px' }}>
                  {ch}
                </button>
              ))}
            </div>
          )}

          {/* Server status indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 500, color: serverOnline === null ? 'var(--text-muted)' : serverOnline ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: serverOnline === null ? 'var(--text-muted)' : serverOnline ? 'var(--accent-success)' : 'var(--accent-danger)', display: 'inline-block' }}></span>
            {serverOnline === null ? 'Connecting…' : serverOnline ? 'Backend Online' : 'Backend Offline'}
          </div>
        </div>
      </header>

      {/* Server offline warning banner */}
      {serverOnline === false && (
        <div style={{ background: 'hsla(350, 80%, 50%, 0.08)', borderBottom: '1px solid hsla(350, 80%, 50%, 0.15)', padding: '0.6rem 1.5rem', fontSize: '0.82rem', color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
          ⚠️ Backend server is offline. Run <code style={{ background: 'rgba(0,0,0,0.05)', padding: '0.15rem 0.4rem', borderRadius: 4, color: 'var(--text-main)' }}>npm run server</code> in a separate terminal to enable AI, leads, and integrations.
        </div>
      )}

      {/* Main Content */}
      <main className="app-main">
        {activeTab === 0 && (
          <Chatbot key={channel} channel={channel} onNewLead={handleNewLead} onNewFeedback={handleNewFeedback} />
        )}
        {activeTab === 1 && <Dashboard health={health} />}
      </main>

      {/* Toast notification */}
      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
