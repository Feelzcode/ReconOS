// src/app/page.tsx
// Homepage — converted exactly from the ReconOs marketing design.
// All CSS selectors are scoped under .reconos-home so they cannot leak
// into or collide with the dashboard's Tailwind styles (one global rule,
// body.menu-open for the mobile-menu scroll lock, intentionally stays
// targeting the real <body> tag). HTML structure, copy, and all
// animations (phone mockup, dynamic island, confidence bars, theme
// toggle, mobile menu, scroll reveals) are preserved exactly as designed.
// Internal links were updated to Next.js routes (/auth, /dashboard, etc.)
// instead of static .html filenames.
'use client';

import { useEffect } from 'react';
import { useMarketingTheme } from '@/lib/use-marketing-theme';

const HOMEPAGE_CSS = `.reconos-home *,.reconos-home *::before,.reconos-home *::after{box-sizing:border-box;margin:0;padding:0}
.reconos-home{
  --bg:#03050A;
  --bg2:#070C15;
  --bg3:#0A1020;
  --navy:#050810;
  --blue:#2563EB;
  --blue-b:#1D4ED8;
  --blue-glow:rgba(37,99,235,0.35);
  --green:#10B981;
  --green-g:rgba(16,185,129,0.2);
  --amber:#F59E0B;
  --red:#EF4444;
  --white:#FFFFFF;
  --t1:#E8EEFA;
  --t2:#6B7FA3;
  --t3:#3D4F6B;
  --border:rgba(255,255,255,0.06);
  --border2:rgba(255,255,255,0.11);
  --nav-h:64px;

  /* component tokens — dark defaults */
  --card-bg:#070C18;
  --card-bg-hover:#0C1528;
  --section-alt:#050912;
  --section-engine:#04080F;
  --section-feats:#050912;
  --proof-q:rgba(255,255,255,.5);
  --score-row-bg:#080E1C;
  --engine-card-bg:#080E1C;
  --ec-header-bg:#050912;
  --ef-icon-bg:#0D1526;
  --ticker-bg:#020407;
  --stats-bg:#030508;
  --footer-bg:#020407;
  --footer-border:rgba(255,255,255,.06);
  --s-sub-color:#5A7099;
  --hero-sub-color:#5A7099;
  --score-row-border:rgba(255,255,255,.04);
  --nav-bg:rgba(3,5,10,0.88);
}

/* ── LIGHT MODE ── */
.reconos-home[data-theme="light"]{
  --bg:#F4F6FB;
  --bg2:#EBF0F8;
  --bg3:#E2E9F4;
  --navy:#0A1628;
  --blue:#2563EB;
  --blue-b:#1D4ED8;
  --blue-glow:rgba(37,99,235,0.2);
  --green:#059669;
  --red:#DC2626;
  --amber:#D97706;
  --t1:#0F172A;
  --t2:#475569;
  --t3:#64748B;
  --border:rgba(0,0,0,0.08);
  --border2:rgba(0,0,0,0.14);

  --card-bg:#FFFFFF;
  --card-bg-hover:#F0F5FF;
  --section-alt:#EDF1FA;
  --section-engine:#0A1628;
  --section-feats:#EDF1FA;
  --proof-q:#374151;
  --score-row-bg:#FFFFFF;
  --engine-card-bg:#FFFFFF;
  --ec-header-bg:#F0F4FF;
  --ef-icon-bg:#EFF4FF;
  --ticker-bg:#0A1628;
  --stats-bg:#FFFFFF;
  --footer-bg:#0A1628;
  --footer-border:rgba(255,255,255,.08);
  --s-sub-color:#64748B;
  --hero-sub-color:#475569;
  --score-row-border:rgba(0,0,0,0.06);
  --nav-bg:rgba(244,246,251,0.92);
}

.reconos-home[data-theme="light"]{ color:#0F172A; }
.reconos-home[data-theme="light"] .hero h1{ color:#0A1628; }
.reconos-home[data-theme="light"] .s-title{ color:#0A1628; }
.reconos-home[data-theme="light"] .step-card h3,
.reconos-home[data-theme="light"] .feat h3{ color:#0A1628; }
.reconos-home[data-theme="light"] .step-card p,
.reconos-home[data-theme="light"] .feat p{ color:#475569; }
.reconos-home[data-theme="light"] .proof-name{ color:#0A1628; }
.reconos-home[data-theme="light"] .proof-biz{ color:#64748B; }
.reconos-home[data-theme="light"] .feat-link{ color:var(--blue); }
.reconos-home[data-theme="light"] .stat-n{ color:#0A1628; }
.reconos-home[data-theme="light"] .stat-l{ color:#64748B; }
.reconos-home[data-theme="light"] .nav-logo-name{ color:#0A1628; }
.reconos-home[data-theme="light"] .nav-links a{ color:#374151; }
.reconos-home[data-theme="light"] .nav-links a:hover{ background:#E2E8F0; color:#0A1628; }
.reconos-home[data-theme="light"] .btn-ghost{ color:#374151; }
.reconos-home[data-theme="light"] .btn-ghost:hover{ background:#E2E8F0; color:#0A1628; }
.reconos-home[data-theme="light"] .btn-outline-w{
  color:#374151;
  border-color:rgba(0,0,0,0.18);
}
.reconos-home[data-theme="light"] .btn-outline-w:hover{ background:#E2E8F0; color:#0A1628; border-color:rgba(0,0,0,0.3); }
.reconos-home[data-theme="light"] .hero-eyebrow{ background:rgba(37,99,235,.08); border-color:rgba(37,99,235,.2); color:var(--blue); }
.reconos-home[data-theme="light"] .hero-sub{ color:#475569; }
.reconos-home[data-theme="light"] .trust-text{ color:#475569; }
.reconos-home[data-theme="light"] .trust-text strong{ color:#0F172A; }
.reconos-home[data-theme="light"] .step-n{ color:rgba(0,0,0,.2); }
.reconos-home[data-theme="light"] .step-n::after{ background:rgba(0,0,0,.08); }
.reconos-home[data-theme="light"] .step-icon{ border-color:rgba(0,0,0,.08); }
.reconos-home[data-theme="light"] .s-eyebrow{ color:var(--blue); }
.reconos-home[data-theme="light"] .sc-label{ color:#475569; }
.reconos-home[data-theme="light"] .sc-track{ background:rgba(0,0,0,.08); }
.reconos-home[data-theme="light"] .sc-val{ color:#0A1628; }
.reconos-home[data-theme="light"] .st-label{ color:#2563EB; }
.reconos-home[data-theme="light"] .st-num{ color:#0A1628; }
.reconos-home[data-theme="light"] .total-conf{ color:#0A1628; }
.reconos-home[data-theme="light"] .ef h4{ color:#0A1628; }
.reconos-home[data-theme="light"] .ef p{ color:#475569; }
.reconos-home[data-theme="light"] .ef-icon{ background:#EFF4FF; border-color:rgba(37,99,235,.12); }
/* engine section stays dark in light mode — it's a deliberate dark panel */
.reconos-home[data-theme="light"] .engine-sec .s-eyebrow{ color:#93C5FD; }
.reconos-home[data-theme="light"] .engine-sec .s-title{ color:white; }
.reconos-home[data-theme="light"] .engine-sec .s-sub{ color:rgba(255,255,255,.55); }
/* proof section */
.reconos-home[data-theme="light"] .stars .star{ color:#F59E0B; }
/* cta section — match light page background */
.reconos-home[data-theme="light"] .cta-sec h2{ color:#0A1628; }
.reconos-home[data-theme="light"] .cta-sec p{ color:#475569; }
.reconos-home[data-theme="light"] .cta-sec::before{ background:radial-gradient(ellipse,rgba(37,99,235,.08) 0%,transparent 65%); }
/* footer stays dark */
.reconos-home[data-theme="light"] footer{ color:rgba(255,255,255,.3); }
.reconos-home[data-theme="light"] .footer-col a{ color:rgba(255,255,255,.3); }
.reconos-home[data-theme="light"] .footer-col a:hover{ color:rgba(255,255,255,.7); }
.reconos-home[data-theme="light"] .footer-col h4{ color:rgba(255,255,255,.45); }
.reconos-home[data-theme="light"] .footer-brand p{ color:rgba(255,255,255,.35); }
/* hero glow softens in light */
.reconos-home[data-theme="light"] .hero::before{ background:radial-gradient(ellipse,rgba(37,99,235,.07) 0%,transparent 65%); }
.reconos-home[data-theme="light"] .hero::after{ background:radial-gradient(ellipse,rgba(5,150,105,.04) 0%,transparent 65%); }
/* phone glow softens */
.reconos-home[data-theme="light"] .phone-glow{ background:radial-gradient(ellipse,rgba(37,99,235,.25) 0%,transparent 70%); }
.reconos-home{scroll-behavior:smooth}
.reconos-home{
  font-family:'Inter',-apple-system,sans-serif;
  background:var(--bg);
  color:var(--t1);
  font-size:16px;
  line-height:1.6;
  -webkit-font-smoothing:antialiased;
  overflow-x:hidden;
  transition:background .3s ease, color .3s ease;
}

/* Smooth transition for all themed surfaces */
.reconos-home nav, .reconos-home .step-card, .reconos-home .feat, .reconos-home .proof-card, .reconos-home .engine-card, .reconos-home .ec-header,
.reconos-home .score-row, .reconos-home .stats-bar, .reconos-home .stats-inner, .reconos-home .stat-item, .reconos-home footer,
.reconos-home .feats, .reconos-home .engine-sec, .reconos-home section {
  transition: background .3s ease, border-color .3s ease, color .3s ease;
}

/* ── NAV ── */
.reconos-home nav{
  position:fixed;top:0;left:0;right:0;
  height:var(--nav-h);z-index:300;
  background:var(--nav-bg);
  backdrop-filter:blur(20px);
  -webkit-backdrop-filter:blur(20px);
  border-bottom:1px solid var(--border);
  display:flex;align-items:center;padding:0 48px;gap:0;
}
.reconos-home .nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none;margin-right:auto}
.reconos-home .nav-logo-mark{
  width:32px;height:32px;
  background:var(--blue);
  border-radius:8px;
  display:flex;align-items:center;justify-content:center;
  font-size:16px;font-weight:900;color:white;
}
.reconos-home .nav-logo-name{font-size:16px;font-weight:800;color:white;letter-spacing:-0.4px}
.reconos-home .nav-logo-name span{color:#60A5FA}
.reconos-home .nav-links{display:flex;align-items:center;gap:2px;margin-right:28px}
.reconos-home .nav-links a{
  font-size:13.5px;font-weight:500;color:var(--t2);
  text-decoration:none;padding:6px 13px;border-radius:7px;transition:all .15s;
}
.reconos-home .nav-links a:hover{background:rgba(255,255,255,0.06);color:white}
.reconos-home .nav-cta{display:flex;align-items:center;gap:10px}
.reconos-home .btn{
  display:inline-flex;align-items:center;gap:7px;
  padding:9px 20px;border-radius:8px;font-size:13.5px;font-weight:600;
  cursor:pointer;border:none;text-decoration:none;transition:all .15s;
  font-family:inherit;white-space:nowrap;
}
.reconos-home .btn-ghost{background:transparent;color:var(--t2)}
.reconos-home .btn-ghost:hover{background:rgba(255,255,255,0.06);color:white}
.reconos-home .btn-primary{background:var(--blue);color:white}
.reconos-home .btn-primary:hover{background:var(--blue-b);transform:translateY(-1px);box-shadow:0 4px 20px var(--blue-glow)}
.reconos-home .btn-lg{padding:13px 26px;font-size:15px;border-radius:10px}
.reconos-home .btn-outline-w{
  background:transparent;color:rgba(255,255,255,.65);
  border:1.5px solid rgba(255,255,255,.18);
}
.reconos-home .btn-outline-w:hover{background:rgba(255,255,255,.07);color:white;border-color:rgba(255,255,255,.35)}

/* ══ HERO ══ */
.reconos-home .hero{
  min-height:100vh;
  padding:0;
  display:flex;align-items:center;
  position:relative;overflow:hidden;
}
/* hero-inner carries all padding — breakpoints control it below */

/* background radial glow */
.reconos-home .hero::before{
  content:'';position:absolute;
  top:-10%;left:30%;
  width:900px;height:900px;
  background:radial-gradient(ellipse,rgba(37,99,235,.12) 0%,transparent 65%);
  pointer-events:none;
}
.reconos-home .hero::after{
  content:'';position:absolute;
  bottom:-20%;right:10%;
  width:600px;height:600px;
  background:radial-gradient(ellipse,rgba(16,185,129,.07) 0%,transparent 65%);
  pointer-events:none;
}

.reconos-home .hero-inner{
  max-width:1260px;margin:0 auto;
  padding:calc(var(--nav-h) + 60px) 48px 80px;
  display:grid;grid-template-columns:1fr 380px;
  gap:72px;align-items:center;
  position:relative;z-index:1;width:100%;
}
.reconos-home .hero-copy{ order:1; }
.reconos-home .phone-scene{ order:2; }

/* LEFT COPY */
.reconos-home .hero-eyebrow{
  display:inline-flex;align-items:center;gap:8px;
  background:rgba(37,99,235,.12);
  border:1px solid rgba(37,99,235,.3);
  color:#60A5FA;
  font-size:12px;font-weight:700;
  padding:5px 14px;border-radius:20px;
  margin-bottom:26px;letter-spacing:.3px;
  text-transform:uppercase;
}
.reconos-home .eyebrow-dot{
  width:6px;height:6px;background:#60A5FA;border-radius:50%;
  animation:pulse-dot 1.8s infinite;
}
@keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.7)}}

.reconos-home .hero h1{
  font-size:clamp(44px,5.5vw,72px);
  font-weight:900;line-height:1.04;
  letter-spacing:-3px;
  color:white;margin-bottom:24px;
}
.reconos-home .hero h1 .accent{
  color:#60A5FA;
  display:inline-block;
}
.reconos-home .hero-sub{
  font-size:18px;color:var(--hero-sub-color);line-height:1.7;
  margin-bottom:38px;max-width:460px;font-weight:400;
}
.reconos-home .hero-actions{display:flex;align-items:center;gap:14px;margin-bottom:52px;flex-wrap:wrap}
.reconos-home .hero-trust{display:flex;align-items:center;gap:14px}
.reconos-home .trust-avatars{display:flex}
.reconos-home .ta{
  width:30px;height:30px;border-radius:50%;
  border:2px solid var(--bg);
  display:flex;align-items:center;justify-content:center;
  font-size:10px;font-weight:800;color:white;
  margin-left:-8px;
}
.reconos-home .ta:first-child{margin-left:0}
.reconos-home .ta1{background:linear-gradient(135deg,#2563EB,#7C3AED)}
.reconos-home .ta2{background:linear-gradient(135deg,#10B981,#0891B2)}
.reconos-home .ta3{background:linear-gradient(135deg,#F59E0B,#EF4444)}
.reconos-home .ta4{background:linear-gradient(135deg,#EC4899,#7C3AED)}
.reconos-home .trust-text{font-size:13px;color:var(--t2);line-height:1.4}
.reconos-home .trust-text strong{color:var(--t1);font-weight:600}

/* ══ iPHONE FRAME ══ */
.reconos-home .phone-scene{
  position:relative;
  display:flex;justify-content:center;align-items:center;
  padding:0;
}

/* Glow beneath phone */
.reconos-home .phone-glow{
  position:absolute;
  bottom:-40px;left:50%;transform:translateX(-50%);
  width:280px;height:100px;
  background:radial-gradient(ellipse,rgba(37,99,235,.5) 0%,transparent 70%);
  filter:blur(20px);
  pointer-events:none;
  z-index:0;
}

.reconos-home .iphone{
  position:relative;z-index:1;
  width:min(315px, 100%);
  /* iPhone titanium body */
  background:linear-gradient(170deg,#2A2A2E 0%,#1C1C1E 30%,#141416 70%,#0D0D0F 100%);
  border-radius:52px;
  padding:10px;
  box-shadow:
    /* outer titanium ring highlight */
    0 0 0 1px rgba(255,255,255,.18),
    /* inner subtle */
    inset 0 1px 0 rgba(255,255,255,.12),
    inset 0 -1px 0 rgba(0,0,0,.5),
    /* side depth */
    -6px 0 20px rgba(0,0,0,.5),
    6px 0 20px rgba(0,0,0,.4),
    /* bottom depth */
    0 30px 60px rgba(0,0,0,.7),
    0 60px 120px rgba(0,0,0,.4),
    /* ambient glow from screen */
    0 0 80px rgba(37,99,235,.15);
}

/* Side buttons */
.reconos-home .iphone::before{
  content:'';
  position:absolute;
  /* volume buttons on left */
  left:-4px;top:120px;
  width:4px;height:36px;
  background:linear-gradient(to right,#1A1A1C,#2C2C2E);
  border-radius:2px 0 0 2px;
  box-shadow:-1px 0 0 rgba(255,255,255,.08),0 1px 0 rgba(255,255,255,.04);
}
.reconos-home .iphone::after{
  content:'';
  position:absolute;
  /* power button on right */
  right:-4px;top:140px;
  width:4px;height:72px;
  background:linear-gradient(to left,#1A1A1C,#2C2C2E);
  border-radius:0 2px 2px 0;
  box-shadow:1px 0 0 rgba(255,255,255,.08);
}
/* second volume button via extra element */
.reconos-home .vol-down{
  position:absolute;
  left:-4px;top:170px;
  width:4px;height:36px;
  background:linear-gradient(to right,#1A1A1C,#2C2C2E);
  border-radius:2px 0 0 2px;
  box-shadow:-1px 0 0 rgba(255,255,255,.08);
  z-index:10;
}
.reconos-home .silent-switch{
  position:absolute;
  left:-4px;top:80px;
  width:4px;height:24px;
  background:linear-gradient(to right,#1A1A1C,#2C2C2E);
  border-radius:2px 0 0 2px;
  box-shadow:-1px 0 0 rgba(255,255,255,.08);
  z-index:10;
}

/* Screen bezel */
.reconos-home .iphone-bezel{
  background:#000;
  border-radius:44px;
  overflow:hidden;
  position:relative;
  /* 19.5:9 ish ratio */
  aspect-ratio:9/19.5;
}

/* ── DYNAMIC ISLAND ── */
.reconos-home .dynamic-island{
  position:absolute;
  top:12px;left:50%;transform:translateX(-50%);
  background:#000;
  border-radius:20px;
  z-index:50;
  display:flex;align-items:center;justify-content:center;
  transition:all .5s cubic-bezier(.34,1.56,.64,1);
  width:126px;height:37px;
  box-shadow:0 0 0 1px rgba(255,255,255,.08);
  overflow:hidden;
}
.reconos-home .dynamic-island.expanded{
  width:210px;height:56px;border-radius:28px;
}
.reconos-home .di-camera{
  width:12px;height:12px;background:#1a1a1a;border-radius:50%;
  border:2px solid #0a0a0a;
  box-shadow:0 0 0 1px rgba(255,255,255,.06),inset 0 0 4px rgba(0,0,255,.15);
  flex-shrink:0;
}
.reconos-home .di-default{display:flex;align-items:center;justify-content:center;gap:8px;padding:0 10px;width:100%}
.reconos-home .di-speaker{
  width:52px;height:8px;background:#111;border-radius:4px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.05);
}
.reconos-home .di-notif{
  display:none;
  align-items:center;gap:10px;
  padding:0 14px 0 10px;
  width:100%;
}
.reconos-home .di-notif.show{display:flex}
.reconos-home .di-default.hide{display:none}
.reconos-home .di-notif-icon{
  width:32px;height:32px;border-radius:10px;
  background:var(--green);
  display:flex;align-items:center;justify-content:center;
  font-size:15px;flex-shrink:0;
  font-weight:800;color:white;
}
.reconos-home .di-notif-text{flex:1;min-width:0}
.reconos-home .di-notif-title{font-size:11px;font-weight:700;color:white;line-height:1.2}
.reconos-home .di-notif-sub{font-size:10px;color:rgba(255,255,255,.55);line-height:1.2}

/* ── SCREEN CONTENT ── */
.reconos-home .iphone-screen{
  position:absolute;
  top:0;left:0;right:0;bottom:0;
  background:#0A0F1A;
  overflow:hidden;
  display:flex;flex-direction:column;
}

/* Status bar */
.reconos-home .status-bar{
  height:54px;
  display:flex;align-items:flex-end;
  justify-content:space-between;
  padding:0 24px 8px;
  flex-shrink:0;
  position:relative;z-index:5;
}
.reconos-home .sb-time{font-size:15px;font-weight:700;color:white;letter-spacing:-.3px}
.reconos-home .sb-icons{display:flex;align-items:center;gap:6px}
.reconos-home .sb-icon{color:white;font-size:13px;font-weight:700}
.reconos-home .sb-signal{display:flex;align-items:flex-end;gap:1.5px}
.reconos-home .sb-bar{background:white;border-radius:1px;width:3.5px}

/* App header */
.reconos-home .app-header{
  padding:8px 18px 12px;
  display:flex;align-items:center;justify-content:space-between;
  border-bottom:1px solid rgba(255,255,255,.06);
  flex-shrink:0;
}
.reconos-home .app-title{font-size:13px;font-weight:700;color:white;letter-spacing:-.2px}
.reconos-home .app-subtitle{font-size:10.5px;color:rgba(255,255,255,.4);margin-top:1px}
.reconos-home .header-avatar{
  width:30px;height:30px;border-radius:50%;
  background:linear-gradient(135deg,#2563EB,#7C3AED);
  display:flex;align-items:center;justify-content:center;
  font-size:11px;font-weight:800;color:white;
}

/* Metric cards row */
.reconos-home .metric-row{
  display:grid;grid-template-columns:1fr 1fr;
  gap:8px;padding:12px 12px 0;
  flex-shrink:0;
}
.reconos-home .metric-card{
  background:rgba(255,255,255,.05);
  border:1px solid rgba(255,255,255,.07);
  border-radius:14px;
  padding:11px 13px;
  position:relative;overflow:hidden;
}
.reconos-home .metric-card::before{
  content:'';position:absolute;top:0;left:0;right:0;height:2px;
}
.reconos-home .metric-card.mc-blue::before{background:var(--blue)}
.reconos-home .metric-card.mc-green::before{background:var(--green)}
.reconos-home .metric-card.mc-amber::before{background:var(--amber)}
.reconos-home .metric-card.mc-red::before{background:var(--red)}
.reconos-home .mc-label{font-size:9.5px;font-weight:700;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px}
.reconos-home .mc-value{font-size:20px;font-weight:900;color:white;letter-spacing:-1px;line-height:1;font-variant-numeric:tabular-nums}
.reconos-home .mc-change{font-size:9.5px;font-weight:600;margin-top:4px}
.reconos-home .mc-up{color:var(--green)}
.reconos-home .mc-neutral{color:rgba(255,255,255,.3)}

/* Live feed */
.reconos-home .live-feed-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:12px 14px 8px;
}
.reconos-home .lf-title{font-size:11.5px;font-weight:700;color:white}
.reconos-home .lf-live{
  display:flex;align-items:center;gap:5px;
  font-size:9.5px;font-weight:800;color:var(--green);
  text-transform:uppercase;letter-spacing:.5px;
}
.reconos-home .lf-dot{
  width:6px;height:6px;background:var(--green);border-radius:50%;
  animation:pulse-dot 1.2s infinite;
}

/* Transaction items */
.reconos-home .tx-list{padding:0 10px;flex:1;overflow:hidden}
.reconos-home .tx-item{
  display:flex;align-items:center;gap:10px;
  padding:9px 8px;border-radius:12px;
  margin-bottom:4px;
  background:rgba(255,255,255,.03);
  border:1px solid rgba(255,255,255,.05);
  transition:background .3s;
}
.reconos-home .tx-item.tx-flash{background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.2)}
.reconos-home .tx-avatar{
  width:32px;height:32px;border-radius:10px;
  display:flex;align-items:center;justify-content:center;
  font-size:11px;font-weight:800;color:white;flex-shrink:0;
}
.reconos-home .txa1{background:linear-gradient(135deg,#2563EB,#7C3AED)}
.reconos-home .txa2{background:linear-gradient(135deg,#10B981,#0891B2)}
.reconos-home .txa3{background:linear-gradient(135deg,#F59E0B,#EF4444)}
.reconos-home .tx-info{flex:1;min-width:0}
.reconos-home .tx-name{font-size:11.5px;font-weight:600;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.reconos-home .tx-ref{font-size:10px;color:rgba(255,255,255,.35);margin-top:1px}
.reconos-home .tx-right{text-align:right;flex-shrink:0}
.reconos-home .tx-amount{font-size:12.5px;font-weight:800;color:white;font-variant-numeric:tabular-nums}
.reconos-home .tx-chip{
  display:inline-flex;align-items:center;gap:3px;
  padding:2px 7px;border-radius:20px;
  font-size:9px;font-weight:800;margin-top:3px;
}
.reconos-home .chip-matched{background:rgba(16,185,129,.15);color:#34D399}
.reconos-home .chip-pending{background:rgba(245,158,11,.12);color:#FBBF24}
.reconos-home .chip-new{background:rgba(37,99,235,.2);color:#60A5FA}

/* Confidence bar inside screen */
.reconos-home .conf-section{padding:6px 12px 8px}
.reconos-home .conf-section-title{font-size:9.5px;font-weight:700;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
.reconos-home .conf-row{display:flex;align-items:center;gap:6px;margin-bottom:4px}
.reconos-home .conf-lbl{font-size:9.5px;color:rgba(255,255,255,.35);min-width:58px}
.reconos-home .conf-track{flex:1;height:4px;background:rgba(255,255,255,.08);border-radius:10px;overflow:hidden}
.reconos-home .conf-fill{height:100%;border-radius:10px;transition:width 1.2s cubic-bezier(.34,1.56,.64,1)}
.reconos-home .conf-pct{font-size:9.5px;font-weight:800;min-width:22px;text-align:right}

/* Home indicator */
.reconos-home .home-bar{
  height:28px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:8px;
  flex-shrink:0;
}
.reconos-home .home-indicator{
  width:120px;height:5px;background:rgba(255,255,255,.25);border-radius:3px;
}



/* ═══ SECTIONS ═══ */
.reconos-home section{padding:100px 48px}
.reconos-home .container{max-width:1200px;margin:0 auto}

.reconos-home .s-eyebrow{
  font-size:11.5px;font-weight:800;color:#60A5FA;
  text-transform:uppercase;letter-spacing:1.2px;margin-bottom:14px;
}
.reconos-home .s-title{
  font-size:clamp(30px,3.5vw,46px);font-weight:900;
  letter-spacing:-1.8px;line-height:1.08;color:white;margin-bottom:16px;
}
.reconos-home .s-sub{font-size:17px;color:var(--s-sub-color);max-width:520px;line-height:1.7}

/* How it works */
.reconos-home .steps-grid{
  display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:56px;
}
.reconos-home .step-card{
  background:var(--card-bg);
  border:1px solid var(--border);border-radius:16px;padding:28px 22px;
  transition:all .2s;position:relative;overflow:hidden;
}
.reconos-home .step-card::after{
  content:'';position:absolute;top:0;left:0;right:0;height:2px;
  background:var(--blue);opacity:0;transition:.2s;
}
.reconos-home .step-card:hover{background:var(--card-bg-hover);border-color:var(--border2)}
.reconos-home .step-card:hover::after{opacity:1}
.reconos-home .step-n{
  font-size:11px;font-weight:800;color:rgba(255,255,255,.2);letter-spacing:.5px;
  margin-bottom:18px;display:flex;align-items:center;gap:8px;
}
.reconos-home .step-n::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.07)}
.reconos-home .step-icon{
  width:44px;height:44px;border-radius:12px;
  display:flex;align-items:center;justify-content:center;font-size:20px;
  margin-bottom:18px;border:1px solid rgba(255,255,255,.08);
}
.reconos-home .si-b{background:rgba(37,99,235,.12)}
.reconos-home .si-g{background:rgba(16,185,129,.1)}
.reconos-home .si-p{background:rgba(124,58,237,.12)}
.reconos-home .si-a{background:rgba(245,158,11,.1)}
.reconos-home .step-card h3{font-size:15px;font-weight:750;color:white;margin-bottom:8px;letter-spacing:-.2px}
.reconos-home .step-card p{font-size:13.5px;color:var(--t3);line-height:1.65}

/* Features */
.reconos-home .feats{background:var(--section-feats)}
.reconos-home .feats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:56px}
.reconos-home .feat{
  background:var(--card-bg);border:1px solid var(--border);
  border-radius:16px;padding:26px;transition:all .2s;cursor:default;
}
.reconos-home .feat:hover{background:var(--card-bg-hover);border-color:rgba(37,99,235,.35);transform:translateY(-2px)}
.reconos-home .feat-icon{
  width:42px;height:42px;border-radius:11px;
  display:flex;align-items:center;justify-content:center;font-size:19px;
  margin-bottom:16px;border:1px solid var(--border);
}
.reconos-home .feat h3{font-size:15px;font-weight:750;color:var(--t1);margin-bottom:7px;letter-spacing:-.2px}
.reconos-home .feat p{font-size:13.5px;color:var(--t3);line-height:1.65}
.reconos-home .feat-link{display:inline-flex;align-items:center;gap:4px;margin-top:12px;font-size:12px;font-weight:700;color:#60A5FA}

/* Engine */
.reconos-home .engine-sec{background:var(--section-engine)}
.reconos-home .engine-inner{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center}
.reconos-home .engine-card{
  background:var(--engine-card-bg);border:1px solid var(--border2);
  border-radius:20px;overflow:hidden;
}
.reconos-home .ec-header{
  background:var(--ec-header-bg);border-bottom:1px solid var(--border);
  padding:14px 20px;font-size:11px;font-weight:700;
  color:var(--t2);text-transform:uppercase;letter-spacing:.7px;
  display:flex;align-items:center;justify-content:space-between;
}
.reconos-home .score-row{
  padding:14px 20px;border-bottom:1px solid var(--score-row-border);
  display:flex;align-items:center;gap:14px;
  background:var(--score-row-bg);
}
.reconos-home .sc-label{font-size:13px;color:var(--t2);flex:1}
.reconos-home .sc-track{width:110px;height:4px;background:rgba(255,255,255,.08);border-radius:10px;overflow:hidden}
.reconos-home .sc-fill{height:100%;border-radius:10px}
.reconos-home .sc-val{font-size:13px;font-weight:800;color:var(--t1);min-width:42px;text-align:right;font-variant-numeric:tabular-nums}
.reconos-home .score-total{
  margin:14px 20px;
  background:rgba(37,99,235,.12);border:1px solid rgba(37,99,235,.22);
  border-radius:10px;padding:12px 16px;
  display:flex;align-items:center;justify-content:space-between;
}
.reconos-home .st-label{font-size:12px;font-weight:700;color:#93C5FD}
.reconos-home .st-num{font-size:22px;font-weight:900;color:white;letter-spacing:-.5px}
.reconos-home .st-badge{
  font-size:10px;font-weight:800;
  background:rgba(16,185,129,.2);color:#34D399;
  padding:3px 9px;border-radius:6px;
}
.reconos-home .engine-visual{
  display:flex;align-items:center;justify-content:center;
}
.reconos-home .engine-visual img{
  width:100%;max-width:480px;height:auto;
  object-fit:contain;
  display:block;
  mix-blend-mode:lighten;
}
.reconos-home .engine-feats{display:flex;flex-direction:column;gap:20px}
.reconos-home .ef{display:flex;gap:14px}
.reconos-home .ef-icon{
  width:36px;height:36px;border-radius:9px;
  background:var(--ef-icon-bg);border:1px solid var(--border);
  display:flex;align-items:center;justify-content:center;font-size:16px;
  flex-shrink:0;margin-top:2px;
}
.reconos-home .ef h4{font-size:14px;font-weight:700;color:white;margin-bottom:4px}
.reconos-home .ef p{font-size:13px;color:var(--t3);line-height:1.6}

/* Proof */
.reconos-home .proof-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:52px}
.reconos-home .proof-card{
  background:var(--card-bg);border:1px solid var(--border);
  border-radius:16px;padding:26px;
}
.reconos-home .stars{display:flex;gap:2px;margin-bottom:16px}
.reconos-home .star{font-size:14px;color:#F59E0B}
.reconos-home .proof-q{font-size:14.5px;color:var(--proof-q);line-height:1.72;margin-bottom:22px;font-style:italic}
.reconos-home .proof-auth{display:flex;align-items:center;gap:11px}
.reconos-home .pa{
  width:36px;height:36px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-size:12px;font-weight:800;color:white;flex-shrink:0;
}
.reconos-home .proof-name{font-size:13.5px;font-weight:700;color:var(--t1)}
.reconos-home .proof-biz{font-size:12px;color:var(--t3)}

/* Stats */
.reconos-home .stats-bar{background:var(--stats-bg);border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.reconos-home .stats-inner{max-width:1200px;margin:0 auto;padding:0 48px;display:grid;grid-template-columns:repeat(4,1fr)}
.reconos-home .stat-item{
  padding:44px 20px;text-align:center;
  border-right:1px solid var(--border);
}
.reconos-home .stat-item:last-child{border-right:none}
.reconos-home .stat-n{
  font-size:42px;font-weight:900;letter-spacing:-2px;
  line-height:1;margin-bottom:6px;font-variant-numeric:tabular-nums;
  color:var(--t1);
}
.reconos-home .stat-n .hl{color:#60A5FA}
.reconos-home .stat-l{font-size:14px;color:var(--t3);font-weight:500}

/* CTA */
.reconos-home .cta-sec{padding:120px 48px;text-align:center;position:relative;overflow:hidden}
.reconos-home .cta-sec::before{
  content:'';position:absolute;top:-200px;left:50%;transform:translateX(-50%);
  width:900px;height:700px;
  background:radial-gradient(ellipse,rgba(37,99,235,.15) 0%,transparent 65%);
  pointer-events:none;
}
.reconos-home .cta-sec h2{
  font-size:clamp(36px,5vw,64px);font-weight:900;color:white;
  letter-spacing:-2.5px;line-height:1.06;margin-bottom:18px;position:relative;
}
.reconos-home .cta-sec p{
  font-size:18px;color:var(--t2);max-width:480px;margin:0 auto 40px;
  line-height:1.65;position:relative;
}
.reconos-home .cta-actions{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;position:relative}

/* Footer */
.reconos-home footer{background:var(--footer-bg);padding:60px 48px 40px;color:rgba(255,255,255,.3)}
.reconos-home .footer-inner{max-width:1200px;margin:0 auto}
.reconos-home .footer-top{
  display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;
  gap:48px;padding-bottom:48px;
  border-bottom:1px solid var(--footer-border);margin-bottom:36px;
}
.reconos-home .footer-brand p{font-size:13.5px;line-height:1.65;max-width:240px;margin-top:14px}
.reconos-home .footer-col h4{
  font-size:11px;font-weight:800;color:rgba(255,255,255,.4);
  text-transform:uppercase;letter-spacing:.8px;margin-bottom:16px;
}
.reconos-home .footer-col a{
  display:block;font-size:13px;color:rgba(255,255,255,.25);
  text-decoration:none;margin-bottom:10px;transition:color .15s;
}
.reconos-home .footer-col a:hover{color:rgba(255,255,255,.65)}
.reconos-home .footer-bottom{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;font-size:12.5px}

/* Responsive */
/* ── Tablet: tighten 2-col hero, shrink phone column ── */
/* ── THEME TOGGLE ── */
.reconos-home .theme-toggle{
  width:36px;height:36px;
  display:flex;align-items:center;justify-content:center;
  border-radius:8px;
  background:rgba(255,255,255,.07);
  border:1px solid var(--border2);
  cursor:pointer;
  font-size:16px;
  line-height:1;
  transition:all .2s;
  color:var(--t1);
  flex-shrink:0;
}
.reconos-home .theme-toggle:hover{
  background:rgba(255,255,255,.12);
  transform:rotate(15deg);
}
.reconos-home[data-theme="light"] .theme-toggle{
  background:rgba(0,0,0,.05);
  border-color:rgba(0,0,0,.12);
}
.reconos-home[data-theme="light"] .theme-toggle:hover{
  background:rgba(0,0,0,.09);
}

/* ════════════════════════════════
   HAMBURGER BUTTON
════════════════════════════════ */
.reconos-home .hamburger {
  display:none;
  width:40px; height:40px;
  background:transparent;
  border:none;
  cursor:pointer;
  position:relative;
  flex-shrink:0;
  z-index:310;
  padding:0;
}

.reconos-home .ham-line {
  position:absolute;
  left:8px;
  width:24px;
  height:2px;
  background:var(--t1);
  border-radius:2px;
  transition:transform .35s cubic-bezier(.65,0,.35,1),
             opacity .25s ease,
             top .35s cubic-bezier(.65,0,.35,1),
             background .3s ease;
}

.reconos-home .ham-line-1 { top:14px; }
.reconos-home .ham-line-2 { top:20px; }
.reconos-home .ham-line-3 { top:26px; }

/* morph to X when open */
.reconos-home .hamburger.open .ham-line-1 {
  top:20px;
  transform:rotate(45deg);
}
.reconos-home .hamburger.open .ham-line-2 {
  opacity:0;
  transform:scaleX(0);
}
.reconos-home .hamburger.open .ham-line-3 {
  top:20px;
  transform:rotate(-45deg);
}

.reconos-home .hamburger:hover .ham-line { background:var(--blue); }

/* ════════════════════════════════
   MOBILE MENU OVERLAY
════════════════════════════════ */
.reconos-home .mobile-menu {
  position:fixed;
  inset:0;
  z-index:250;
  visibility:hidden;
  pointer-events:none;
}

.reconos-home .mobile-menu.open {
  visibility:visible;
  pointer-events:auto;
}

.reconos-home .mobile-menu-backdrop {
  position:absolute;
  inset:0;
  background:rgba(3,5,10,.7);
  backdrop-filter:blur(6px);
  -webkit-backdrop-filter:blur(6px);
  opacity:0;
  transition:opacity .35s ease;
}

.reconos-home[data-theme="light"] .mobile-menu-backdrop {
  background:rgba(244,246,251,.75);
}

.reconos-home .mobile-menu.open .mobile-menu-backdrop {
  opacity:1;
}

.reconos-home .mobile-menu-panel {
  position:absolute;
  top:0; right:0;
  height:100%;
  width:min(380px, 86vw);
  background:var(--bg2);
  border-left:1px solid var(--border2);
  padding:calc(var(--nav-h) + 32px) 32px 40px;
  display:flex;
  flex-direction:column;
  gap:4px;
  transform:translateX(100%);
  transition:transform .4s cubic-bezier(.16,1,.3,1);
  box-shadow:-20px 0 60px rgba(0,0,0,.3);
}

.reconos-home .mobile-menu.open .mobile-menu-panel {
  transform:translateX(0);
}

.reconos-home .mobile-link {
  display:flex;
  align-items:center;
  gap:14px;
  padding:16px 4px;
  font-size:20px;
  font-weight:700;
  color:var(--t1);
  text-decoration:none;
  border-bottom:1px solid var(--border);
  letter-spacing:-.3px;
  opacity:0;
  transform:translateX(24px);
  transition:transform .15s ease, color .15s ease;
}

.reconos-home .mobile-menu.open .mobile-link {
  animation:mlinkin .5s cubic-bezier(.16,1,.3,1) forwards;
  animation-delay:calc(.08s + var(--d) * .06s);
}

@keyframes mlinkin {
  from { opacity:0; transform:translateX(24px); }
  to   { opacity:1; transform:translateX(0); }
}

.reconos-home .mobile-link:hover {
  color:#60A5FA;
}

.reconos-home .mobile-link:active {
  transform:translateX(0) scale(.98);
}

.reconos-home .mobile-link-num {
  font-size:11px;
  font-weight:800;
  color:var(--t3);
  letter-spacing:.5px;
  min-width:24px;
}

.reconos-home .mobile-menu-divider {
  height:1px;
  background:transparent;
  margin:12px 0 8px;
  opacity:0;
}

.reconos-home .mobile-menu.open .mobile-menu-divider {
  animation:mlinkin .5s cubic-bezier(.16,1,.3,1) forwards;
  animation-delay:calc(.08s + var(--d) * .06s);
}

.reconos-home .mobile-btn {
  width:100%;
  justify-content:center;
  padding:14px 20px;
  font-size:15px;
  border-radius:10px;
  opacity:0;
  transform:translateX(24px);
}

.reconos-home .mobile-menu.open .mobile-btn {
  animation:mlinkin .5s cubic-bezier(.16,1,.3,1) forwards;
  animation-delay:calc(.08s + var(--d) * .06s);
}

.reconos-home .mobile-btn + .mobile-btn { margin-top:10px; }

/* lock scroll when menu open */
body.menu-open { overflow:hidden; }

@media(max-width:1060px){
  .reconos-home .hero-inner{
    grid-template-columns:1fr 300px;
    gap:48px;
    padding:calc(var(--nav-h) + 48px) 32px 72px;
  }
}

/* ── Small tablet: stack hero vertically, copy top / phone bottom ── */
@media(max-width:860px){
  .reconos-home .hero-inner{
    grid-template-columns:1fr;
    gap:52px;
    padding:calc(var(--nav-h) + 48px) 32px 72px;
  }
  .reconos-home .hero-copy{
    order:1;
    text-align:left;
  }
  .reconos-home .phone-scene{
    order:2;
    width:100%;
    justify-content:center;
  }
  .reconos-home .iphone{
    width:min(300px, 72vw);
  }
  .reconos-home .steps-grid{grid-template-columns:repeat(2,1fr)}
  .reconos-home .feats-grid{grid-template-columns:repeat(2,1fr)}
  .reconos-home .engine-inner{grid-template-columns:1fr}
  .reconos-home .engine-visual img{max-width:min(420px, 88vw);margin:0 auto}
  .reconos-home .proof-grid{grid-template-columns:repeat(2,1fr)}
  .reconos-home .stats-inner{grid-template-columns:repeat(2,1fr)}
  .reconos-home .footer-top{grid-template-columns:1fr 1fr}
}

/* ── Tablet & below: hide desktop nav links + auth buttons, show hamburger ── */
@media(max-width:1024px){
  .reconos-home .nav-links{ display:none; }
  .reconos-home .nav-cta .btn-ghost,
  .reconos-home .nav-cta .btn-primary{ display:none; }
  .reconos-home .hamburger{ display:block; }
}

@media(max-width:600px){
  .reconos-home nav{padding:0 20px}
  .reconos-home section{padding:64px 20px}
  .reconos-home .hero-inner{
    padding:calc(var(--nav-h) + 36px) 20px 56px;
    gap:44px;
  }
  .reconos-home .iphone{
    width:min(270px, 78vw);
  }
  .reconos-home .feats-grid{grid-template-columns:1fr}
  .reconos-home .proof-grid{grid-template-columns:1fr}
  .reconos-home .steps-grid{grid-template-columns:1fr}
  .reconos-home .stats-inner{padding:0 20px;grid-template-columns:1fr 1fr}
  .reconos-home footer{padding:48px 20px 32px}
  .reconos-home .footer-top{grid-template-columns:1fr}
}
`;
const HOMEPAGE_BODY = `<div class="reconos-home">

<!-- NAV -->
<nav>
  <a href="/" class="nav-logo">
    <div class="nav-logo-mark">R</div>
    <div class="nav-logo-name">Recon<span>Os</span></div>
  </a>
  <div class="nav-links">
    <a href="#how">How it works</a>
    <a href="#features">Features</a>
    <a href="#engine">The Engine</a>
    <a href="#proof">Customers</a>
  </div>
  <div class="nav-cta">
    <button class="theme-toggle" id="themeToggle" aria-label="Toggle light/dark mode" title="Toggle theme">
      <span class="toggle-icon" id="toggleIcon">☀</span>
    </button>
    <a href="/auth" class="btn btn-ghost">Sign in</a>
    <a href="/auth" class="btn btn-primary">Get started →</a>
  </div>

  <!-- Hamburger — mobile only -->
  <button class="hamburger" id="hamburger" aria-label="Open menu" aria-expanded="false">
    <span class="ham-line ham-line-1"></span>
    <span class="ham-line ham-line-2"></span>
    <span class="ham-line ham-line-3"></span>
  </button>
</nav>

<!-- Mobile menu overlay -->
<div class="mobile-menu" id="mobileMenu">
  <div class="mobile-menu-backdrop" id="mobileMenuBackdrop"></div>
  <div class="mobile-menu-panel">
    <a href="#how" class="mobile-link" style="--d:0">
      <span class="mobile-link-num">01</span> How it works
    </a>
    <a href="#features" class="mobile-link" style="--d:1">
      <span class="mobile-link-num">02</span> Features
    </a>
    <a href="#engine" class="mobile-link" style="--d:2">
      <span class="mobile-link-num">03</span> The Engine
    </a>
    <a href="#proof" class="mobile-link" style="--d:3">
      <span class="mobile-link-num">04</span> Customers
    </a>
    <div class="mobile-menu-divider" style="--d:4"></div>
    <a href="/auth" class="btn btn-outline-w mobile-btn" style="--d:5">Sign in</a>
    <a href="/auth" class="btn btn-primary mobile-btn" style="--d:6">Get started →</a>
  </div>
</div>

<!-- ══════════════════ HERO ══════════════════ -->
<section class="hero">
  <div class="hero-inner">

    <!-- LEFT COPY -->
    <div class="hero-copy">
      <div class="hero-eyebrow">
        <div class="eyebrow-dot"></div>
        Payment operations for Nigerian SMEs
      </div>
      <h1>Every payment<br><span class="accent">reconciles</span><br>itself.</h1>
      <p class="hero-sub">Automated payment reconciliation for schools, clinics, landlords, cooperatives, and growing businesses.</p>
      <div class="hero-actions">
        <a href="/auth?tab=signup" class="btn btn-primary btn-lg">Start for free →</a>
        <a href="#how" class="btn btn-outline-w btn-lg">See how it works</a>
      </div>
      <div class="hero-trust">
        <div class="trust-avatars">
          <div class="ta ta1">AE</div>
          <div class="ta ta2">CL</div>
          <div class="ta ta3">PM</div>
          <div class="ta ta4">RC</div>
        </div>
        <div class="trust-text">
          <strong>48 Nigerian businesses</strong><br>saving 12+ hours every week
        </div>
      </div>
    </div>

    <!-- iPHONE -->
    <div class="phone-scene">
      <div class="phone-glow"></div>
      <div class="iphone">
        <div class="silent-switch"></div>
        <div class="vol-down"></div>

        <!-- BEZEL -->
        <div class="iphone-bezel">
          <div class="iphone-screen">

            <!-- DYNAMIC ISLAND -->
            <div class="dynamic-island" id="dynamicIsland">
              <div class="di-default" id="diDefault">
                <div class="di-speaker"></div>
                <div class="di-camera"></div>
              </div>
              <div class="di-notif" id="diNotif">
                <div class="di-notif-icon">✓</div>
                <div class="di-notif-text">
                  <div class="di-notif-title">INV-0291 matched</div>
                  <div class="di-notif-sub">₦240,000 · 99% confidence</div>
                </div>
              </div>
            </div>

            <!-- STATUS BAR -->
            <div class="status-bar">
              <div class="sb-time">9:41</div>
              <div class="sb-icons">
                <div class="sb-signal">
                  <div class="sb-bar" style="height:4px"></div>
                  <div class="sb-bar" style="height:6px"></div>
                  <div class="sb-bar" style="height:9px"></div>
                  <div class="sb-bar" style="height:12px"></div>
                </div>
                <div class="sb-icon" style="font-size:12px">WiFi</div>
                <div class="sb-icon">■</div>
              </div>
            </div>

            <!-- APP HEADER -->
            <div class="app-header">
              <div>
                <div class="app-title">ReconOs</div>
                <div class="app-subtitle">Alaba Electronics · Today</div>
              </div>
              <div class="header-avatar">KA</div>
            </div>

            <!-- METRIC CARDS -->
            <div class="metric-row">
              <div class="metric-card mc-blue">
                <div class="mc-label">Collected</div>
                <div class="mc-value">₦6.8M</div>
                <div class="mc-change mc-up">↑ 18.4%</div>
              </div>
              <div class="metric-card mc-green">
                <div class="mc-label">Auto-matched</div>
                <div class="mc-value" id="matchPct">96%</div>
                <div class="mc-change mc-up">↑ 2.1%</div>
              </div>
              <div class="metric-card mc-amber">
                <div class="mc-label">Outstanding</div>
                <div class="mc-value">14</div>
                <div class="mc-change mc-neutral">₦1.24M</div>
              </div>
              <div class="metric-card mc-red">
                <div class="mc-label">Exceptions</div>
                <div class="mc-value">2</div>
                <div class="mc-change mc-neutral">Review</div>
              </div>
            </div>

            <!-- LIVE FEED -->
            <div class="live-feed-header">
              <div class="lf-title">Live payments</div>
              <div class="lf-live"><div class="lf-dot"></div>LIVE</div>
            </div>

            <div class="tx-list">
              <div class="tx-item" id="tx0">
                <div class="tx-avatar txa1">AE</div>
                <div class="tx-info">
                  <div class="tx-name">Alaba Electronics</div>
                  <div class="tx-ref">NMB-2947 · just now</div>
                </div>
                <div class="tx-right">
                  <div class="tx-amount">₦240,000</div>
                  <div class="tx-chip chip-pending" id="tx0chip">● Pending</div>
                </div>
              </div>
              <div class="tx-item">
                <div class="tx-avatar txa2">CL</div>
                <div class="tx-info">
                  <div class="tx-name">Chinedu Logistics</div>
                  <div class="tx-ref">NMB-2946 · 14m ago</div>
                </div>
                <div class="tx-right">
                  <div class="tx-amount">₦85,000</div>
                  <div class="tx-chip chip-matched">✓ Matched</div>
                </div>
              </div>
              <div class="tx-item">
                <div class="tx-avatar txa3">PM</div>
                <div class="tx-info">
                  <div class="tx-name">Peace Medical</div>
                  <div class="tx-ref">NMB-2944 · 1h ago</div>
                </div>
                <div class="tx-right">
                  <div class="tx-amount">₦145,500</div>
                  <div class="tx-chip chip-matched">✓ Matched</div>
                </div>
              </div>
            </div>

            <!-- CONFIDENCE BARS -->
            <div class="conf-section">
              <div class="conf-section-title">Confidence score — INV-0291</div>
              <div class="conf-row">
                <div class="conf-lbl">Amount</div>
                <div class="conf-track"><div class="conf-fill" id="cf0" style="width:0%;background:#60A5FA"></div></div>
                <div class="conf-pct" style="color:#60A5FA" id="cv0">0</div>
              </div>
              <div class="conf-row">
                <div class="conf-lbl">Customer</div>
                <div class="conf-track"><div class="conf-fill" id="cf1" style="width:0%;background:#A78BFA"></div></div>
                <div class="conf-pct" style="color:#A78BFA" id="cv1">0</div>
              </div>
              <div class="conf-row">
                <div class="conf-lbl">Time window</div>
                <div class="conf-track"><div class="conf-fill" id="cf2" style="width:0%;background:#34D399"></div></div>
                <div class="conf-pct" style="color:#34D399" id="cv2">0</div>
              </div>
            </div>

            <!-- HOME INDICATOR -->
            <div class="home-bar"><div class="home-indicator"></div></div>
          </div>
        </div><!-- /bezel -->
      </div><!-- /iphone -->
    </div><!-- /phone-scene -->

  </div><!-- /hero-inner -->

</section>

<!-- STATS BAR -->
<div class="stats-bar">
  <div class="stats-inner">
    <div class="stat-item">
      <div class="stat-n"><span class="hl">96</span>%</div>
      <div class="stat-l">Auto-reconciliation rate</div>
    </div>
    <div class="stat-item">
      <div class="stat-n">12<span style="font-size:22px;font-weight:500;color:var(--t3)">hrs</span></div>
      <div class="stat-l">Saved per week per team</div>
    </div>
    <div class="stat-item">
      <div class="stat-n">&lt;<span class="hl">1</span>s</div>
      <div class="stat-l">Webhook to matched invoice</div>
    </div>
    <div class="stat-item">
      <div class="stat-n"><span class="hl">₦</span>0</div>
      <div class="stat-l">Manual reconciliation cost</div>
    </div>
  </div>
</div>

<!-- HOW IT WORKS -->
<section id="how">
  <div class="container">
    <div class="s-eyebrow">How it works</div>
    <div class="s-title">Set it up once.<br>It runs itself.</div>
    <p class="s-sub">From creating a customer to having their payment auto-reconciled — four steps, zero manual work.</p>
    <div class="steps-grid">
      <div class="step-card">
        <div class="step-n">01</div>
        <div class="step-icon si-b">👤</div>
        <h3>Add your customer</h3>
        <p>Create a customer record. ReconOs instantly creates a dedicated payment account — one account per customer, no confusion.</p>
      </div>
      <div class="step-card">
        <div class="step-n">02</div>
        <div class="step-icon si-a">📋</div>
        <h3>Create an invoice</h3>
        <p>Issue an invoice with amount and due date. Share the customer's dedicated account number — payments go directly to their account.</p>
      </div>
      <div class="step-card">
        <div class="step-n">03</div>
        <div class="step-icon si-p">⚡</div>
        <h3>Payment arrives</h3>
        <p>Customer pays. ReconOs receives the payment instantly, verifies it, and processes it — idempotent, no duplicate risks.</p>
      </div>
      <div class="step-card">
        <div class="step-n">04</div>
        <div class="step-icon si-g">✓</div>
        <h3>Invoice goes PAID</h3>
        <p>The engine scores the match across amount, customer, and time window. Confidence ≥ 95%? The invoice is marked PAID. Automatically.</p>
      </div>
    </div>
  </div>
</section>

<!-- FEATURES -->
<section class="feats" id="features">
  <div class="container">
    <div class="s-eyebrow">Features</div>
    <div class="s-title">Everything your<br>finance team needs.</div>
    <p class="s-sub">Built for the realities of Nigerian business — logistics, schools, distributors, agencies.</p>
    <div class="feats-grid">
      <div class="feat">
        <div class="feat-icon si-b">⇄</div>
        <h3>Dedicated Payment Accounts</h3>
        <p>Every customer gets their own bank transfer account. Payments route directly — no reference codes, no mismatches, ever.</p>
        <div class="feat-link">→ One account per customer</div>
      </div>
      <div class="feat">
        <div class="feat-icon si-p">✦</div>
        <h3>Reconciliation Engine</h3>
        <p>Multi-signal scoring: amount, customer identity, time window, reference analysis. Confidence shown on every match.</p>
        <div class="feat-link">→ Up to 99% confidence</div>
      </div>
      <div class="feat">
        <div class="feat-icon si-g">⚡</div>
        <h3>Real-time Webhook Processing</h3>
        <p>ReconOs processes each payment in under a second with full idempotency protection.</p>
        <div class="feat-link">→ Sub-second matching</div>
      </div>
      <div class="feat">
        <div class="feat-icon si-a">⚠</div>
        <h3>Exception Center</h3>
        <p>Overpayments, unmatched transactions, duplicates — each flagged with AI-generated context and a recommended action.</p>
        <div class="feat-link">→ AI-assisted resolution</div>
      </div>
      <div class="feat">
        <div class="feat-icon si-b">◎</div>
        <h3>Operations Timeline</h3>
        <p>Every payment lifecycle event logged with timestamps — from receipt to final match. Full compliance audit trail.</p>
        <div class="feat-link">→ Compliance ready</div>
      </div>
      <div class="feat">
        <div class="feat-icon si-p">📈</div>
        <h3>AI Cashflow Insights</h3>
        <p>Pattern detection across customers. Know who pays on time, who's at risk, and your expected collections this week.</p>
        <div class="feat-link">→ 7-day forecast</div>
      </div>
    </div>
  </div>
</section>

<!-- ENGINE SECTION -->
<section class="engine-sec" id="engine">
  <div class="engine-inner">
    <div>
      <div class="s-eyebrow">The Confidence Engine</div>
      <div class="s-title">Not just matched.<br>Scored.</div>
      <p class="s-sub">Most tools match or don't. ReconOs scores every match across four signals and shows you exactly why — every time.</p>
      <div class="engine-feats" style="margin-top:40px">
        <div class="ef"><div class="ef-icon">💰</div><div><h4>Amount matching</h4><p>Exact and partial matching with configurable tolerance for rounding, bank charges, and split payments.</p></div></div>
        <div class="ef"><div class="ef-icon">◉</div><div><h4>Customer identity</h4><p>Each dedicated payment account maps to exactly one customer — the match starts at 97% confidence before anything else.</p></div></div>
        <div class="ef"><div class="ef-icon">⏱</div><div><h4>Time window analysis</h4><p>Payments within the invoice due window score higher. Builds payment patterns per customer over time.</p></div></div>
        <div class="ef"><div class="ef-icon">🔒</div><div><h4>Idempotency protection</h4><p>Every payment notification carries a unique key. If the same event is resent, it's silently ignored — no double-matching.</p></div></div>
      </div>
    </div>
    <div class="engine-visual">
      <img src="/images/confidence-engine.png?v=5" alt="Merchant reviewing payments on mobile with ReconOs" width="480" height="640" loading="lazy" />
    </div>
  </div>
</section>

<!-- PROOF -->
<section id="proof">
  <div class="container">
    <div class="s-eyebrow">Customer stories</div>
    <div class="s-title">Nigerian businesses<br>spending less time on books.</div>
    <div class="proof-grid">
      <div class="proof-card">
        <div class="stars"><span class="star">★</span><span class="star">★</span><span class="star">★</span><span class="star">★</span><span class="star">★</span></div>
        <p class="proof-q">"Before ReconOs, my accountant and I spent 4 hours every Monday matching weekend payments. Now it's done before I finish my morning tea."</p>
        <div class="proof-auth">
          <div class="pa" style="background:linear-gradient(135deg,#2563EB,#7C3AED)">KA</div>
          <div><div class="proof-name">Kemi Adeyemi</div><div class="proof-biz">Alaba Electronics Ltd, Lagos</div></div>
        </div>
      </div>
      <div class="proof-card">
        <div class="stars"><span class="star">★</span><span class="star">★</span><span class="star">★</span><span class="star">★</span><span class="star">★</span></div>
        <p class="proof-q">"80+ deliveries a week. Cash collection was a nightmare — customers paying to the wrong account. ReconOs fixed all of it."</p>
        <div class="proof-auth">
          <div class="pa" style="background:linear-gradient(135deg,#10B981,#0891B2)">CO</div>
          <div><div class="proof-name">Chinedu Okafor</div><div class="proof-biz">Chinedu Logistics, Abuja</div></div>
        </div>
      </div>
      <div class="proof-card">
        <div class="stars"><span class="star">★</span><span class="star">★</span><span class="star">★</span><span class="star">★</span><span class="star">★</span></div>
        <p class="proof-q">"School fees from 400 students, 12 weeks, different amounts. Now every fee reconciles itself. The bursar team is 3x faster."</p>
        <div class="proof-auth">
          <div class="pa" style="background:linear-gradient(135deg,#EC4899,#7C3AED)">FO</div>
          <div><div class="proof-name">Funmi Oladele</div><div class="proof-biz">Royal Crown Schools, Port Harcourt</div></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- CTA -->
<section class="cta-sec">
  <h2>Stop reconciling.<br>Start running<br>your business.</h2>
  <p>Set up in under 10 minutes. Free to start. No card required.</p>
  <div class="cta-actions">
    <a href="/auth?tab=signup" class="btn btn-primary btn-lg" style="font-weight:700">Get started free →</a>
    <a href="/demo" class="btn btn-outline-w btn-lg">Book a demo</a>
  </div>
</section>

<!-- FOOTER -->
<footer>
  <div class="footer-inner">
    <div class="footer-top">
      <div class="footer-brand">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:28px;height:28px;background:var(--blue);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:white">R</div>
          <div style="font-size:15px;font-weight:800;color:rgba(255,255,255,.7)">ReconOs</div>
        </div>
        <p>Payment Operations OS for Nigerian SMEs.</p>
        <div style="margin-top:16px;display:inline-flex;align-items:center;gap:6px;font-size:12px">
          Payment infrastructure provided by <span style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:5px;padding:2px 8px;font-weight:700;color:rgba(255,255,255,.4)">Nomba</span>
        </div>
      </div>
      <div class="footer-col"><h4>Product</h4><a href="/dashboard">Dashboard</a><a href="/reconciliation">Reconciliation</a><a href="/insights">AI Insights</a><a href="/activity">Activity</a><a href="#">Pricing</a></div>
      <div class="footer-col"><h4>Company</h4><a href="#">About</a><a href="#">Blog</a><a href="#">Careers</a><a href="#">Contact</a></div>
      <div class="footer-col"><h4>Legal</h4><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Security</a><a href="#">Compliance</a></div>
    </div>
    <div class="footer-bottom">
      <p>© 2026 ReconOs. All rights reserved.</p>
      <p>Made with care for Nigerian businesses.</p>
    </div>
  </div>
</footer>


</div>`;
const HOMEPAGE_JS = `// ── PHONE ANIMATION ──
const di = document.getElementById('dynamicIsland');
const diDefault = document.getElementById('diDefault');
const diNotif = document.getElementById('diNotif');
const tx0 = document.getElementById('tx0');
const tx0chip = document.getElementById('tx0chip');

const bars = [
  {fill: document.getElementById('cf0'), val: document.getElementById('cv0'), target: 60, w: 60},
  {fill: document.getElementById('cf1'), val: document.getElementById('cv1'), target: 25, w: 25},
  {fill: document.getElementById('cf2'), val: document.getElementById('cv2'), target: 10, w: 10},
];

function countUp(el, target, duration) {
  let start = 0;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start = Math.min(start + step, target);
    el.textContent = Math.round(start);
    if (start >= target) clearInterval(timer);
  }, 16);
}

function runPhoneAnim() {
  // Reset
  bars.forEach(b => { b.fill.style.width = '0%'; b.val.textContent = '0'; });
  tx0.classList.remove('tx-flash');
  tx0chip.className = 'tx-chip chip-pending';
  tx0chip.textContent = '● Pending';
  di.classList.remove('expanded');
  diDefault.classList.remove('hide');
  diNotif.classList.remove('show');

  // Step 1: bars animate
  setTimeout(() => {
    bars.forEach((b, i) => {
      setTimeout(() => {
        b.fill.style.width = b.w + '%';
        countUp(b.val, b.target, 900);
      }, i * 250);
    });
  }, 800);

  // Step 2: chip flips to matched
  setTimeout(() => {
    tx0chip.className = 'tx-chip chip-matched';
    tx0chip.textContent = '✓ Matched';
    tx0.classList.add('tx-flash');
  }, 2200);

  // Step 3: Dynamic Island expands with notification
  setTimeout(() => {
    di.classList.add('expanded');
    diDefault.classList.add('hide');
    diNotif.classList.add('show');
  }, 2700);

  // Step 4: collapse island back
  setTimeout(() => {
    di.classList.remove('expanded');
    diDefault.classList.remove('hide');
    diNotif.classList.remove('show');
  }, 5000);
}

setTimeout(runPhoneAnim, 1000);
setInterval(runPhoneAnim, 8000);

// ── SCROLL FADE IN ──
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'translateY(0)';
    }
  });
}, {threshold: 0.1});

document.querySelectorAll('.feat,.proof-card,.step-card').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(18px)';
  el.style.transition = 'opacity .5s ease, transform .5s ease';
  obs.observe(el);
});

// ── NAV SCROLL ──
const html = document.querySelector('.reconos-home');
window.addEventListener('scroll', () => {
  if (!html) return;
  const nav = document.querySelector('.reconos-home nav');
  if (!nav) return;
  const isDark = html.getAttribute('data-theme') !== 'light';
  nav.style.borderBottomColor =
    window.scrollY > 30
      ? (isDark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.1)')
      : (isDark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.07)');
});

// ── HAMBURGER / MOBILE MENU ──
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
const mobileMenuBackdrop = document.getElementById('mobileMenuBackdrop');
const mobileLinksAndBtns = mobileMenu.querySelectorAll('.mobile-link, .mobile-btn');

function openMenu() {
  hamburger.classList.add('open');
  hamburger.setAttribute('aria-expanded', 'true');
  mobileMenu.classList.add('open');
  document.body.classList.add('menu-open');
}

function closeMenu() {
  hamburger.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
  mobileMenu.classList.remove('open');
  document.body.classList.remove('menu-open');
}

hamburger.addEventListener('click', () => {
  mobileMenu.classList.contains('open') ? closeMenu() : openMenu();
});

mobileMenuBackdrop.addEventListener('click', closeMenu);

mobileLinksAndBtns.forEach(el => {
  el.addEventListener('click', closeMenu);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && mobileMenu.classList.contains('open')) closeMenu();
});

// Close menu automatically if viewport grows back to desktop size
window.addEventListener('resize', () => {
  if (window.innerWidth > 1024 && mobileMenu.classList.contains('open')) closeMenu();
});
`;

export default function HomePage() {
  useMarketingTheme('.reconos-home');

  useEffect(() => {
    const script = document.createElement('script');
    script.id = 'homepage-inline-script';
    script.innerHTML = HOMEPAGE_JS;
    document.body.appendChild(script);
    return () => {
      const existing = document.getElementById('homepage-inline-script');
      if (existing) document.body.removeChild(existing);
      document.body.classList.remove('menu-open');
    };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: HOMEPAGE_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: HOMEPAGE_BODY }} />
    </>
  );
}
