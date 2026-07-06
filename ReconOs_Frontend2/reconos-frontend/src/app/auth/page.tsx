// src/app/auth/page.tsx
// Auth page — converted exactly from the ReconOs auth design.
// All CSS selectors are scoped under .reconos-auth so they cannot leak
// into or collide with the dashboard's Tailwind styles. Split-panel
// layout (brand panel with live event stream + form panel), dark/light
// theme toggle, and password strength meter are preserved exactly as
// designed. Login/signup forms call the real backend
// (POST /auth/login, POST /auth/register) and redirect to /dashboard
// on success. The original script already reads ?tab=signup from
// window.location.search to open the correct tab, so no extra React
// routing logic is needed here.
'use client';

import { useEffect, Suspense } from 'react';
import { useMarketingTheme } from '@/lib/use-marketing-theme';
import { resolvePublicApiUrl } from '@/lib/public-api-url';

const AUTH_CSS = `/* ── RESET ── */
.reconos-auth *,.reconos-auth *::before,.reconos-auth *::after{box-sizing:border-box;margin:0;padding:0}

/* ── TOKENS ── */
.reconos-auth {
  --bg:        #03050A;
  --panel-l:   #070C18;
  --panel-r:   #03050A;
  --blue:      #2563EB;
  --blue-h:    #1D4ED8;
  --blue-glow: rgba(37,99,235,.35);
  --blue-soft: rgba(37,99,235,.12);
  --green:     #10B981;
  --green-s:   rgba(16,185,129,.15);
  --amber:     #F59E0B;
  --red:       #EF4444;
  --red-s:     rgba(239,68,68,.12);
  --t1:        #E8EEFA;
  --t2:        #6B7FA3;
  --t3:        #3D4F6B;
  --border:    rgba(255,255,255,.08);
  --border2:   rgba(255,255,255,.14);
  --input-bg:  rgba(255,255,255,.04);
  --input-bg-f:rgba(255,255,255,.07);
  --card:      rgba(255,255,255,.04);
  --event-bg:  rgba(255,255,255,.03);
}

.reconos-auth[data-theme="light"] {
  --bg:        #F0F4FC;
  --panel-l:   #0A1628;
  --panel-r:   #FFFFFF;
  --blue:      #2563EB;
  --blue-h:    #1D4ED8;
  --blue-glow: rgba(37,99,235,.2);
  --blue-soft: rgba(37,99,235,.08);
  --green:     #059669;
  --green-s:   rgba(5,150,105,.1);
  --amber:     #D97706;
  --red:       #DC2626;
  --red-s:     rgba(220,38,38,.08);
  --t1:        #0F172A;
  --t2:        #475569;
  --t3:        #94A3B8;
  --border:    rgba(0,0,0,.08);
  --border2:   rgba(0,0,0,.14);
  --input-bg:  rgba(0,0,0,.03);
  --input-bg-f:rgba(0,0,0,.05);
  --card:      rgba(0,0,0,.03);
  --event-bg:  rgba(0,0,0,.02);
}

/* ── BASE ── */
.reconos-auth,.reconos-auth { height:100%; }
.reconos-auth {
  font-family:'Inter',-apple-system,sans-serif;
  background:var(--bg);
  color:var(--t1);
  font-size:15px;
  line-height:1.6;
  -webkit-font-smoothing:antialiased;
  transition:background .3s, color .3s;
}

/* ── LAYOUT ── */
.reconos-auth .auth-wrap {
  display:grid;
  grid-template-columns:1fr 1fr;
  min-height:100vh;
}

/* ════════════════════════════════
   LEFT BRAND PANEL
════════════════════════════════ */
.reconos-auth .panel-left {
  background:var(--panel-l);
  padding:40px 48px 24px;
  display:flex;
  flex-direction:column;
  position:relative;
  overflow:hidden;
}

/* top-left glow orb */
.reconos-auth .panel-left::after {
  content:'';
  position:absolute;
  top:-120px; left:-120px;
  width:500px; height:500px;
  background:radial-gradient(ellipse, rgba(37,99,235,.18) 0%, transparent 65%);
  pointer-events:none;
}

/* bottom glow orb */
.reconos-auth .orb-bottom {
  position:absolute;
  bottom:-80px; right:-80px;
  width:400px; height:400px;
  background:radial-gradient(ellipse, rgba(16,185,129,.1) 0%, transparent 65%);
  pointer-events:none;
  pointer-events:none;
}

.reconos-auth .panel-logo {
  display:flex;
  align-items:center;
  gap:10px;
  position:relative;
  z-index:1;
  text-decoration:none;
}

.reconos-auth .logo-mark {
  width:34px; height:34px;
  background:var(--blue);
  border-radius:9px;
  display:flex; align-items:center; justify-content:center;
  font-size:17px; font-weight:900; color:white;
}

.reconos-auth .logo-name {
  font-size:17px; font-weight:800;
  color:white; letter-spacing:-.4px;
}

.reconos-auth .logo-name span { color:#60A5FA; }

.reconos-auth .panel-headline {
  margin-top:auto;
  position:relative;
  z-index:1;
  text-align:center;
}

.reconos-auth .panel-headline h2 {
  font-size:clamp(28px, 3.2vw, 42px);
  font-weight:900;
  color:white;
  letter-spacing:-1.5px;
  line-height:1.1;
  margin-bottom:14px;
}

.reconos-auth .panel-headline h2 em {
  font-style:normal;
  color:#60A5FA;
}

.reconos-auth .panel-headline p {
  font-size:15px;
  color:rgba(255,255,255,.45);
  line-height:1.7;
  max-width:360px;
  margin:0 auto 36px;
}

/* ── LIVE EVENT STREAM ── */
.reconos-auth .event-stream {
  background:rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.08);
  border-radius:16px;
  overflow:hidden;
  margin-bottom:32px;
  position:relative;
}

.reconos-auth .stream-header {
  padding:11px 16px;
  background:rgba(255,255,255,.04);
  border-bottom:1px solid rgba(255,255,255,.06);
  display:flex;
  align-items:center;
  justify-content:space-between;
}

.reconos-auth .stream-title {
  font-size:11px;
  font-weight:700;
  color:rgba(255,255,255,.3);
  text-transform:uppercase;
  letter-spacing:.8px;
}

.reconos-auth .stream-live {
  display:flex;
  align-items:center;
  gap:5px;
  font-size:10px;
  font-weight:800;
  color:var(--green);
  text-transform:uppercase;
  letter-spacing:.5px;
}

.reconos-auth .live-pulse {
  width:6px; height:6px;
  background:var(--green);
  border-radius:50%;
  animation:livepulse 1.4s infinite;
}

@keyframes livepulse {
  0%,100%{opacity:1;transform:scale(1)}
  50%{opacity:.4;transform:scale(.75)}
}

.reconos-auth .stream-body { padding:8px 0; }

.reconos-auth .ev {
  display:flex;
  align-items:center;
  gap:10px;
  padding:8px 14px;
  transition:background .2s;
  animation:evslide .4s ease both;
}

@keyframes evslide {
  from{opacity:0;transform:translateX(-10px)}
  to{opacity:1;transform:translateX(0)}
}

.reconos-auth .ev.ev-flash { background:rgba(16,185,129,.06); }

.reconos-auth .ev-dot {
  width:7px; height:7px;
  border-radius:50%;
  flex-shrink:0;
}

.reconos-auth .ev-dot.blue { background:var(--blue); }
.reconos-auth .ev-dot.green { background:var(--green); }
.reconos-auth .ev-dot.amber { background:var(--amber); }

.reconos-auth .ev-info { flex:1; min-width:0; }
.reconos-auth .ev-name { font-size:12px; font-weight:600; color:rgba(255,255,255,.8); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.reconos-auth .ev-sub  { font-size:10.5px; color:rgba(255,255,255,.3); margin-top:1px; }

.reconos-auth .ev-right { text-align:right; flex-shrink:0; }
.reconos-auth .ev-amount { font-size:12.5px; font-weight:800; color:rgba(255,255,255,.85); font-variant-numeric:tabular-nums; }

.reconos-auth .ev-chip {
  display:inline-flex;
  align-items:center;
  gap:3px;
  padding:2px 7px;
  border-radius:20px;
  font-size:9.5px;
  font-weight:800;
  margin-top:2px;
}

.reconos-auth .chip-m { background:rgba(16,185,129,.15); color:#34D399; }
.reconos-auth .chip-p { background:rgba(245,158,11,.12); color:#FBBF24; }

/* ── AUTH PANEL VISUAL ── */
.reconos-auth .auth-panel-visual {
  display:flex;
  align-items:center;
  justify-content:center;
  margin-bottom:0;
  position:relative;
  z-index:1;
}

.reconos-auth .auth-panel-visual img {
  width:100%;
  max-width:340px;
  height:auto;
  object-fit:contain;
  display:block;
}

/* ── CONFIDENCE MINI ── */
.reconos-auth .conf-mini {
  padding:10px 14px 14px;
  border-top:1px solid rgba(255,255,255,.05);
}

.reconos-auth .conf-mini-label {
  font-size:9.5px;
  font-weight:700;
  color:rgba(255,255,255,.25);
  text-transform:uppercase;
  letter-spacing:.6px;
  margin-bottom:8px;
}

.reconos-auth .conf-row {
  display:flex;
  align-items:center;
  gap:8px;
  margin-bottom:5px;
}

.reconos-auth .conf-row:last-child { margin-bottom:0; }

.reconos-auth .conf-lbl {
  font-size:10px;
  color:rgba(255,255,255,.3);
  min-width:56px;
}

.reconos-auth .conf-track {
  flex:1;
  height:3.5px;
  background:rgba(255,255,255,.06);
  border-radius:10px;
  overflow:hidden;
}

.reconos-auth .conf-fill {
  height:100%;
  border-radius:10px;
  transition:width 1s cubic-bezier(.34,1.56,.64,1);
}

.reconos-auth .conf-pct {
  font-size:10px;
  font-weight:800;
  min-width:24px;
  text-align:right;
}

/* ════════════════════════════════
   RIGHT FORM PANEL
════════════════════════════════ */
.reconos-auth .panel-right {
  background:var(--panel-r);
  display:flex;
  align-items:center;
  justify-content:center;
  padding:40px 32px;
  position:relative;
}

.reconos-auth[data-theme="light"] .panel-right {
  background:#FFFFFF;
}

/* theme toggle top-right */
.reconos-auth .theme-btn {
  position:absolute;
  top:24px; right:24px;
  width:36px; height:36px;
  border-radius:8px;
  border:1px solid var(--border2);
  background:var(--input-bg);
  display:flex; align-items:center; justify-content:center;
  font-size:16px;
  cursor:pointer;
  color:var(--t1);
  transition:all .2s;
  z-index:10;
}

.reconos-auth .theme-btn:hover { background:var(--input-bg-f); transform:rotate(15deg); }

/* back link */
.reconos-auth .back-link {
  position:absolute;
  top:28px; left:28px;
  display:flex;
  align-items:center;
  gap:6px;
  font-size:13px;
  font-weight:600;
  color:var(--t2);
  text-decoration:none;
  transition:color .15s;
  z-index:10;
}

.reconos-auth .back-link:hover { color:var(--t1); }
.reconos-auth .back-arrow { font-size:16px; transition:transform .2s; }
.reconos-auth .back-link:hover .back-arrow { transform:translateX(-3px); }

/* ── FORM CONTAINER ── */
.reconos-auth .form-box {
  width:100%;
  max-width:400px;
}

/* tab switcher */
.reconos-auth .tab-switch {
  display:flex;
  background:var(--input-bg);
  border:1px solid var(--border);
  border-radius:10px;
  padding:4px;
  margin-bottom:32px;
  position:relative;
}

.reconos-auth .tab-indicator {
  position:absolute;
  top:4px; left:4px;
  height:calc(100% - 8px);
  width:calc(50% - 4px);
  background:var(--blue);
  border-radius:7px;
  transition:transform .3s cubic-bezier(.34,1.2,.64,1);
  box-shadow:0 2px 12px var(--blue-glow);
  z-index:0;
}

.reconos-auth .tab-indicator.on-signup {
  transform:translateX(calc(100% + 4px));
}

.reconos-auth .tab-btn {
  flex:1;
  padding:9px 16px;
  font-size:13.5px;
  font-weight:600;
  color:var(--t2);
  border:none;
  background:transparent;
  border-radius:7px;
  cursor:pointer;
  transition:color .25s;
  position:relative;
  z-index:1;
  font-family:inherit;
}

.reconos-auth .tab-btn.active { color:white; }
.reconos-auth[data-theme="light"] .tab-btn.active { color:white; }

/* ── FORM HEADER ── */
.reconos-auth .form-heading {
  margin-bottom:28px;
  overflow:hidden;
}

.reconos-auth .form-heading h1 {
  font-size:26px;
  font-weight:850;
  color:var(--t1);
  letter-spacing:-0.8px;
  line-height:1.2;
  margin-bottom:6px;
}

.reconos-auth .form-heading p {
  font-size:14px;
  color:var(--t2);
  line-height:1.5;
}

/* ── FORM FIELDS ── */
.reconos-auth .form-panel {
  overflow:hidden;
}

/* login / signup panels */
.reconos-auth .auth-form {
  display:none;
}

.reconos-auth .auth-form.active {
  display:block;
  animation:formfadein .35s ease both;
}

@keyframes formfadein {
  from { opacity:0; transform:translateY(12px); }
  to   { opacity:1; transform:translateY(0); }
}

.reconos-auth .field-group {
  margin-bottom:16px;
  animation:fieldin .4s ease both;
}

@keyframes fieldin {
  from { opacity:0; transform:translateY(10px); }
  to   { opacity:1; transform:translateY(0); }
}

/* stagger children */
.reconos-auth .field-group:nth-child(1){ animation-delay:.05s }
.reconos-auth .field-group:nth-child(2){ animation-delay:.1s }
.reconos-auth .field-group:nth-child(3){ animation-delay:.15s }
.reconos-auth .field-group:nth-child(4){ animation-delay:.2s }
.reconos-auth .field-group:nth-child(5){ animation-delay:.25s }

.reconos-auth .field-row {
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:12px;
}

.reconos-auth label {
  display:block;
  font-size:12.5px;
  font-weight:600;
  color:var(--t2);
  margin-bottom:7px;
  letter-spacing:.1px;
}

.reconos-auth .input-wrap {
  position:relative;
}

.reconos-auth .input-icon {
  position:absolute;
  left:14px; top:50%;
  transform:translateY(-50%);
  font-size:15px;
  color:var(--t3);
  pointer-events:none;
  transition:color .2s;
  line-height:1;
}

.reconos-auth input[type="text"],
.reconos-auth input[type="email"],
.reconos-auth input[type="password"],
.reconos-auth input[type="tel"] {
  width:100%;
  height:52px;
  background:var(--input-bg);
  border:1.5px solid var(--border);
  border-radius:10px;
  padding:0 14px 0 42px;
  font-size:14.5px;
  font-family:inherit;
  color:var(--t1);
  outline:none;
  transition:border-color .2s, background .2s, box-shadow .2s;
  -webkit-appearance:none;
}

.reconos-auth input::placeholder { color:var(--t3); }

.reconos-auth input:focus {
  border-color:var(--blue);
  background:var(--input-bg-f);
  box-shadow:0 0 0 3px var(--blue-soft);
}

.reconos-auth input:focus + .input-icon-label,
.reconos-auth .input-wrap:focus-within .input-icon {
  color:var(--blue);
}

/* password toggle */
.reconos-auth .pw-toggle {
  position:absolute;
  right:14px; top:50%;
  transform:translateY(-50%);
  font-size:15px;
  color:var(--t3);
  cursor:pointer;
  background:none;
  border:none;
  padding:0;
  transition:color .2s;
  line-height:1;
}

.reconos-auth .pw-toggle:hover { color:var(--t2); }

/* no left-pad for inputs without icon */
.reconos-auth input.no-icon { padding-left:14px; }

/* error state */
.reconos-auth input.error {
  border-color:var(--red);
  background:var(--red-s);
  animation:shake .4s ease;
}

@keyframes shake {
  0%,100%{transform:translateX(0)}
  20%{transform:translateX(-6px)}
  40%{transform:translateX(6px)}
  60%{transform:translateX(-4px)}
  80%{transform:translateX(4px)}
}

.reconos-auth .field-error {
  font-size:12px;
  color:var(--red);
  margin-top:5px;
  display:none;
  animation:fadein .2s ease;
}

.reconos-auth .field-error.show { display:block; }

@keyframes fadein {
  from{opacity:0;transform:translateY(-4px)}
  to{opacity:1;transform:translateY(0)}
}

/* ── PASSWORD STRENGTH ── */
.reconos-auth .pw-strength {
  margin-top:8px;
  display:none;
}

.reconos-auth .pw-strength.show { display:block; }

.reconos-auth .strength-bars {
  display:flex;
  gap:4px;
  margin-bottom:4px;
}

.reconos-auth .strength-bar {
  height:3px;
  flex:1;
  background:var(--border);
  border-radius:10px;
  transition:background .3s;
}

.reconos-auth .strength-bar.weak   { background:#EF4444; }
.reconos-auth .strength-bar.medium { background:#F59E0B; }
.reconos-auth .strength-bar.strong { background:#10B981; }

.reconos-auth .strength-label {
  font-size:11px;
  font-weight:600;
  color:var(--t3);
  transition:color .3s;
}

.reconos-auth .strength-label.weak   { color:#EF4444; }
.reconos-auth .strength-label.medium { color:#F59E0B; }
.reconos-auth .strength-label.strong { color:#10B981; }

/* ── EXTRAS ── */
.reconos-auth .field-extras {
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin-bottom:16px;
}

.reconos-auth .checkbox-wrap {
  display:flex;
  align-items:center;
  gap:8px;
  cursor:pointer;
}

.reconos-auth .checkbox-wrap input[type="checkbox"] {
  width:16px; height:16px;
  border-radius:4px;
  border:1.5px solid var(--border2);
  background:var(--input-bg);
  accent-color:var(--blue);
  cursor:pointer;
  padding:0;
}

.reconos-auth .checkbox-label {
  font-size:13px;
  color:var(--t2);
  cursor:pointer;
  user-select:none;
}

.reconos-auth .forgot-link {
  font-size:13px;
  color:var(--blue);
  font-weight:600;
  text-decoration:none;
  transition:opacity .15s;
}

.reconos-auth .forgot-link:hover { opacity:.75; }

.reconos-auth .forgot-feedback {
  display: none;
  margin: -8px 0 16px;
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
  color: var(--green);
}
.reconos-auth .forgot-feedback.show { display: block; }
.reconos-auth .forgot-feedback.error { color: var(--red); }

/* ── SUBMIT BUTTON ── */
.reconos-auth .btn-submit {
  width:100%;
  height:52px;
  background:var(--blue);
  color:white;
  border:none;
  border-radius:10px;
  font-size:15px;
  font-weight:700;
  font-family:inherit;
  cursor:pointer;
  transition:all .2s;
  position:relative;
  overflow:hidden;
  letter-spacing:-.1px;
  margin-bottom:20px;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:8px;
}

.reconos-auth .btn-submit:hover {
  background:var(--blue-h);
  transform:translateY(-1px);
  box-shadow:0 6px 24px var(--blue-glow);
}

.reconos-auth .btn-submit:active { transform:translateY(0); }

/* shimmer on loading */
.reconos-auth .btn-submit.loading {
  pointer-events:none;
  background:var(--blue-h);
}

.reconos-auth .btn-submit.loading::after {
  content:'';
  position:absolute;
  top:0; left:-100%;
  width:100%; height:100%;
  background:linear-gradient(90deg, transparent, rgba(255,255,255,.15), transparent);
  animation:shimmer 1.2s infinite;
}

@keyframes shimmer {
  from{left:-100%}
  to{left:100%}
}

.reconos-auth .btn-spinner {
  width:18px; height:18px;
  border:2.5px solid rgba(255,255,255,.3);
  border-top-color:white;
  border-radius:50%;
  animation:spin .7s linear infinite;
  display:none;
}

.reconos-auth .btn-submit.loading .btn-spinner { display:block; }
.reconos-auth .btn-submit.loading .btn-text { opacity:.8; }

@keyframes spin {
  to{transform:rotate(360deg)}
}

/* ── DIVIDER ── */
.reconos-auth .divider {
  display:flex;
  align-items:center;
  gap:12px;
  margin-bottom:20px;
}

.reconos-auth .div-line {
  flex:1;
  height:1px;
  background:var(--border);
}

.reconos-auth .div-text {
  font-size:12.5px;
  color:var(--t3);
  font-weight:500;
  white-space:nowrap;
}

/* ── SOCIAL BUTTONS ── */
.reconos-auth .social-btns {
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px;
  margin-bottom:24px;
}

.reconos-auth .btn-social {
  height:46px;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  border:1.5px solid var(--border2);
  border-radius:10px;
  background:var(--input-bg);
  font-size:13.5px;
  font-weight:600;
  color:var(--t1);
  cursor:pointer;
  font-family:inherit;
  transition:all .2s;
}

.reconos-auth .btn-social:hover {
  background:var(--input-bg-f);
  border-color:var(--border2);
  transform:translateY(-1px);
}

.reconos-auth .social-icon { font-size:17px; }

/* ── FOOTER TEXT ── */
.reconos-auth .form-footer {
  text-align:center;
  font-size:13px;
  color:var(--t2);
}

.reconos-auth .form-footer a {
  color:var(--blue);
  font-weight:600;
  text-decoration:none;
  transition:opacity .15s;
}

.reconos-auth .form-footer a:hover { opacity:.75; }

/* ── SUCCESS STATE ── */
.reconos-auth .success-screen {
  display:none;
  flex-direction:column;
  align-items:center;
  text-align:center;
  padding:20px 0;
  animation:formfadein .4s ease both;
}

.reconos-auth .success-screen.show { display:flex; }

.reconos-auth .success-ring {
  width:72px; height:72px;
  border-radius:50%;
  background:var(--green);
  color:#fff;
  display:flex; align-items:center; justify-content:center;
  font-size:32px;
  font-weight:800;
  margin-bottom:20px;
  box-shadow:0 8px 28px rgba(16,185,129,.35);
  animation:popIn .5s cubic-bezier(.34,1.56,.64,1) both;
}

@keyframes popIn {
  from{transform:scale(0);opacity:0}
  to{transform:scale(1);opacity:1}
}

.reconos-auth .success-title {
  font-size:22px;
  font-weight:800;
  color:var(--t1);
  letter-spacing:-.5px;
  margin-bottom:8px;
}

.reconos-auth .success-sub {
  font-size:14px;
  color:var(--t2);
  line-height:1.6;
  max-width:300px;
  margin-bottom:0;
}

/* ── TERMS ── */
.reconos-auth .terms-note {
  font-size:11.5px;
  color:var(--t3);
  text-align:center;
  line-height:1.6;
  margin-top:4px;
}

.reconos-auth .terms-note a {
  color:var(--t2);
  text-decoration:none;
}

.reconos-auth .terms-note a:hover { color:var(--t1); }

/* ════════════════════════════════
   RESPONSIVE
════════════════════════════════ */
@media(max-width:900px){
  .reconos-auth .auth-wrap{ grid-template-columns:1fr; }
  .reconos-auth .panel-left{ display:none; }
  .reconos-auth .panel-right{ min-height:100vh; padding:32px 24px; }
}

@media(max-width:420px){
  .reconos-auth .field-row{ grid-template-columns:1fr; }
  .reconos-auth .social-btns{ grid-template-columns:1fr; }
  .reconos-auth .form-box{ max-width:100%; }
}
`;
const AUTH_BODY = `<div class="reconos-auth">

<div class="auth-wrap">

  <!-- ════════════════════════════════
       LEFT BRAND PANEL
  ════════════════════════════════ -->
  <div class="panel-left">
    <div class="orb-bottom"></div>

    <!-- Logo -->
    <a href="/" class="panel-logo">
      <div class="logo-mark">R</div>
      <div class="logo-name">Recon<span>Os</span></div>
    </a>

    <!-- Headline + live demo -->
    <div class="panel-headline">
      <h2>Every payment<br><em>reconciles</em><br>itself.</h2>
      <p>Automated payment reconciliation for schools, clinics, landlords, cooperatives, and growing businesses.</p>

      <!-- Brand visual -->
      <div class="auth-panel-visual">
        <img src="/images/confidence-engine-photo.png?v=3" alt="Business owner checking account balance on mobile after a successful payment" width="340" height="450" loading="lazy" />
      </div>
    </div>
  </div>

  <!-- ════════════════════════════════
       RIGHT FORM PANEL
  ════════════════════════════════ -->
  <div class="panel-right">
    <!-- Theme toggle -->
    <button class="theme-btn" id="themeBtn" title="Toggle theme">☀</button>

    <!-- Back to homepage -->
    <a href="/" class="back-link">
      <span class="back-arrow">←</span> Back
    </a>

    <div class="form-box">

      <!-- Tab Switcher -->
      <div class="tab-switch" id="tabSwitch" role="tablist">
        <div class="tab-indicator" id="tabIndicator"></div>
        <button class="tab-btn active" id="tabLogin" onclick="switchTab('login')">Sign in</button>
        <button class="tab-btn" id="tabSignup" onclick="switchTab('signup')">Create account</button>
      </div>

      <!-- Success Screen -->
      <div class="success-screen" id="successScreen">
        <div class="success-ring">✓</div>
        <div class="success-title" id="successTitle">Welcome back!</div>
        <div class="success-sub" id="successSub">You're signed in. Redirecting to your dashboard…</div>
      </div>

      <!-- LOGIN FORM -->
      <div class="auth-form active" id="loginForm">
        <div class="form-heading">
          <h1>Welcome back</h1>
          <p>Sign in to your ReconOs workspace</p>
        </div>

        <!-- Social -->
        <div class="social-btns">
          <button class="btn-social" onclick="handleSocial(this,'Google')">
            <span class="social-icon">G</span> Google
          </button>
          <button class="btn-social" onclick="handleSocial(this,'Microsoft')">
            <span class="social-icon">⬛</span> Microsoft
          </button>
        </div>

        <div class="divider">
          <div class="div-line"></div>
          <span class="div-text">or continue with email</span>
          <div class="div-line"></div>
        </div>

        <!-- Email -->
        <div class="field-group">
          <label for="loginEmail">Work email</label>
          <div class="input-wrap">
            <span class="input-icon">✉</span>
            <input type="email" id="loginEmail" placeholder="kemi@alaelectronics.ng"
              oninput="clearError(this)" onfocus="clearError(this)">
          </div>
          <div class="field-error" id="loginEmailErr">Please enter a valid email address.</div>
        </div>

        <!-- Password -->
        <div class="field-group">
          <label for="loginPw">Password</label>
          <div class="input-wrap">
            <span class="input-icon">🔒</span>
            <input type="password" id="loginPw" placeholder="Enter your password"
              oninput="clearError(this)" onfocus="clearError(this)">
            <button class="pw-toggle" type="button" onclick="togglePw('loginPw',this)" aria-label="Show password">👁</button>
          </div>
          <div class="field-error" id="loginPwErr">Password is required.</div>
        </div>

        <!-- Remember + forgot -->
        <div class="field-extras">
          <label class="checkbox-wrap">
            <input type="checkbox" id="rememberMe">
            <span class="checkbox-label">Remember me</span>
          </label>
          <a href="#" class="forgot-link" onclick="handleForgotPassword(event);return false;">Forgot password?</a>
        </div>

        <p class="forgot-feedback" id="forgotFeedback" role="status"></p>

        <!-- Submit -->
        <button class="btn-submit" id="loginBtn" onclick="handleLogin()">
          <div class="btn-spinner"></div>
          <span class="btn-text">Sign in →</span>
        </button>

        <div class="form-footer">
          Don't have an account? <a href="#" onclick="switchTab('signup');return false;">Create one</a>
        </div>
      </div>

      <!-- SIGNUP FORM -->
      <div class="auth-form" id="signupForm">
        <div class="form-heading">
          <h1>Create your account</h1>
          <p>Start reconciling payments in under 10 minutes</p>
        </div>

        <!-- Name row -->
        <div class="field-group">
          <div class="field-row">
            <div>
              <label for="firstName">First name</label>
              <div class="input-wrap">
                <span class="input-icon">👤</span>
                <input type="text" id="firstName" placeholder="Kemi" oninput="clearError(this)">
              </div>
              <div class="field-error" id="firstNameErr">Required.</div>
            </div>
            <div>
              <label for="lastName">Last name</label>
              <div class="input-wrap">
                <span class="input-icon">👤</span>
                <input type="text" id="lastName" placeholder="Adeyemi" oninput="clearError(this)">
              </div>
              <div class="field-error" id="lastNameErr">Required.</div>
            </div>
          </div>
        </div>

        <!-- Business name -->
        <div class="field-group">
          <label for="bizName">Business name</label>
          <div class="input-wrap">
            <span class="input-icon">🏢</span>
            <input type="text" id="bizName" placeholder="Alaba Electronics Ltd" oninput="clearError(this)">
          </div>
          <div class="field-error" id="bizNameErr">Business name is required.</div>
        </div>

        <!-- Email -->
        <div class="field-group">
          <label for="signupEmail">Work email</label>
          <div class="input-wrap">
            <span class="input-icon">✉</span>
            <input type="email" id="signupEmail" placeholder="kemi@alababelectronics.ng" oninput="clearError(this)">
          </div>
          <div class="field-error" id="signupEmailErr">Please enter a valid email address.</div>
        </div>

        <!-- Password -->
        <div class="field-group">
          <label for="signupPw">Password</label>
          <div class="input-wrap">
            <span class="input-icon">🔒</span>
            <input type="password" id="signupPw" placeholder="Create a strong password"
              oninput="checkStrength(this)" onfocus="showStrength()">
            <button class="pw-toggle" type="button" onclick="togglePw('signupPw',this)" aria-label="Show password">👁</button>
          </div>
          <div class="field-error" id="signupPwErr">Password must be at least 8 characters.</div>
          <div class="pw-strength" id="pwStrength">
            <div class="strength-bars">
              <div class="strength-bar" id="sb0"></div>
              <div class="strength-bar" id="sb1"></div>
              <div class="strength-bar" id="sb2"></div>
              <div class="strength-bar" id="sb3"></div>
            </div>
            <div class="strength-label" id="strengthLabel">Start typing…</div>
          </div>
        </div>

        <!-- Terms -->
        <div class="field-group" style="margin-bottom:20px">
          <label class="checkbox-wrap">
            <input type="checkbox" id="termsCheck">
            <span class="checkbox-label">I agree to the <a href="#" style="color:var(--blue)">Terms</a> and <a href="#" style="color:var(--blue)">Privacy Policy</a></span>
          </label>
          <div class="field-error" id="termsErr">You must agree to continue.</div>
        </div>

        <!-- Submit -->
        <button class="btn-submit" id="signupBtn" onclick="handleSignup()">
          <div class="btn-spinner"></div>
          <span class="btn-text">Create account →</span>
        </button>

        <div class="form-footer">
          Already have an account? <a href="#" onclick="switchTab('login');return false;">Sign in</a>
        </div>
      </div>

    </div>
  </div>
</div>


</div>`;
const AUTH_JS = `/* ════════════════════════════════
   TAB SWITCHING
════════════════════════════════ */
function switchTab(tab) {  const indicator = document.getElementById('tabIndicator');
  const loginForm  = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const tabLogin   = document.getElementById('tabLogin');
  const tabSignup  = document.getElementById('tabSignup');

  // Hide success if showing
  document.getElementById('successScreen').classList.remove('show');
  const tabSwitch = document.getElementById('tabSwitch');
  if (tabSwitch) tabSwitch.style.display = '';

  if (tab === 'login') {
    indicator.classList.remove('on-signup');
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    loginForm.classList.add('active');
    signupForm.classList.remove('active');
    document.title = 'ReconOs — Sign in';
  } else {
    indicator.classList.add('on-signup');
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    signupForm.classList.add('active');
    loginForm.classList.remove('active');
    document.title = 'ReconOs — Create account';
  }
}

/* ════════════════════════════════
   VALIDATION HELPERS
════════════════════════════════ */
function showError(input, errId, msg) {
  input.classList.add('error');
  const el = document.getElementById(errId);
  if (el) { el.textContent = msg; el.classList.add('show'); }
  return false;
}

function clearError(input) {
  input.classList.remove('error');
  const errEl = input.closest('.field-group')?.querySelector('.field-error');
  if (errEl) errEl.classList.remove('show');
}

function isEmail(v) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v); }

function postAuthPath(org) {
  if (!org || !org.industryTemplate) return '/onboarding';
  return '/dashboard';
}

/* ════════════════════════════════
   API CONFIG — set from React before script runs (see page.tsx)
════════════════════════════════ */
function apiUrl(path) {
  const base = window.RECONOS_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3002/api' : '/api');
  return base + path;
}

function persistAuth(data) {
  localStorage.setItem('token', data.token);
  if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
  localStorage.setItem('user', JSON.stringify(data.user));
  localStorage.setItem('org', JSON.stringify(data.org));
  document.cookie = 'token=' + encodeURIComponent(data.token) + '; path=/; max-age=604800; SameSite=Lax';
  // Sync Zustand persist bucket so React dashboard guard sees the session
  try {
    localStorage.setItem('reconos-auth', JSON.stringify({
      state: { token: data.token, user: data.user, org: data.org },
      version: 0,
    }));
  } catch (_) {}
}

/* ════════════════════════════════
   LOGIN
════════════════════════════════ */
async function handleLogin() {
  const email = document.getElementById('loginEmail');
  const pw    = document.getElementById('loginPw');
  const btn   = document.getElementById('loginBtn');
  let valid = true;

  if (!isEmail(email.value.trim()))
    valid = showError(email, 'loginEmailErr', 'Please enter a valid email address.');
  if (!pw.value)
    valid = showError(pw, 'loginPwErr', 'Password is required.');

  if (!valid) return;

  btn.classList.add('loading');
  btn.querySelector('.btn-text').textContent = 'Signing in…';

  try {
    const res = await fetch(apiUrl('/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value.trim(), password: pw.value }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Invalid credentials');
    }

    const data = await res.json();

    if (data.requiresOtp && data.otpSession) {
      btn.classList.remove('loading');
      btn.querySelector('.btn-text').textContent = 'Sign in →';
      const q = new URLSearchParams({
        session: data.otpSession,
        email: data.maskedEmail || '',
      });
      window.location.href = '/auth/otp?' + q.toString();
      return;
    }

    persistAuth(data);

    btn.classList.remove('loading');
    showSuccess('Welcome back!', "You're signed in. Setting up your workspace…");
    setTimeout(() => { window.location.href = postAuthPath(data.org); }, 1400);
  } catch (err) {
    btn.classList.remove('loading');
    btn.querySelector('.btn-text').textContent = 'Sign in →';
    const msg = err instanceof TypeError && err.message === 'Failed to fetch'
      ? 'Cannot reach the API. Check NEXT_PUBLIC_API_URL on Vercel and FRONTEND_URL on Render.'
      : (err.message || 'Invalid email or password.');
    showError(pw, 'loginPwErr', msg);
  }
}

/* ════════════════════════════════
   FORGOT PASSWORD
════════════════════════════════ */
async function handleForgotPassword(e) {
  if (e) e.preventDefault();
  const email = document.getElementById('loginEmail');
  const feedback = document.getElementById('forgotFeedback');
  feedback.classList.remove('show', 'error');
  clearError(email);

  if (!isEmail(email.value.trim())) {
    showError(email, 'loginEmailErr', 'Enter your email address first.');
    return;
  }

  feedback.textContent = 'Sending reset link…';
  feedback.classList.add('show');
  feedback.classList.remove('error');

  try {
    const res = await fetch(apiUrl('/auth/forgot-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value.trim() }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Could not send reset email');
    }
    feedback.textContent =
      'If an account exists for that email, we sent a reset link. Check your inbox (and spam).';
  } catch (err) {
    feedback.classList.add('error');
    const msg = err instanceof TypeError && err.message === 'Failed to fetch'
      ? 'Cannot reach the API. Check your connection and try again.'
      : (err.message || 'Could not send reset email.');
    feedback.textContent = msg;
  }
}

/* ════════════════════════════════
   SIGNUP
════════════════════════════════ */
async function handleSignup() {
  const fn     = document.getElementById('firstName');
  const ln     = document.getElementById('lastName');
  const biz    = document.getElementById('bizName');
  const email  = document.getElementById('signupEmail');
  const pw     = document.getElementById('signupPw');
  const terms  = document.getElementById('termsCheck');
  const btn    = document.getElementById('signupBtn');
  let valid = true;

  if (!fn.value.trim())          valid = showError(fn, 'firstNameErr', 'Required.');
  if (!ln.value.trim())          valid = showError(ln, 'lastNameErr', 'Required.');
  if (!biz.value.trim())         valid = showError(biz, 'bizNameErr', 'Business name is required.');
  if (!isEmail(email.value.trim())) valid = showError(email, 'signupEmailErr', 'Please enter a valid email address.');
  if (pw.value.length < 8)      valid = showError(pw, 'signupPwErr', 'Password must be at least 8 characters.');
  if (!terms.checked) {
    const errEl = document.getElementById('termsErr');
    errEl.classList.add('show');
    valid = false;
  }

  if (!valid) return;

  btn.classList.add('loading');
  btn.querySelector('.btn-text').textContent = 'Creating account…';

  try {
    const res = await fetch(apiUrl('/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orgName: biz.value.trim(),
        name: \`\${fn.value.trim()} \${ln.value.trim()}\`,
        email: email.value.trim(),
        password: pw.value,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Registration failed');
    }

    const data = await res.json();
    persistAuth(data);

    btn.classList.remove('loading');
    showSuccess('Account created! 🎉', \`Welcome, \${fn.value}! Let's set up your workspace…\`);
    setTimeout(() => { window.location.href = postAuthPath(data.org); }, 1600);
  } catch (err) {
    btn.classList.remove('loading');
    btn.querySelector('.btn-text').textContent = 'Create account →';
    const msg = err instanceof TypeError && err.message === 'Failed to fetch'
      ? 'Cannot reach the API. Use http://localhost:3003 (not 127.0.0.1) and ensure Backend2 is running on port 3002.'
      : (err.message || 'Registration failed. Try a different email.');
    showError(email, 'signupEmailErr', msg);
  }
}

function showSuccess(title, sub) {
  const ss = document.getElementById('successScreen');
  const loginForm  = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const tabSwitch = document.getElementById('tabSwitch');
  loginForm.classList.remove('active');
  signupForm.classList.remove('active');
  if (tabSwitch) tabSwitch.style.display = 'none';
  document.getElementById('successTitle').textContent = title;
  document.getElementById('successSub').textContent = sub;
  ss.classList.add('show');
}

function resetSuccess() {
  document.getElementById('successScreen').classList.remove('show');
  const tabSwitch = document.getElementById('tabSwitch');
  if (tabSwitch) tabSwitch.style.display = '';
  switchTab('login');
}

/* ════════════════════════════════
   SOCIAL AUTH
════════════════════════════════ */
function handleSocial(btn, provider) {
  const original = btn.innerHTML;
  btn.innerHTML = \`<span style="font-size:13px">Connecting…</span>\`;
  btn.disabled = true;
  setTimeout(() => {
    btn.innerHTML = original;
    btn.disabled = false;
    showSuccess('Welcome!', \`Signed in via \${provider}. Redirecting to dashboard…\`);
  }, 1800);
}

/* ════════════════════════════════
   PASSWORD TOGGLE
════════════════════════════════ */
function togglePw(id, btn) {
  const input = document.getElementById(id);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁';
  }
}

/* ════════════════════════════════
   PASSWORD STRENGTH
════════════════════════════════ */
function showStrength() {
  document.getElementById('pwStrength').classList.add('show');
}

function checkStrength(input) {
  const v = input.value;
  const bars = [document.getElementById('sb0'), document.getElementById('sb1'),
                document.getElementById('sb2'), document.getElementById('sb3')];
  const label = document.getElementById('strengthLabel');

  // Score
  let score = 0;
  if (v.length >= 8)  score++;
  if (/[A-Z]/.test(v)) score++;
  if (/[0-9]/.test(v)) score++;
  if (/[^A-Za-z0-9]/.test(v)) score++;

  bars.forEach((b,i) => {
    b.className = 'strength-bar';
    if (i < score) {
      if (score <= 1) b.classList.add('weak');
      else if (score <= 2) b.classList.add('medium');
      else b.classList.add('strong');
    }
  });

  if (!v) { label.textContent = 'Start typing…'; label.className = 'strength-label'; }
  else if (score <= 1) { label.textContent = 'Weak'; label.className = 'strength-label weak'; }
  else if (score <= 2) { label.textContent = 'Medium — add uppercase or numbers'; label.className = 'strength-label medium'; }
  else if (score === 3) { label.textContent = 'Good'; label.className = 'strength-label strong'; }
  else { label.textContent = 'Strong ✓'; label.className = 'strength-label strong'; }
}

/* ════════════════════════════════
   URL PARAM — open correct tab
   e.g. auth.html?tab=signup
════════════════════════════════ */
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('tab') === 'signup') {
  switchTab('signup');
}

/* ════════════════════════════════
   ALREADY SIGNED IN? Route to dashboard or onboarding
════════════════════════════════ */
if (localStorage.getItem('token')) {
  let org = null;
  try {
    const raw = localStorage.getItem('org');
    if (raw) org = JSON.parse(raw);
  } catch (_) {}
  window.location.href = postAuthPath(org);
}
`;

function AuthContent() {
  useMarketingTheme('.reconos-auth');

  useEffect(() => {
    (window as Window & { RECONOS_API_URL?: string; __reconosAuthInit?: boolean }).RECONOS_API_URL =
      resolvePublicApiUrl();

    if ((window as Window & { __reconosAuthInit?: boolean }).__reconosAuthInit) return;

    const script = document.createElement('script');
    script.id = 'auth-inline-script';
    script.textContent = AUTH_JS;
    document.body.appendChild(script);
    (window as Window & { __reconosAuthInit?: boolean }).__reconosAuthInit = true;

    return () => {
      const existing = document.getElementById('auth-inline-script');
      if (existing) document.body.removeChild(existing);
    };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: AUTH_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: AUTH_BODY }} />
    </>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthContent />
    </Suspense>
  );
}
