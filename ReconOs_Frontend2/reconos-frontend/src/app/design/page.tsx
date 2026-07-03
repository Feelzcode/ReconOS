import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'UI/UX Design Guide — ReconOS',
  description:
    'ReconOS design reference for the Nomba API Hackathon 2026 — Stripe-inspired dashboard, brand colors, and screen patterns.',
};

const STYLES = `
  .ux-guide {
    --primary: #111827;
    --bg: #F9FAFB;
    --border: #E5E7EB;
    --muted: #6B7280;
    --info: #2563EB;
  }
  .ux-guide * { box-sizing: border-box; }
  .ux-guide {
    background: var(--bg);
    color: var(--primary);
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
    line-height: 1.55;
    min-height: 100vh;
  }
  .ux-guide .page {
    max-width: 860px;
    margin: 0 auto;
    padding: 56px 24px 80px;
  }
  .ux-guide .doc-header {
    margin-bottom: 40px;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--border);
  }
  .ux-guide .doc-header h1 {
    font-size: 28px;
    margin: 0 0 6px;
  }
  .ux-guide .tag {
    color: var(--muted);
    font-size: 14px;
  }
  .ux-guide .back-link {
    display: inline-block;
    margin-bottom: 20px;
    font-size: 13px;
    color: var(--info);
    text-decoration: none;
  }
  .ux-guide .back-link:hover { text-decoration: underline; }
  .ux-guide h2 {
    font-size: 18px;
    margin: 40px 0 12px;
    padding-top: 4px;
  }
  .ux-guide h3 {
    font-size: 15px;
    margin: 24px 0 8px;
    color: #1F2937;
  }
  .ux-guide p {
    font-size: 14.5px;
    color: #374151;
    margin: 0 0 12px;
  }
  .ux-guide ul {
    font-size: 14.5px;
    color: #374151;
    padding-left: 20px;
  }
  .ux-guide li { margin-bottom: 4px; }
  .ux-guide strong { color: var(--primary); }
  .ux-guide code {
    font-family: 'SF Mono', 'Fira Code', monospace;
    background: #F3F4F6;
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 13px;
  }
  .ux-guide table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0 20px;
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
    font-size: 13.5px;
  }
  .ux-guide th,
  .ux-guide td {
    text-align: left;
    padding: 9px 14px;
    border-bottom: 1px solid var(--border);
  }
  .ux-guide th {
    background: #FAFAFB;
    font-size: 11.5px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--muted);
    font-weight: 600;
  }
  .ux-guide tr:last-child td { border-bottom: none; }
  .ux-guide .swatch {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 3px;
    margin-right: 6px;
    vertical-align: middle;
    border: 1px solid rgba(0,0,0,0.08);
  }
  .ux-guide .diagram-box {
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 18px 20px;
    font-size: 13.5px;
    color: #374151;
    margin: 12px 0 20px;
  }
  .ux-guide .diagram-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }
  .ux-guide .diagram-chip {
    background: #F3F4F6;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 5px 10px;
    font-size: 12.5px;
    font-weight: 600;
  }
  .ux-guide .arrow { color: var(--muted); }
  .ux-guide .section-nav {
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px 20px;
    margin-bottom: 8px;
    font-size: 13px;
  }
  .ux-guide .section-nav a {
    color: var(--info);
    text-decoration: none;
    display: block;
    padding: 3px 0;
  }
  .ux-guide .section-nav a:hover { text-decoration: underline; }
  .ux-guide .section-nav-title {
    font-size: 11.5px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
    margin-bottom: 8px;
    font-weight: 600;
  }
  .ux-guide .link-list a {
    color: var(--info);
    word-break: break-all;
  }
  @media print {
    .ux-guide { background: #fff; }
    .ux-guide .page { max-width: none; padding: 20px; }
    .ux-guide .back-link { display: none; }
  }
`;

