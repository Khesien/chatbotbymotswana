import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, BarChart2, MessageSquare, Mail, Calendar,
  Search, Send, RefreshCw, Star, AlertCircle, FileText,
  Smartphone, Globe, Lock, Unlock, CheckCircle, XCircle
} from 'lucide-react';
import { fetchLeads, fetchFeedbacks, updateLead, sendEmail, sendWhatsApp, checkHealth } from '../utils/api';

// ── Admin Login Gate ─────────────────────────────────────────
const AdminLogin = ({ onLogin }) => {
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    localStorage.setItem('masheleng_admin_secret', secret);
    try {
      await fetchLeads(); // If this works, secret is correct
      onLogin(secret);
    } catch {
      setError('Incorrect admin password. Check your .env file.');
      localStorage.removeItem('masheleng_admin_secret');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="copywriter-panel" style={{ maxWidth: 400, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--accent-primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Lock size={26} color="var(--accent-secondary)" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.4rem', fontWeight: 700 }}>Admin Access</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 6 }}>Enter your admin secret to access the Marketing Hub</p>
        </div>
        <form onSubmit={handleLogin}>
          <div className="chat-form-group">
            <label className="chat-form-label">Admin Secret</label>
            <input
              type="password"
              value={secret}
              onChange={e => setSecret(e.target.value)}
              placeholder="Enter ADMIN_SECRET from .env"
              className="chat-form-input"
              required
            />
          </div>
          {error && <p style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', marginBottom: 8 }}>{error}</p>}
          <button type="submit" disabled={loading} className="chat-form-submit">
            {loading ? 'Checking…' : 'Access Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ── Main Dashboard ────────────────────────────────────────────
const Dashboard = ({ health, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [leads, setLeads] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [pathFilter, setPathFilter] = useState('ALL');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Marketing state
  const [selectedLead, setSelectedLead] = useState(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [l, f] = await Promise.all([fetchLeads(), fetchFeedbacks()]);
      setLeads(l);
      setFeedbacks(f);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-populate email template when a lead is selected
  useEffect(() => {
    if (!selectedLead) return;
    setEmailSubject(`Following up on your Masheleng ${selectedLead.path} inquiry`);
    setEmailBody(
`Hi ${selectedLead.name},

Thank you for reaching out to Masheleng. You mentioned: "${selectedLead.originalConcern}".

We want to make sure we follow up personally and help you take the next step toward your financial goals.

${selectedLead.path === 'Consultation' && selectedLead.bookingDate
  ? `Your consultation is confirmed for ${new Date(selectedLead.bookingDate).toLocaleString([], { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}. We look forward to speaking with you.`
  : `Would you like to schedule a free 30-minute call so we can map out a clear plan together?`}

Best regards,
The Masheleng Team`
    );
    setSendResult(null);
  }, [selectedLead]);

  const handleSendEmail = async () => {
    if (!selectedLead) return;
    setSending(true);
    setSendResult(null);
    try {
      await sendEmail({ to: selectedLead.email, toName: selectedLead.name, subject: emailSubject, body: emailBody, leadId: selectedLead.id });
      setSendResult({ ok: true, msg: `Email sent to ${selectedLead.email}` });
      setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, status: 'Followed Up' } : l));
    } catch (err) {
      setSendResult({ ok: false, msg: err.message });
    } finally {
      setSending(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!selectedLead || !selectedLead.phone || selectedLead.phone === 'N/A') {
      setSendResult({ ok: false, msg: 'This lead has no phone number on file.' });
      return;
    }
    setSending(true);
    setSendResult(null);
    try {
      await sendWhatsApp({ to: selectedLead.phone, message: emailBody, leadId: selectedLead.id });
      setSendResult({ ok: true, msg: `WhatsApp sent to ${selectedLead.phone}` });
      setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, status: 'Followed Up' } : l));
    } catch (err) {
      setSendResult({ ok: false, msg: err.message });
    } finally {
      setSending(false);
    }
  };

  // Analytics
  const totalLeads = leads.length;
  const booked = leads.filter(l => l.bookingDate).length;
  const bookingRate = totalLeads > 0 ? Math.round((booked / totalLeads) * 100) : 0;
  const avgRating = feedbacks.length > 0 ? (feedbacks.reduce((a, b) => a + b.rating, 0) / feedbacks.length).toFixed(1) : '—';
  const channels = leads.reduce((a, l) => { a[l.channel || 'Web'] = (a[l.channel || 'Web'] || 0) + 1; return a; }, {});

  const filtered = leads.filter(l => {
    const q = search.toLowerCase();
    return (
      (l.name?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q) || l.originalConcern?.toLowerCase().includes(q)) &&
      (pathFilter === 'ALL' || l.path === pathFilter) &&
      (channelFilter === 'ALL' || l.channel === channelFilter) &&
      (statusFilter === 'ALL' || l.status === statusFilter)
    );
  });

  // SVG chart
  const chartW = 420, chartH = 180, pad = 32;
  const cW = chartW - pad * 2, cH = chartH - pad * 2;
  const dayLabels = [];
  const dayCounts = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    dayLabels.push(d.toLocaleDateString([], { weekday: 'short' }));
    const key = d.toISOString().split('T')[0];
    dayCounts.push(leads.filter(l => l.date?.startsWith(key)).length);
  }
  const maxV = Math.max(...dayCounts, 3);
  const pts = dayCounts.map((v, i) => ({
    x: pad + i * (cW / (dayCounts.length - 1)),
    y: pad + cH - (v / maxV) * cH,
    v
  }));

  return (
    <div className="dashboard-view">
      {/* Sidebar */}
      <div className="dashboard-sidebar">
        <div className="sidebar-heading">Marketing Hub</div>
        {[
          { id: 'overview', icon: <BarChart2 size={17} />, label: 'Overview' },
          { id: 'leads', icon: <Users size={17} />, label: `Leads (${totalLeads})` },
          { id: 'marketing', icon: <Mail size={17} />, label: 'Campaigns' },
          { id: 'integrations', icon: <Globe size={17} />, label: 'Integrations' },
          { id: 'feedback', icon: <MessageSquare size={17} />, label: 'Feedback' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`sidebar-btn ${activeTab === t.id ? 'active' : ''}`}>
            {t.icon} {t.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={onLogout} className="sidebar-btn" style={{ color: 'var(--accent-danger)' }}>
          <Lock size={16} /> Sign Out
        </button>
      </div>

      {/* Content */}
      <div className="dashboard-content">
        {loading && <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}><RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} /> Loading…</div>}
        {error && !loading && <div style={{ padding: '1.5rem', color: 'var(--accent-danger)', background: 'rgba(239,68,68,0.08)', borderRadius: 12, marginBottom: 16 }}>{error}</div>}

        {/* OVERVIEW */}
        {activeTab === 'overview' && !loading && (
          <>
            <div className="dashboard-page-title">
              Overview
              <button onClick={loadData} className="action-btn secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}>
                <RefreshCw size={13} /> Refresh
              </button>
            </div>

            {/* Service Status */}
            {health && (
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                {Object.entries(health.services).map(([svc, ok]) => (
                  <div key={svc} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', padding: '0.3rem 0.75rem', borderRadius: 20, background: ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: ok ? 'var(--accent-success)' : 'var(--accent-danger)', border: `1px solid ${ok ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.2)'}` }}>
                    {ok ? <CheckCircle size={12} /> : <XCircle size={12} />} {svc.charAt(0).toUpperCase() + svc.slice(1)}
                  </div>
                ))}
              </div>
            )}

            <div className="stats-grid">
              {[
                { label: 'Total Leads', val: totalLeads, sub: `WA: ${channels.WhatsApp || 0} · FB: ${channels.Facebook || 0} · Web: ${channels.Web || 0}`, color: 'purple', icon: <Users size={22} /> },
                { label: 'Booking Rate', val: `${bookingRate}%`, sub: `${booked} consultations booked`, color: 'blue', icon: <Calendar size={22} /> },
                { label: 'Avg Rating', val: avgRating === '—' ? '—' : `${avgRating}/5`, sub: `${feedbacks.length} reviews`, color: 'orange', icon: <Star size={22} fill="currentColor" /> },
                { label: 'Followed Up', val: leads.filter(l => l.status === 'Followed Up').length, sub: 'leads contacted', color: 'green', icon: <Mail size={22} /> }
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div className="stat-info">
                    <span className="stat-label">{s.label}</span>
                    <span className="stat-val">{s.val}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.sub}</span>
                  </div>
                  <div className={`stat-icon-box ${s.color}`}>{s.icon}</div>
                </div>
              ))}
            </div>

            {/* Lead growth chart */}
            <div className="chart-card-wrapper" style={{ marginBottom: '1.5rem' }}>
              <div className="chart-card-header">
                <span className="chart-title">Lead Growth (Last 7 Days)</span>
              </div>
              <div className="chart-content">
                <svg viewBox={`0 0 ${chartW} ${chartH}`} className="svg-chart-container">
                  <defs>
                    <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-primary)" />
                      <stop offset="100%" stopColor="var(--accent-secondary)" />
                    </linearGradient>
                    <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[0,1,2,3].map(i => {
                    const y = pad + i * (cH / 3);
                    return <g key={i}>
                      <line x1={pad} y1={y} x2={pad+cW} y2={y} className="chart-grid-line" />
                      <text x={pad-6} y={y+3} className="chart-text" textAnchor="end">{Math.round(maxV - i*(maxV/3))}</text>
                    </g>;
                  })}
                  {pts.map((p,i) => <text key={i} x={p.x} y={pad+cH+16} className="chart-text" textAnchor="middle">{dayLabels[i]}</text>)}
                  {pts.length > 1 && <>
                    <polygon points={`${pad},${pad+cH} ${pts.map(p=>`${p.x},${p.y}`).join(' ')} ${pad+cW},${pad+cH}`} fill="url(#ag)" />
                    <polyline points={pts.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="url(#cg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </>}
                  {pts.map((p,i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--bg-main)" stroke="var(--accent-secondary)" strokeWidth="2"><title>{p.v} leads</title></circle>)}
                </svg>
              </div>
            </div>
          </>
        )}

        {/* LEADS */}
        {activeTab === 'leads' && !loading && (
          <>
            <div className="dashboard-page-title">Leads Database <button onClick={loadData} className="action-btn secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}><RefreshCw size={13} /></button></div>
            <div className="leads-filters">
              <div className="search-input-wrapper" style={{ flex: 1 }}>
                <Search size={15} />
                <input className="search-input" placeholder="Search name, email, concern…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              {[
                { val: pathFilter, set: setPathFilter, opts: ['ALL','Book','University','Mentorship','Consultation','General'] },
                { val: channelFilter, set: setChannelFilter, opts: ['ALL','Web','WhatsApp','Facebook'] },
                { val: statusFilter, set: setStatusFilter, opts: ['ALL','New','Followed Up','Converted','Closed'] }
              ].map((f, i) => (
                <select key={i} value={f.val} onChange={e => f.set(e.target.value)} className="select-filter">
                  {f.opts.map(o => <option key={o} value={o}>{o === 'ALL' ? (i === 0 ? 'All Paths' : i === 1 ? 'All Channels' : 'All Statuses') : o}</option>)}
                </select>
              ))}
            </div>
            <div className="table-wrapper">
              <table className="leads-table">
                <thead><tr><th>Name</th><th>Channel</th><th>Email / Phone</th><th>Path</th><th>Concern</th><th>Booked</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {filtered.length ? filtered.map(l => (
                    <tr key={l.id}>
                      <td className="lead-name-col">{l.name}<div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(l.date).toLocaleDateString()}</div></td>
                      <td><span style={{ fontSize: '0.75rem', fontWeight: 600, color: l.channel === 'WhatsApp' ? 'var(--accent-success)' : l.channel === 'Facebook' ? 'var(--accent-info)' : 'var(--accent-primary)' }}>{l.channel}</span></td>
                      <td><div className="lead-contact-box"><span>{l.email}</span><span>{l.phone}</span></div></td>
                      <td><span className={`path-badge ${l.path}`}>{l.path}</span></td>
                      <td><div className="lead-concern-txt" title={l.originalConcern}>{l.originalConcern}</div></td>
                      <td style={{ fontSize: '0.78rem', color: l.bookingDate ? 'var(--accent-success)' : 'var(--text-muted)' }}>
                        {l.bookingDate ? new Date(l.bookingDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td><span className={`status-badge ${l.status?.replace(' ', '.')}`}>{l.status}</span></td>
                      <td>
                        <button className="action-btn primary" style={{ fontSize: '0.72rem', padding: '0.35rem 0.65rem', borderRadius: 7 }}
                          onClick={() => { setSelectedLead(l); setActiveTab('marketing'); }}>
                          <Mail size={11} /> Follow-up
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}><AlertCircle size={20} style={{ marginBottom: 6, opacity: 0.4 }} /><br />No leads match your filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* CAMPAIGNS */}
        {activeTab === 'marketing' && !loading && (
          <>
            <div className="dashboard-page-title">Campaigns & Follow-up</div>
            <div className="marketing-grid">
              {/* Lead picker */}
              <div>
                <span className="sidebar-heading" style={{ paddingLeft: 0, display: 'block', marginBottom: '0.75rem' }}>Select Lead</span>
                <div className="leads-sidebar-list">
                  {leads.map(l => (
                    <div key={l.id} onClick={() => setSelectedLead(l)}
                      className={`lead-select-card ${selectedLead?.id === l.id ? 'active' : ''}`}>
                      <div className="lead-select-header">
                        <span className="lead-select-name">{l.name}</span>
                        <span className={`path-badge ${l.path}`} style={{ fontSize: '0.62rem', padding: '0.08rem 0.35rem' }}>{l.path}</span>
                      </div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.email}</div>
                      <div style={{ fontSize: '0.68rem', color: l.channel === 'WhatsApp' ? 'var(--accent-success)' : l.channel === 'Facebook' ? 'var(--accent-info)' : 'var(--text-muted)', marginTop: 2 }}>{l.channel} · {l.status}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Composer */}
              <div>
                <span className="sidebar-heading" style={{ paddingLeft: 0, display: 'block', marginBottom: '0.75rem' }}>Message Composer</span>
                {selectedLead ? (
                  <div className="copywriter-panel">
                    <div className="copywriter-meta-info">
                      <div className="copywriter-meta-item"><span className="copywriter-meta-label">To</span><span className="copywriter-meta-val">{selectedLead.name}</span></div>
                      <div className="copywriter-meta-item"><span className="copywriter-meta-label">Email</span><span className="copywriter-meta-val">{selectedLead.email}</span></div>
                      <div className="copywriter-meta-item"><span className="copywriter-meta-label">Phone</span><span className="copywriter-meta-val">{selectedLead.phone}</span></div>
                      <div className="copywriter-meta-item"><span className="copywriter-meta-label">Path</span><span className="copywriter-meta-val" style={{ color: 'var(--accent-secondary)' }}>{selectedLead.path}</span></div>
                    </div>
                    <div className="chat-form-group">
                      <label className="chat-form-label">Email Subject</label>
                      <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} className="chat-form-input" />
                    </div>
                    <div className="chat-form-group">
                      <label className="chat-form-label">Message Body (Email & WhatsApp)</label>
                      <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={9}
                        className="chat-form-input" style={{ fontFamily: 'monospace', fontSize: '0.82rem', lineHeight: 1.5 }} />
                    </div>

                    {sendResult && (
                      <div style={{ padding: '0.6rem 0.9rem', borderRadius: 10, fontSize: '0.82rem', background: sendResult.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: sendResult.ok ? 'var(--accent-success)' : 'var(--accent-danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {sendResult.ok ? <CheckCircle size={14} /> : <XCircle size={14} />} {sendResult.msg}
                      </div>
                    )}

                    <div className="copywriter-actions">
                      <button onClick={handleSendWhatsApp} disabled={sending} className="action-btn secondary">
                        <Smartphone size={15} /> Send WhatsApp
                      </button>
                      <button onClick={handleSendEmail} disabled={sending} className="action-btn primary">
                        {sending ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={15} />}
                        {sending ? 'Sending…' : 'Send Email'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="copywriter-panel">
                    <div className="copywriter-empty"><FileText size={44} style={{ opacity: 0.25 }} /><span>Select a lead to compose a follow-up</span></div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* INTEGRATIONS */}
        {activeTab === 'integrations' && (
          <>
            <div className="dashboard-page-title">Integrations & Channels</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px,1fr))', gap: '1.5rem' }}>
              {[
                {
                  title: 'WhatsApp Business API', icon: <Smartphone size={20} />, color: 'var(--accent-success)',
                  status: health?.services?.whatsapp, badge: 'green',
                  steps: [
                    'Go to developers.facebook.com → Create App → WhatsApp',
                    'Get your Phone Number ID and generate a Permanent Token',
                    'Set Webhook URL to: https://YOUR_DOMAIN/webhook/whatsapp',
                    'Set Verify Token to the value of WHATSAPP_VERIFY_TOKEN in .env',
                    'Subscribe to the "messages" webhook field'
                  ]
                },
                {
                  title: 'Facebook Messenger API', icon: <Globe size={20} />, color: 'var(--accent-info)',
                  status: health?.services?.facebook, badge: 'blue',
                  steps: [
                    'Go to developers.facebook.com → Create App → Messenger',
                    'Connect your Facebook Page and generate a Page Access Token',
                    'Set Webhook URL to: https://YOUR_DOMAIN/webhook/facebook',
                    'Set Verify Token to FACEBOOK_VERIFY_TOKEN value in .env',
                    'Subscribe to "messages" and "messaging_postbacks" events'
                  ]
                },
                {
                  title: 'Google Gemini AI', icon: <BarChart2 size={20} />, color: 'var(--accent-warning)',
                  status: health?.services?.ai, badge: 'orange',
                  steps: [
                    'Visit aistudio.google.com',
                    'Sign in with a Google account',
                    'Click "Get API Key" → Create a new key',
                    'Copy the key into GEMINI_API_KEY in your .env file',
                    'Restart the backend server'
                  ]
                },
                {
                  title: 'Email (SMTP)', icon: <Mail size={20} />, color: 'var(--accent-secondary)',
                  status: health?.services?.email, badge: 'purple',
                  steps: [
                    'Enable 2-Factor Auth on your Gmail account',
                    'Go to myaccount.google.com/apppasswords',
                    'Create an App Password → select "Mail"',
                    'Set SMTP_USER=your@gmail.com and SMTP_PASS=app_password in .env',
                    'Optionally use SendGrid or Mailgun for production volume'
                  ]
                }
              ].map(card => (
                <div key={card.title} className="chart-card-wrapper">
                  <div className="chart-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: card.color }}>{card.icon}</span>
                      <span className="chart-title">{card.title}</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.18rem 0.55rem', borderRadius: 20, background: card.status ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)', color: card.status ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                      {card.status ? 'Connected' : 'Not Configured'}
                    </span>
                  </div>
                  <ol style={{ paddingLeft: '1.2rem', margin: '0.75rem 0 0', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {card.steps.map((s, i) => (
                      <li key={i} style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{s}</li>
                    ))}
                  </ol>
                  <div style={{ marginTop: '1rem', padding: '0.7rem', background: 'var(--bg-input)', borderRadius: 10, fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                    Add to <strong>server/.env</strong> file · Restart with <code>npm run server</code>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* FEEDBACK */}
        {activeTab === 'feedback' && !loading && (
          <>
            <div className="dashboard-page-title">Feedback Center</div>
            {feedbacks.length === 0
              ? <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No feedback submitted yet.</div>
              : <div className="feedback-grid">
                  {feedbacks.map(fb => (
                    <div key={fb.id} className="feedback-card">
                      <div className="feedback-card-header">
                        <span className="feedback-author">{fb.name}</span>
                        <span className={`sentiment-badge ${fb.sentiment}`}>{fb.sentiment}</span>
                      </div>
                      <div className="feedback-rating">
                        {[1,2,3,4,5].map(s => <Star key={s} size={14} fill={s <= fb.rating ? 'currentColor' : 'none'} />)}
                      </div>
                      <div className="feedback-comment">"{fb.comment}"</div>
                      <div className="feedback-date">{new Date(fb.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                  ))}
                </div>
            }
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// ── Exported Wrapper with Admin Gate ─────────────────────────
const DashboardWrapper = ({ health }) => {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem('masheleng_admin_secret'));

  const handleLogout = () => {
    localStorage.removeItem('masheleng_admin_secret');
    setAuthed(false);
  };

  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />;
  return <Dashboard health={health} onLogout={handleLogout} />;
};

export default DashboardWrapper;
