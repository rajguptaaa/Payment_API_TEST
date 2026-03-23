import React, { useState, useRef, useEffect } from 'react';
import './App.css';

const BASE_URL_DEFAULT = 'http://localhost:3000';

const ENDPOINTS = [
  {
    id: 'register',
    label: 'Register',
    method: 'POST',
    path: '/api/auth/register',
    description: 'Create a new user account',
    category: 'AUTH',
    defaultBody: JSON.stringify({ name: "John Doe", email: "john@example.com", password: "password123" }, null, 2),
    requiresAuth: false,
  },
  {
    id: 'login',
    label: 'Login',
    method: 'POST',
    path: '/api/auth/login',
    description: 'Authenticate and receive a JWT token',
    category: 'AUTH',
    defaultBody: JSON.stringify({ email: "john@example.com", password: "password123" }, null, 2),
    requiresAuth: false,
  },
  {
    id: 'logout',
    label: 'Logout',
    method: 'POST',
    path: '/api/auth/logout',
    description: 'Invalidate current session token',
    category: 'AUTH',
    defaultBody: '{}',
    requiresAuth: true,
  },
  {
    id: 'create-account',
    label: 'Create Account',
    method: 'POST',
    path: '/api/account',
    description: 'Create a new bank account for logged-in user',
    category: 'ACCOUNT',
    defaultBody: JSON.stringify({ systemUser: false }, null, 2),
    requiresAuth: true,
  },
  {
    id: 'get-accounts',
    label: 'Get Accounts',
    method: 'GET',
    path: '/api/account',
    description: 'Retrieve all accounts of the current user',
    category: 'ACCOUNT',
    defaultBody: null,
    requiresAuth: true,
  },
  {
    id: 'get-balance',
    label: 'Get Balance',
    method: 'GET',
    path: '/api/account/balance/:accountId',
    description: 'Get balance of a specific account',
    category: 'ACCOUNT',
    defaultBody: null,
    requiresAuth: true,
    hasPathParam: true,
    pathParamKey: 'accountId',
    pathParamPlaceholder: 'Enter account ID',
  },
  {
    id: 'send-money',
    label: 'Send Money',
    method: 'POST',
    path: '/api/transaction',
    description: 'Transfer funds between two accounts',
    category: 'TRANSACTION',
    defaultBody: JSON.stringify({
      fromAccount: "<accountId>",
      toAccount: "<accountId>",
      amount: 100,
      idempotencyKey: "unique-key-" + Date.now()
    }, null, 2),
    requiresAuth: true,
  },
  {
    id: 'initial-funds',
    label: 'Add Initial Funds',
    method: 'POST',
    path: '/api/transaction/system/initial-funds',
    description: 'Add initial funds via system account (system auth required)',
    category: 'TRANSACTION',
    defaultBody: JSON.stringify({
      toAccount: "<accountId>",
      amount: 1000,
      idempotencyKey: "init-" + Date.now()
    }, null, 2),
    requiresAuth: true,
    isSystemAuth: true,
  },
];

const METHOD_COLORS = {
  GET: '#4ade80',
  POST: '#60a5fa',
  PUT: '#f59e0b',
  DELETE: '#f87171',
  PATCH: '#a78bfa',
};

const CATEGORY_ICONS = {
  AUTH: '🔐',
  ACCOUNT: '🏦',
  TRANSACTION: '💸',
};

function formatJson(str) {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}

function StatusBadge({ status }) {
  let color = '#94a3b8';
  if (status >= 200 && status < 300) color = '#4ade80';
  else if (status >= 400 && status < 500) color = '#f59e0b';
  else if (status >= 500) color = '#f87171';

  return (
    <span style={{
      color,
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '13px',
      fontWeight: 600,
      background: color + '18',
      padding: '2px 10px',
      borderRadius: '4px',
      border: `1px solid ${color}40`,
    }}>
      {status}
    </span>
  );
}