export default function DesignGuidePage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="ux-guide">
        <div className="page">
          <Link href="/" className="back-link">
            ← ReconOS home
          </Link>

          <header className="doc-header">
            <h1>ReconOS — UI/UX Design Guide</h1>
            <div className="tag">Nomba API Hackathon 2026 · Design reference for judges and reviewers</div>
          </header>

          <nav className="section-nav">
            <div className="section-nav-title">Contents</div>
            <a href="#philosophy">Design philosophy</a>
            <a href="#modes">Two visual modes</a>
            <a href="#layout">Layout architecture</a>
            <a href="#screens">Key screens</a>
            <a href="#responsive">Responsive behavior</a>
            <a href="#motion">Motion &amp; feedback</a>
            <a href="#accessibility">Accessibility &amp; copy</a>
            <a href="#inspiration">Design inspiration</a>
            <a href="#urls">Live URLs</a>
          </nav>

          <h2 id="philosophy">Design philosophy</h2>
          <p>
            ReconOS is a <strong>payment operations</strong> product, not a consumer app. The interface is
            designed for finance staff, bursars, and operations teams who need clarity under pressure —
            inspired by <strong>Stripe Dashboard</strong> and modern fintech admin UIs.
          </p>

          <table>
            <thead>
              <tr>
                <th>Principle</th>
                <th>How we apply it</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Clarity over decoration</strong></td>
                <td>Dense data presented in scannable cards and tables</td>
              </tr>
              <tr>
                <td><strong>Trust through structure</strong></td>
                <td>Consistent layout, predictable navigation, visible status</td>
              </tr>
              <tr>
                <td><strong>Merchant-first language</strong></td>
                <td>&quot;Students&quot; not &quot;Nomba VA&quot;; payment rail hidden in footer</td>
              </tr>
              <tr>
                <td><strong>Progressive disclosure</strong></td>
                <td>Summary stats → drill-down tables → expandable match details</td>
              </tr>
              <tr>
                <td><strong>Mobile-ready operations</strong></td>
                <td>Card layouts on phone/tablet; full tables on desktop (≥1024px)</td>
              </tr>
            </tbody>
          </table>

          <h2 id="modes">Two visual modes</h2>

          <h3>1. Marketing &amp; auth (homepage, login, signup)</h3>
          <p>Dark/light theme toggle. Optimized for storytelling and conversion.</p>
          <table>
            <thead>
              <tr>
                <th>Token</th>
                <th>Dark mode</th>
                <th>Light mode</th>
                <th>Usage</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Brand blue</td>
                <td><span className="swatch" style={{ background: '#2563EB' }} />#2563EB</td>
                <td><span className="swatch" style={{ background: '#2563EB' }} />#2563EB</td>
                <td>Logo, CTAs, links, awaiting-payment accent</td>
              </tr>
              <tr>
                <td>Blue hover</td>
                <td><span className="swatch" style={{ background: '#1D4ED8' }} />#1D4ED8</td>
                <td><span className="swatch" style={{ background: '#1D4ED8' }} />#1D4ED8</td>
                <td>Button hover</td>
              </tr>
              <tr>
                <td>Blue accent</td>
                <td><span className="swatch" style={{ background: '#60A5FA' }} />#60A5FA</td>
                <td><span className="swatch" style={{ background: '#60A5FA' }} />#60A5FA</td>
                <td>Highlights, gradients</td>
              </tr>
              <tr>
                <td>Gradient CTA</td>
                <td>#2563EB → #7C3AED</td>
                <td>Same</td>
                <td>Hero avatars, feature pills</td>
              </tr>
              <tr>
                <td>Background</td>
                <td>Deep navy / charcoal</td>
                <td>White / off-white</td>
                <td>Page shell</td>
              </tr>
              <tr>
                <td>Text</td>
                <td>High-contrast white/gray</td>
                <td>#111827 body</td>
                <td>Headlines &amp; copy</td>
              </tr>
            </tbody>
          </table>
          <p>
            <strong>Homepage:</strong> Split narrative — live payment event stream on the left, product story on
            the right. Animated phone mockup shows reconciliation in action.
          </p>
          <p>
            <strong>Auth page:</strong> Split panel — brand story + live event ticker left; sign-in / create-account
            form right. Password strength meter, industry onboarding after first login.
          </p>

          <h3>2. Merchant dashboard (app shell)</h3>
          <p>
            Stripe-inspired <strong>light admin UI</strong> — calm, professional, data-forward.
          </p>
          <table>
            <thead>
              <tr>
                <th>Token</th>
                <th>Hex</th>
                <th>Usage</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Primary (charcoal)</td>
                <td><span className="swatch" style={{ background: '#111827' }} />#111827</td>
                <td>Sidebar active state, primary buttons, headings</td>
              </tr>
              <tr>
                <td>Background</td>
                <td><span className="swatch" style={{ background: '#F9FAFB', border: '1px solid #ddd' }} />#F9FAFB</td>
                <td>Page canvas</td>
              </tr>
              <tr>
                <td>Foreground</td>
                <td><span className="swatch" style={{ background: '#111827' }} />#111827</td>
                <td>Body text</td>
              </tr>
              <tr>
                <td>Border</td>
                <td><span className="swatch" style={{ background: '#E5E7EB' }} />#E5E7EB</td>
                <td>Cards, tables, dividers</td>
              </tr>
              <tr>
                <td>Muted text</td>
                <td><span className="swatch" style={{ background: '#6B7280' }} />#6B7280</td>
                <td>Labels, secondary copy</td>
              </tr>
              <tr>
                <td>Info blue</td>
                <td><span className="swatch" style={{ background: '#2563EB' }} />#2563EB</td>
                <td>Links, payment-awaiting state, match references</td>
              </tr>
              <tr>
                <td>Success</td>
                <td><span className="swatch" style={{ background: '#059669' }} />#059669</td>
                <td>Paid, matched, wallet credit</td>
              </tr>
              <tr>
                <td>Warning</td>
                <td><span className="swatch" style={{ background: '#D97706' }} />#D97706</td>
                <td>Review queue, partial</td>
              </tr>
              <tr>
                <td>Danger</td>
                <td><span className="swatch" style={{ background: '#DC2626' }} />#DC2626</td>
                <td>Overdue, exceptions, anomalies</td>
              </tr>
            </tbody>
          </table>

          <p>
            <strong>Typography:</strong> System stack — <code>-apple-system</code>, <code>Inter</code>,{' '}
            <code>Segoe UI</code>. Monospace for account numbers (<code>SF Mono</code>, <code>Fira Code</code>).
          </p>
          <p>
            <strong>Radius:</strong> Cards <code>10px</code>, small controls <code>6px</code>, large panels{' '}
            <code>14px</code>.
          </p>

          <h2 id="layout">Layout architecture</h2>
          <div className="diagram-box">
            <div className="diagram-row">
              <span className="diagram-chip">Sidebar 240px</span>
              <span className="arrow">→</span>
              <span className="diagram-chip">Content area</span>
            </div>
            <div className="diagram-row">
              <span className="diagram-chip">Top bar — search + actions</span>
              <span className="arrow">→</span>
              <span className="diagram-chip">Content area</span>
            </div>
          </div>

          <h3>Sidebar navigation (grouped like Stripe)</h3>
          <table>
            <thead>
              <tr>
                <th>Section</th>
                <th>Items</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Overview</strong></td>
                <td>Dashboard</td>
              </tr>
              <tr>
                <td><strong>Payments</strong></td>
                <td>Treasury, Customers, Invoices, Transactions</td>
              </tr>
              <tr>
                <td><strong>Operations</strong></td>
                <td>Reconciliation, Exceptions, Activity, Timeline, AI Insights</td>
              </tr>
              <tr>
                <td><strong>System</strong></td>
                <td>Integrations, Event Simulator</td>
              </tr>
            </tbody>
          </table>

          <h3>Page patterns</h3>
          <table>
            <thead>
              <tr>
                <th>Pattern</th>
                <th>Used on</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Stat cards</strong> (2×2 mobile, 4-col desktop)</td>
                <td>Dashboard, Invoices, Customers, Statement</td>
              </tr>
              <tr>
                <td><strong>Data tables</strong> (desktop)</td>
                <td>Invoices, Customers, Transactions</td>
              </tr>
              <tr>
                <td><strong>Card lists</strong> (mobile/tablet)</td>
                <td>Same pages below 1024px</td>
              </tr>
              <tr>
                <td><strong>Confidence bar</strong></td>
                <td>Reconciliation, transactions</td>
              </tr>
              <tr>
                <td><strong>Status badges</strong></td>
                <td>Semantic colors per invoice/transaction state</td>
              </tr>
            </tbody>
          </table>

          <h2 id="screens">Key screens</h2>

          <h3>Dashboard</h3>
          <ul>
            <li>Today&apos;s collections, outstanding, needs-attention, auto-reconcile rate</li>
            <li>Weekly collections bar chart</li>
            <li>Live webhook event feed</li>
            <li>Recent transactions with expandable match-confidence breakdown</li>
          </ul>

          <h3>Public payment page (<code>/pay/&#123;token&#125;</code>)</h3>
          <ul>
            <li>Customer-facing, no login</li>
            <li>Bank details + NQR QR code</li>
            <li>Live status: Awaiting → Confirming → Confirmed</li>
          </ul>

          <h3>Reconciliation Center</h3>
          <ul>
            <li>Review queue with 4-signal confidence breakdown</li>
            <li>Overpayment disposition (refund, wallet, apply to future invoice)</li>
          </ul>

          <h2 id="responsive">Responsive behavior</h2>
          <table>
            <thead>
              <tr>
                <th>Breakpoint</th>
                <th>Behavior</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>&lt; 1024px</code></td>
                <td>Tables → card lists; header actions wrap</td>
              </tr>
              <tr>
                <td><code>≥ 1024px</code></td>
                <td>Full data tables unchanged</td>
              </tr>
            </tbody>
          </table>

          <h2 id="motion">Motion &amp; feedback</h2>
          <table>
            <thead>
              <tr>
                <th>Element</th>
                <th>Animation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>New activity rows</td>
                <td><code>slide-in</code> (250ms)</td>
              </tr>
              <tr>
                <td>Live webhook dot</td>
                <td><code>pulse-ring</code></td>
              </tr>
              <tr>
                <td>Confidence bars</td>
                <td>Width transition 600ms</td>
              </tr>
            </tbody>
          </table>

          <h2 id="accessibility">Accessibility &amp; copy</h2>
          <ul>
            <li>Merchant vocabulary layer — Nomba/internal terms sanitized in UI</li>
            <li>Industry templates rename Customers/Invoices per vertical</li>
            <li>High contrast status badges with text labels</li>
          </ul>

          <h2 id="inspiration">Design inspiration</h2>
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>What we borrowed</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Stripe Dashboard</strong></td>
                <td>Sidebar grouping, stat cards, table density, charcoal primary</td>
              </tr>
              <tr>
                <td><strong>Linear</strong></td>
                <td>Clean borders, minimal chrome</td>
              </tr>
              <tr>
                <td><strong>Modern Nigerian fintech</strong></td>
                <td>Naira formatting, bank transfer UX, dedicated VA copy</td>
              </tr>
            </tbody>
          </table>

          <h2 id="urls">Live URLs</h2>
          <table className="link-list">
            <thead>
              <tr>
                <th>Environment</th>
                <th>URL</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Frontend</strong></td>
                <td>
                  <a href="https://recon-os-theta.vercel.app">https://recon-os-theta.vercel.app</a>
                </td>
              </tr>
              <tr>
                <td><strong>API</strong></td>
                <td>
                  <a href="https://reconos-api.onrender.com/api">https://reconos-api.onrender.com/api</a>
                </td>
              </tr>
              <tr>
                <td><strong>Developer docs</strong></td>
                <td>
                  <a
                    href="https://github.com/Feelzcode/ReconOS/blob/main/docs/DEVELOPER_DOCUMENTATION.md"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub — Developer Documentation
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