function EndpointCard({ endpoint, baseUrl, globalToken }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState(endpoint.defaultBody || '');
  const [token, setToken] = useState('');
  const [pathParam, setPathParam] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [duration, setDuration] = useState(null);
  const responseRef = useRef(null);

  useEffect(() => {
    if (globalToken && endpoint.requiresAuth) {
      setToken(globalToken);
    }
  }, [globalToken, endpoint.requiresAuth]);

  const resolvedPath = endpoint.hasPathParam
    ? endpoint.path.replace(`:${endpoint.pathParamKey}`, pathParam || `:${endpoint.pathParamKey}`)
    : endpoint.path;

  const fullUrl = `${baseUrl}${resolvedPath}`;

  async function handleSend() {
    setLoading(true);
    setResponse(null);
    setError(null);
    setDuration(null);

    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = {
      method: endpoint.method,
      headers,
      credentials: 'include',
    };

    if (endpoint.method !== 'GET' && body.trim()) {
      try {
        JSON.parse(body);
        options.body = body;
      } catch {
        setError({ message: 'Invalid JSON in request body' });
        setLoading(false);
        return;
      }
    }

    const start = performance.now();
    try {
      const res = await fetch(fullUrl, options);
      const elapsed = Math.round(performance.now() - start);
      setDuration(elapsed);
      let data;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }
      setResponse({ status: res.status, data });
      setTimeout(() => responseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    } catch (err) {
      setDuration(Math.round(performance.now() - start));
      setError({ message: err.message || 'Network error. Is the server running?' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`endpoint-card ${open ? 'open' : ''}`}>
      <button className="endpoint-header" onClick={() => setOpen(!open)}>
        <div className="endpoint-left">
          <span className="method-badge" style={{ color: METHOD_COLORS[endpoint.method], borderColor: METHOD_COLORS[endpoint.method] + '50', background: METHOD_COLORS[endpoint.method] + '12' }}>
            {endpoint.method}
          </span>
          <span className="endpoint-path">{resolvedPath}</span>
          {endpoint.requiresAuth && <span className="auth-tag">AUTH</span>}
          {endpoint.isSystemAuth && <span className="auth-tag system">SYSTEM</span>}
        </div>
        <div className="endpoint-right">
          <span className="endpoint-desc">{endpoint.description}</span>
          <span className={`chevron ${open ? 'up' : ''}`}>▾</span>
        </div>
      </button>

      {open && (
        <div className="endpoint-body">
          <div className="endpoint-body-inner">
            {/* URL Bar */}
            <div className="url-display">
              <span className="url-label">REQUEST</span>
              <span className="url-value">{fullUrl}</span>
            </div>

            {/* Path Param */}
            {endpoint.hasPathParam && (
              <div className="input-group">
                <label>Path Parameter — <code>{endpoint.pathParamKey}</code></label>
                <input
                  className="text-input"
                  placeholder={endpoint.pathParamPlaceholder}
                  value={pathParam}
                  onChange={e => setPathParam(e.target.value)}
                />
              </div>
            )}

            {/* Token */}
            {endpoint.requiresAuth && (
              <div className="input-group">
                <label>Bearer Token <span className="dim">(auto-filled from global token)</span></label>
                <input
                  className="text-input mono"
                  placeholder="Paste JWT token here..."
                  value={token}
                  onChange={e => setToken(e.target.value)}
                />
              </div>
            )}

            {/* Body */}
            {endpoint.method !== 'GET' && (
              <div className="input-group">
                <div className="label-row">
                  <label>Request Body <span className="dim">JSON</span></label>
                  <button className="mini-btn" onClick={() => setBody(formatJson(body))}>Format</button>
                </div>
                <textarea
                  className="json-editor"
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={8}
                  spellCheck={false}
                />
              </div>
            )}

            {/* Send Button */}
            <button
              className={`send-btn ${loading ? 'loading' : ''}`}
              onClick={handleSend}
              disabled={loading}
              style={{ '--method-color': METHOD_COLORS[endpoint.method] }}
            >
              {loading ? (
                <><span className="spinner" /> Sending...</>
              ) : (
                <><span>▶</span> Send {endpoint.method} Request</>
              )}
            </button>

            {/* Response */}
            {(response || error) && (
              <div className="response-panel" ref={responseRef}>
                <div className="response-header">
                  <span className="response-title">RESPONSE</span>
                  {response && (
                    <div className="response-meta">
                      <StatusBadge status={response.status} />
                      {duration !== null && <span className="duration">{duration}ms</span>}
                    </div>
                  )}
                  {error && <span className="error-label">ERROR</span>}
                </div>
                <pre className="response-body">
                  {error
                    ? `⚠ ${error.message}`
                    : typeof response.data === 'string'
                      ? response.data
                      : JSON.stringify(response.data, null, 2)
                  }
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [baseUrl, setBaseUrl] = useState(BASE_URL_DEFAULT);
  const [globalToken, setGlobalToken] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [tokenVisible, setTokenVisible] = useState(false);

  const categories = ['ALL', 'AUTH', 'ACCOUNT', 'TRANSACTION'];
  const filtered = activeCategory === 'ALL'
    ? ENDPOINTS
    : ENDPOINTS.filter(e => e.category === activeCategory);

  const grouped = filtered.reduce((acc, ep) => {
    if (!acc[ep.category]) acc[ep.category] = [];
    acc[ep.category].push(ep);
    return acc;
  }, {});

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">⬡</div>
          <div>
            <div className="logo-title">BankAPI</div>
            <div className="logo-sub">Endpoint Tester</div>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">BASE URL</div>
          <input
            className="base-url-input"
            value={baseUrl}
            onChange={e => setBaseUrl(e.target.value)}
            placeholder="http://localhost:3000"
          />
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">GLOBAL TOKEN</div>
          <div className="token-input-wrap">
            <input
              className="base-url-input"
              type={tokenVisible ? 'text' : 'password'}
              value={globalToken}
              onChange={e => setGlobalToken(e.target.value)}
              placeholder="Paste JWT after login..."
            />
            <button className="toggle-vis" onClick={() => setTokenVisible(v => !v)}>
              {tokenVisible ? '🙈' : '👁'}
            </button>
          </div>
          {globalToken && <div className="token-hint">✓ Auto-fills auth fields</div>}
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">FILTER</div>
          <div className="cat-filters">
            {categories.map(cat => (
              <button
                key={cat}
                className={`cat-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat !== 'ALL' && CATEGORY_ICONS[cat]} {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="endpoint-count">{ENDPOINTS.length} endpoints</div>
          <div className="sidebar-tip">💡 Login first, copy the token, paste it above.</div>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        <div className="main-header">
          <div>
            <h1 className="page-title">
              {activeCategory === 'ALL' ? 'All Endpoints' : `${CATEGORY_ICONS[activeCategory]} ${activeCategory}`}
            </h1>
            <p className="page-sub">{filtered.length} endpoint{filtered.length !== 1 ? 's' : ''} • Click any to expand and test</p>
          </div>
          <div className="server-status">
            <span className="status-dot" />
            <span>{baseUrl}</span>
          </div>
        </div>

        <div className="endpoints-list">
          {Object.entries(grouped).map(([cat, eps]) => (
            <div key={cat} className="category-group">
              {activeCategory === 'ALL' && (
                <div className="category-heading">
                  <span>{CATEGORY_ICONS[cat]}</span>
                  <span>{cat}</span>
                  <div className="category-line" />
                </div>
              )}
              {eps.map(ep => (
                <EndpointCard
                  key={ep.id}
                  endpoint={ep}
                  baseUrl={baseUrl}
                  globalToken={globalToken}
                />
              ))}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
