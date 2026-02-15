import { DocType, ClientType } from "@prisma/client";

export function getDefaultTemplate(
  docType: DocType,
  clientType: ClientType | null
): { html: string; css: string } {
  if (docType === DocType.SOA && clientType === ClientType.INDIVIDUAL) {
    return { html: SOA_INDIVIDUAL, css: "" };
  }
  if (docType === DocType.SOA && clientType === ClientType.PARTNER) {
    return { html: SOA_PARTNER, css: "" };
  }
  if (docType === DocType.ROA) {
    return { html: ROA_DEFAULT, css: "" };
  }
  return { html: SOE_DEFAULT, css: "" };
}

// ============================================================
// SOA INDIVIDUAL -- Merged existing-cover + new-cover via Nunjucks
// ============================================================
const SOA_INDIVIDUAL = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Statement of Advice — Smiths Insurance & KiwiSaver</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:ital,wght@0,300;0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
<style>
  :root {
    --accent: #C08B6F;
    --accent-light: #D4A88E;
    --accent-bg: rgba(192,139,111,0.08);
    --accent-border: rgba(192,139,111,0.25);
    --dark: #2C2C2C;
    --body: #444444;
    --muted: #888888;
    --light-bg: #FAFAF8;
    --card-bg: #F7F5F2;
    --white: #FFFFFF;
    --border: #E8E4DF;
    --warning-bg: #FFF8F0;
    --warning-border: #E8C9A8;
    --font-display: 'Playfair Display', Georgia, serif;
    --font-body: 'Source Sans 3', 'Segoe UI', sans-serif;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: A4; margin: 18mm 16mm 22mm 16mm; }
  body { font-family: var(--font-body); font-size: 10.5pt; line-height: 1.6; color: var(--body); background: var(--white); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .accent-bar { width: 100%; height: 8px; background: linear-gradient(90deg, var(--accent) 0%, var(--accent-light) 100%); }
  .page { max-width: 800px; margin: 0 auto; padding: 0 40px; }
  .header { display: flex; align-items: center; justify-content: space-between; padding: 32px 0 24px 0; border-bottom: 1px solid var(--border); }
  .header img.logo { height: 48px; width: auto; }
  .header .doc-type { font-family: var(--font-body); font-size: 9pt; font-weight: 600; color: var(--muted); letter-spacing: 0.5px; text-transform: uppercase; }
  .title-block { text-align: center; padding: 48px 0 36px 0; }
  .title-block h1 { font-family: var(--font-display); font-size: 28pt; font-weight: 700; color: var(--dark); letter-spacing: -0.5px; margin-bottom: 4px; }
  .title-block .subtitle { font-family: var(--font-body); font-size: 13pt; color: var(--muted); font-weight: 300; }
  .doc-title-center { text-align: center; margin-bottom: 8px; }
  .doc-title-center .main { font-family: var(--font-display); font-size: 18pt; font-weight: 600; color: var(--dark); }
  .doc-title-center .sub { font-family: var(--font-body); font-size: 11pt; color: var(--muted); }
  .schedule-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 6px; padding: 28px 32px; margin-bottom: 32px; }
  .schedule-card h3 { font-family: var(--font-display); font-size: 13pt; font-weight: 600; color: var(--dark); margin-bottom: 4px; padding-bottom: 10px; border-bottom: 2px solid var(--accent); display: inline-block; }
  .schedule-table { width: 100%; margin-top: 16px; border-collapse: collapse; }
  .schedule-table td { padding: 7px 0; vertical-align: top; border: none; }
  .schedule-table td:first-child { width: 200px; color: var(--muted); font-size: 9.5pt; }
  .schedule-table td:last-child { font-weight: 600; color: var(--dark); font-size: 10pt; }
  .prepared-for { display: flex; gap: 48px; margin-bottom: 36px; }
  .prepared-for .info-pair { display: flex; align-items: baseline; gap: 12px; }
  .prepared-for .label { font-weight: 600; color: var(--dark); font-size: 10pt; white-space: nowrap; }
  .prepared-for .value { color: var(--body); font-style: italic; }
  .section-heading { display: flex; align-items: center; gap: 14px; margin: 40px 0 18px 0; page-break-after: avoid; }
  .section-heading .num { width: 30px; height: 30px; min-width: 30px; background: var(--accent); color: var(--white); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12pt; }
  .section-heading h2 { font-family: var(--font-display); font-size: 15pt; font-weight: 700; color: var(--dark); text-transform: uppercase; letter-spacing: 0.3px; }
  .sub-heading { font-family: var(--font-display); font-size: 12.5pt; font-weight: 600; color: var(--dark); margin: 28px 0 12px 0; page-break-after: avoid; }
  .body-text { margin-bottom: 14px; line-height: 1.65; }
  .body-text em { color: var(--muted); }
  .info-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 6px; padding: 22px 28px; margin-bottom: 20px; page-break-inside: avoid; }
  .info-card h4 { font-family: var(--font-display); font-size: 11pt; font-weight: 600; color: var(--dark); margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px solid var(--accent); display: inline-block; }
  .info-card p { margin-bottom: 8px; }
  .placeholder { background: rgba(192,139,111,0.12); border: 1px dashed var(--accent-border); border-radius: 3px; padding: 2px 8px; font-style: italic; color: var(--accent); font-weight: 600; white-space: nowrap; }
  .placeholder-block { background: rgba(192,139,111,0.07); border: 1px dashed var(--accent-border); border-radius: 4px; padding: 14px 18px; font-style: italic; color: var(--accent); margin: 10px 0; min-height: 50px; }
  .checkbox-list { list-style: none; padding: 0; margin: 10px 0 16px 4px; }
  .checkbox-list li { padding: 5px 0 5px 30px; position: relative; line-height: 1.5; }
  .checkbox-list li::before { content: ''; position: absolute; left: 0; top: 7px; width: 16px; height: 16px; border: 1.5px solid var(--accent); border-radius: 3px; background: var(--white); }
  .data-table { width: 100%; border-collapse: collapse; margin: 12px 0 20px 0; font-size: 10pt; page-break-inside: avoid; }
  .data-table th { background: var(--accent); color: var(--white); padding: 10px 14px; text-align: left; font-weight: 600; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.5px; }
  .data-table td { padding: 9px 14px; border-bottom: 1px solid var(--border); vertical-align: top; }
  .data-table tr:nth-child(even) td { background: rgba(192,139,111,0.04); }
  .data-table .empty { color: var(--accent); font-style: italic; font-size: 9pt; }
  .comparison-wrapper { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 12px 0 24px 0; }
  .comparison-side { border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
  .comparison-side .side-header { padding: 10px 16px; font-weight: 700; font-size: 10pt; text-align: center; color: var(--white); }
  .comparison-side.old-side .side-header { background: var(--muted); }
  .comparison-side.new-side .side-header { background: var(--accent); }
  .comparison-side table { width: 100%; border-collapse: collapse; }
  .comparison-side table th { background: var(--card-bg); padding: 7px 12px; font-size: 8.5pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; color: var(--dark); border-bottom: 1px solid var(--border); text-align: left; }
  .comparison-side table td { padding: 7px 12px; border-bottom: 1px solid var(--border); font-size: 9.5pt; }
  .new-cover-centered { max-width: 480px; margin: 12px auto 24px auto; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
  .new-cover-centered .side-header { background: var(--accent); color: var(--white); padding: 10px 16px; font-weight: 700; font-size: 10pt; text-align: center; }
  .new-cover-centered table { width: 100%; border-collapse: collapse; }
  .new-cover-centered table th { background: var(--card-bg); padding: 7px 12px; font-size: 8.5pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; color: var(--dark); border-bottom: 1px solid var(--border); text-align: left; }
  .new-cover-centered table td { padding: 7px 12px; border-bottom: 1px solid var(--border); font-size: 9.5pt; }
  .pros-cons { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 10px 0 24px 0; page-break-inside: avoid; }
  .pros-cons .col { border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
  .pros-cons .col-header { padding: 9px 16px; font-weight: 700; font-size: 9.5pt; text-transform: uppercase; letter-spacing: 0.5px; }
  .pros-cons .col.pro .col-header { background: #E8F5E9; color: #2E7D32; border-bottom: 2px solid #A5D6A7; }
  .pros-cons .col.con .col-header { background: #FFF3E0; color: #E65100; border-bottom: 2px solid #FFCC80; }
  .pros-cons .col-body { padding: 14px 16px; min-height: 60px; }
  .premium-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; margin: 16px 0 24px 0; page-break-inside: avoid; }
  .premium-row { display: grid; grid-template-columns: 1fr 1fr; }
  .premium-row.single { grid-template-columns: 1fr; }
  .premium-cell { padding: 18px 24px; border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); }
  .premium-cell:last-child { border-right: none; }
  .premium-row.single .premium-cell { text-align: center; border-right: none; }
  .premium-cell .label { font-size: 9pt; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; font-weight: 600; }
  .premium-cell .amount { font-family: var(--font-display); font-size: 16pt; font-weight: 700; color: var(--dark); }
  .premium-savings { padding: 14px 24px; text-align: center; font-weight: 700; color: #2E7D32; font-size: 11pt; background: #F1F8E9; }
  .warning-box { background: var(--warning-bg); border: 1px solid var(--warning-border); border-left: 4px solid var(--accent); border-radius: 4px; padding: 16px 20px; margin: 16px 0; page-break-inside: avoid; }
  .warning-box .warning-label { font-weight: 700; color: var(--accent); font-size: 9.5pt; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .callout-box { background: var(--accent-bg); border: 1px solid var(--accent-border); border-radius: 6px; padding: 16px 22px; margin: 16px 0; }
  .callout-box strong { color: var(--dark); }
  .sig-box { border: 1px solid var(--border); border-radius: 6px; padding: 22px 24px; margin-bottom: 16px; }
  .sig-box .sig-name { font-weight: 700; color: var(--dark); font-size: 10.5pt; margin-bottom: 24px; }
  .sig-line { border-bottom: 1px solid var(--dark); height: 1px; margin-bottom: 6px; margin-top: 32px; }
  .sig-label { font-size: 8.5pt; color: var(--muted); text-transform: uppercase; letter-spacing: 0.3px; }
  .adviser-sig { border: 1px solid var(--border); border-radius: 6px; padding: 22px 24px; margin: 16px 0; page-break-inside: avoid; }
  .provider-table { width: 100%; border-collapse: collapse; margin: 12px 0 16px 0; }
  .provider-table td { padding: 6px 0; vertical-align: top; }
  .provider-table td:first-child { width: 180px; font-weight: 700; color: var(--dark); font-size: 10pt; }
  .styled-list { list-style: none; padding: 0; margin: 8px 0 16px 0; }
  .styled-list li { padding: 4px 0 4px 22px; position: relative; line-height: 1.55; }
  .styled-list li::before { content: ''; position: absolute; left: 4px; top: 12px; width: 7px; height: 7px; background: var(--accent); border-radius: 50%; }
  .divider { border: none; border-top: 1px solid var(--border); margin: 32px 0; }
  .footer { border-top: 2px solid var(--accent); padding-top: 12px; margin-top: 40px; display: flex; justify-content: space-between; font-size: 8pt; color: var(--muted); }
  .page-break { page-break-before: always; margin-top: 0; }
  @media print {
    body { background: white; }
    .page { max-width: none; padding: 0; }
    .accent-bar { position: fixed; top: 0; left: 0; right: 0; }
    h2, h3, h4 { page-break-after: avoid; }
    .info-card, .data-table, .comparison-wrapper, .new-cover-centered, .pros-cons, .premium-card, .sig-box { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="accent-bar"></div>
<div class="page">
  <div class="header">
    <img class="logo" src="https://images.squarespace-cdn.com/content/v1/6033fe3152058c67d1e84e7f/1614286673894-ZH98E19GRUKA55E6Z17W/Smiths_wide_withouttagline_RGB_COLOUR-300dpi.jpg?format=1500w" alt="Smiths Insurance &amp; KiwiSaver">
    <span class="doc-type">Statement of Advice</span>
  </div>
  <div class="title-block">
    <h1>Smiths Insurance &amp; KiwiSaver</h1>
    <div class="subtitle">Financial Advice Provider</div>
  </div>
  <div class="doc-title-center">
    <span class="main">Statement of Advice</span><br>
    <span class="sub">Personal Risk Insurance Advisory Services</span>
  </div>
  <div class="schedule-card">
    <h3>Engagement Schedule</h3>
    <table class="schedule-table">
      <tr><td>Financial Advice Provider</td><td>Craig Smith Business Services Limited</td></tr>
      <tr><td>FAP Licence Number</td><td>FSP712931 (Class 2 — FMA)</td></tr>
      <tr><td>Trading Name</td><td>Smiths Insurance &amp; KiwiSaver</td></tr>
      <tr><td>Individual Adviser</td><td>{{ ADVISER_NAME }} ({{ ADVISER_FSP }})</td></tr>
      <tr><td>Services</td><td>Personal Risk Insurance Advisory</td></tr>
      <tr><td>Dispute Resolution Scheme</td><td>Financial Dispute Resolution Service (FDRS)</td></tr>
      <tr><td>Engagement Date</td><td><span class="placeholder">{{ ENGAGEMENT_DATE }}</span></td></tr>
    </table>
  </div>
  <p class="body-text" style="color:var(--muted); font-size:9pt; text-align:center; margin-bottom:32px;">This document sets out the terms of engagement for advisory services. Please read carefully and retain for your records.</p>
  <div class="prepared-for">
    <div class="info-pair"><span class="label">Prepared For:</span><span class="value"><span class="placeholder">{{ CLIENT_NAME }}</span></span></div>
    <div class="info-pair"><span class="label">Date:</span><span class="value"><span class="placeholder">{{ DATE }}</span></span></div>
  </div>

  <div class="section-heading"><div class="num">1</div><h2>Parties</h2></div>
  <div class="info-card"><h4>Adviser Contact Details</h4><table class="schedule-table"><tr><td>Name</td><td>{{ ADVISER_NAME }} ({{ ADVISER_FSP }})</td></tr><tr><td>Email</td><td>{{ ADVISER_EMAIL }}</td></tr><tr><td>Phone</td><td>{{ ADVISER_PHONE }}</td></tr><tr><td>Office</td><td>Level 2, 383 Colombo Street, Sydenham, Christchurch</td></tr></table></div>
  <div class="info-card"><h4>Client Details</h4><table class="schedule-table"><tr><td>Client Name(s)</td><td><span class="placeholder">{{ CLIENT_NAME }}</span></td></tr><tr><td>Email</td><td><span class="placeholder">{{ CLIENT_EMAIL }}</span></td></tr><tr><td>Phone</td><td><span class="placeholder">{{ CLIENT_PHONE }}</span></td></tr></table></div>
  <div class="info-card" style="background:var(--white); border:1px solid var(--accent-border);"><h4>Your Financial Adviser</h4><p style="margin-bottom:4px;"><strong>{{ ADVISER_NAME }}</strong> | FAP License #33042 | Level 5 Certificate in Financial Services</p><p style="margin-bottom:4px;">Trading Name: Smiths Insurance and KiwiSaver</p><p style="margin-bottom:4px;">Financial Advice Provider: Craig Smith Business Services Limited | FAP License #712931</p><p style="margin-bottom:4px;">Address: Powell Fenwick House Level 2, 383 Colombo Street, Sydenham, Christchurch</p><p>Website: www.smiths.net.nz</p></div>
  <p style="text-align:center; font-weight:700; color:var(--dark); font-size:11pt; margin:24px 0 32px 0; letter-spacing:1px; text-transform:uppercase;">Confidential</p>

  <div class="section-heading"><div class="num">2</div><h2>Scope of Advice You Are Requesting</h2></div>
  <p class="body-text"><em>"How would you like us to help you?"</em></p>
  <p class="body-text">The following are the areas of insurance advice that you are requesting.</p>
  <div class="sub-heading"><span class="placeholder">{{ CLIENT_NAME }}</span></div>
  <ul class="checkbox-list">
    <li>Untimely death (Life Insurance)</li>
    <li>Suffering a serious critical illness or injury (Trauma Insurance)</li>
    <li>Suffering a permanent disability (Total &amp; Permanent Disability Insurance)</li>
    <li>Loss of income due to sickness or injury (Income Protection Insurance)</li>
    <li>Loss of income due to redundancy (Added benefit to Income/Mortgage Protection)</li>
    <li>Requiring hospital or specialist treatment (Health Insurance)</li>
    <li>This is a limited advice engagement process</li>
  </ul>
  <div class="sub-heading" style="text-decoration:underline;">Special Instructions / Objectives / Comments</div>
  <div class="placeholder-block">{{ SPECIAL_INSTRUCTIONS }}</div>

  <div class="section-heading"><div class="num">3</div><h2>Nature and Scope of Advice Provided</h2></div>
  <p class="body-text"><em>"What we do (and don't do) for our clients"</em></p>
  <p class="body-text">Craig Smith (your Financial Adviser) in working for Craig Smith Business Services Limited (the Financial Advice Provider) provides advice to clients about their investments, life insurance, health insurance and certain general insurance such as home, car, and contents insurance.</p>
  <table class="provider-table"><tr><td>Life Insurance:</td><td>Partners Life, AIA, Asteron, Fidelity Life, Chubb and Pinnacle</td></tr><tr><td>Health Insurance:</td><td>Partners Life, AIA and NIB</td></tr><tr><td>KiwiSaver / Investment:</td><td>Booster, Milford and Generate</td></tr><tr><td>General Insurance:</td><td>AON Insurance Brokers</td></tr></table>
  <div class="callout-box"><strong>Preferred Insurer:</strong> Our preferred insurer (if appropriate for your needs) will be AIA Life due to (1) the excellent policy benefits and product ratings, (2) their reasonable premiums, (3) the modular benefits which allow you to add and delete benefits over time without having to take a "whole package" approach.</div>

  <div class="section-heading"><div class="num">4</div><h2>Out of Scope — What We Do Not Provide</h2></div>
  <p class="body-text">The following services are explicitly outside the scope of this engagement:</p>
  <ul class="styled-list"><li>KiwiSaver, managed funds, shares, or investment advice</li><li>Fire and general insurance — referred to Aon Insurance Brokers</li><li>Mortgages, lending, or budgeting services</li><li>Tax advice, legal advice, or accounting services</li><li>Estate planning, trust structuring, or business succession planning</li></ul>

  <div class="section-heading"><div class="num">5</div><h2>Information We Rely On — Client Responsibilities</h2></div>
  <p class="body-text">Our advice is based on information you provide during the Fact Find process. You have a responsibility to:</p>
  <ul class="styled-list"><li>Provide complete and accurate information</li><li>Disclose all information that could influence an insurer's decision</li><li>Inform us promptly if your circumstances change</li><li>Read and confirm key documents</li></ul>

  <div class="section-heading"><div class="num">6</div><h2>Fees, Commission, and Other Payments</h2></div>
  <p class="body-text">There is no fee charged to you for advisory services.</p>
  <p class="body-text">Smiths Insurance &amp; KiwiSaver receives commission from insurers when policies are placed.</p>

  <div class="section-heading"><div class="num">7</div><h2>Conflicts of Interest</h2></div>
  <p class="body-text">Commission-based remuneration can create conflicts of interest. We manage this by following a documented advice process, comparing products across multiple providers, and disclosing any material conflict.</p>

  <!-- ════ 8. RECOMMENDED COVERS ════ -->
  <div class="section-heading page-break"><div class="num">8</div><h2>Recommended Covers</h2></div>
  <p class="body-text"><strong>Date:</strong> <span class="placeholder">{{ SIGNOFF_DATE }}</span></p>
  <div class="sub-heading" style="text-decoration:underline;">Agreed Covers — <span class="placeholder">{{ CLIENT_NAME }}</span></div>

  {% if HAS_EXISTING_COVER %}
  <p class="body-text"><em>Summary of changes from <span class="placeholder">{{ OLD_INSURER }}</span> to <span class="placeholder">{{ NEW_INSURER }}</span></em></p>
  <div class="comparison-wrapper">
    <div class="comparison-side old-side">
      <div class="side-header">Current Cover — <span class="placeholder">{{ OLD_INSURER }}</span></div>
      <table><tr><th>Cover Type</th><th>Sum Insured</th></tr>
        <tr><td>Life</td><td class="empty">{{ OLD_LIFE }}</td></tr>
        <tr><td>Trauma</td><td class="empty">{{ OLD_TRAUMA }}</td></tr>
        <tr><td>T.P.D.</td><td class="empty">{{ OLD_TPD }}</td></tr>
        <tr><td>Income Protection</td><td class="empty">{{ OLD_IP }}</td></tr>
        <tr><td>Mortgage Protection</td><td class="empty">{{ OLD_MP }}</td></tr>
        <tr><td>Accidental Injury Cover</td><td class="empty">{{ OLD_AIC }}</td></tr>
        <tr><td>Premium Cover</td><td class="empty">{{ OLD_PREMIUM_COVER }}</td></tr>
      </table>
    </div>
    <div class="comparison-side new-side">
      <div class="side-header">Recommended Cover — <span class="placeholder">{{ NEW_INSURER }}</span></div>
      <table><tr><th>Cover Type</th><th>Sum Insured</th></tr>
        <tr><td>Life</td><td class="empty">{{ NEW_LIFE }}</td></tr>
        <tr><td>Progressive Care / Trauma</td><td class="empty">{{ NEW_TRAUMA }}</td></tr>
        <tr><td>T.P.D.</td><td class="empty">{{ NEW_TPD }}</td></tr>
        <tr><td>Income Protection</td><td class="empty">{{ NEW_IP }}</td></tr>
        <tr><td>Mortgage Protection</td><td class="empty">{{ NEW_MP }}</td></tr>
        <tr><td>Accidental Injury Cover</td><td class="empty">{{ NEW_AIC }}</td></tr>
        <tr><td>Premium Cover</td><td class="empty">{{ NEW_PREMIUM_COVER }}</td></tr>
      </table>
    </div>
  </div>
  <div class="sub-heading">Premium Summary</div>
  <div class="premium-card"><div class="premium-row"><div class="premium-cell"><div class="label">Current Premium ({{ OLD_INSURER }})</div><div class="amount">{{ OLD_PREMIUM }} <span style="font-size:9pt;color:var(--muted);">per month</span></div></div><div class="premium-cell"><div class="label">Recommended Premium ({{ NEW_INSURER }})</div><div class="amount">{{ NEW_PREMIUM }} <span style="font-size:9pt;color:var(--muted);">per month</span></div></div></div><div class="premium-savings">Monthly Savings: {{ MONTHLY_SAVINGS }} | Annual Savings: {{ ANNUAL_SAVINGS }}</div></div>
  {% else %}
  <p class="body-text"><em>Recommended new cover with <span class="placeholder">{{ NEW_INSURER }}</span></em></p>
  <div class="new-cover-centered">
    <div class="side-header">Recommended Cover — <span class="placeholder">{{ NEW_INSURER }}</span></div>
    <table><tr><th>Cover Type</th><th>Sum Insured</th></tr>
      <tr><td>Life</td><td class="empty">{{ NEW_LIFE }}</td></tr>
      <tr><td>Progressive Care / Trauma</td><td class="empty">{{ NEW_TRAUMA }}</td></tr>
      <tr><td>T.P.D.</td><td class="empty">{{ NEW_TPD }}</td></tr>
      <tr><td>Income Protection</td><td class="empty">{{ NEW_IP }}</td></tr>
      <tr><td>Mortgage Protection</td><td class="empty">{{ NEW_MP }}</td></tr>
      <tr><td>Accidental Injury Cover</td><td class="empty">{{ NEW_AIC }}</td></tr>
      <tr><td>Premium Cover</td><td class="empty">{{ NEW_PREMIUM_COVER }}</td></tr>
    </table>
  </div>
  <div class="sub-heading">Premium Summary</div>
  <div class="premium-card"><div class="premium-row single"><div class="premium-cell"><div class="label">Recommended Premium ({{ NEW_INSURER }})</div><div class="amount">{{ NEW_PREMIUM }} <span style="font-size:9pt;color:var(--muted);">per month</span></div></div></div></div>
  {% endif %}

  <!-- ════ 9. MIGRATION ANALYSIS (existing cover only) ════ -->
  {% if HAS_EXISTING_COVER %}
  <div class="section-heading"><div class="num">9</div><h2>Migration Analysis — Pros &amp; Cons</h2></div>
  {% if LIFE_INCLUDED %}<div class="sub-heading">Life Cover</div><div class="pros-cons"><div class="col pro"><div class="col-header">Pros</div><div class="col-body">{{ LIFE_PROS }}</div></div><div class="col con"><div class="col-header">Cons</div><div class="col-body">{{ LIFE_CONS }}</div></div></div>{% endif %}
  {% if TRAUMA_INCLUDED %}<div class="sub-heading">Trauma / Progressive Care</div><div class="pros-cons"><div class="col pro"><div class="col-header">Pros</div><div class="col-body">{{ TRAUMA_PROS }}</div></div><div class="col con"><div class="col-header">Cons</div><div class="col-body">{{ TRAUMA_CONS }}</div></div></div>{% endif %}
  {% if TPD_INCLUDED %}<div class="sub-heading">Total and Permanent Disability</div><div class="pros-cons"><div class="col pro"><div class="col-header">Pros</div><div class="col-body">{{ TPD_PROS }}</div></div><div class="col con"><div class="col-header">Cons</div><div class="col-body">{{ TPD_CONS }}</div></div></div>{% endif %}
  {% if INCOME_MP_INCLUDED %}<div class="sub-heading">Income &amp; Mortgage Protection</div><div class="pros-cons"><div class="col pro"><div class="col-header">Pros</div><div class="col-body">{{ INCOME_MP_PROS }}</div></div><div class="col con"><div class="col-header">Cons</div><div class="col-body">{{ INCOME_MP_CONS }}</div></div></div>{% endif %}
  {% endif %}

  <!-- ════ REASONS FOR RECOMMENDATIONS ════ -->
  <div class="section-heading page-break"><div class="num">{% if HAS_EXISTING_COVER %}10{% else %}9{% endif %}</div><h2>Reasons for Recommendations</h2></div>
  {% if LIFE_INCLUDED %}<div class="sub-heading">Life Cover</div><div class="info-card">{{ REASON_LIFE_COVER }}</div>{% endif %}
  {% if TRAUMA_INCLUDED %}<div class="sub-heading">Trauma / Critical Conditions Cover</div><div class="info-card">{{ REASON_TRAUMA }}</div>{% endif %}
  {% if TPD_INCLUDED %}<div class="sub-heading">Total and Permanent Disability Cover</div><div class="info-card">{{ REASON_TPD }}</div>{% endif %}
  {% if INCOME_MP_INCLUDED %}<div class="sub-heading">Mortgage and Income Protection Cover</div><div class="info-card">{{ REASON_INCOME_MORTGAGE }}</div>{% endif %}

  <!-- ════ ONGOING SERVICE ════ -->
  <div class="section-heading"><div class="num">{% if HAS_EXISTING_COVER %}12{% else %}11{% endif %}</div><h2>Ongoing Service</h2></div>
  <p class="body-text">Following policy placement, we will provide ongoing service at no additional fee:</p>
  <ul class="styled-list"><li>Policy queries and administration support</li><li>Claims assistance</li><li>Annual review on request</li><li>Policy amendments, updates, and renewals</li></ul>

  <!-- ════ PRIVACY ════ -->
  <div class="section-heading"><div class="num">{% if HAS_EXISTING_COVER %}13{% else %}12{% endif %}</div><h2>Privacy and Records</h2></div>
  <p class="body-text">We collect personal information to provide advice and arrange insurance. Records are retained for a minimum of seven years.</p>

  <!-- ════ DECLARATION (existing cover only) ════ -->
  {% if HAS_EXISTING_COVER %}
  <div class="section-heading page-break"><div class="num">14</div><h2>Declaration of Continued Good Health</h2></div>
  <p class="body-text">As your Financial Adviser, I want to ensure the cover applied for can operate correctly at claim time.</p>
  <ul class="checkbox-list"><li>You have not received therapy or treatment since the application</li><li>You are not currently receiving treatment not already disclosed</li><li>There have not been changes in your health since the application</li><li>I provided all the answers myself</li><li>The adviser explained any additional exclusions</li><li>The adviser explained the payment dates and premium amounts</li><li>The adviser explained the risk of non-disclosure</li><li>The adviser explained differences between old and new policy</li></ul>
  <div class="warning-box"><div class="warning-label">Important</div><p>The adviser also explained the risks of shifting insurance cover. {{ NEW_INSURER }} have underwritten the insurance risk as of today with the information you provided.</p></div>
  {% endif %}

  <!-- ════ COMPLAINTS ════ -->
  <div class="section-heading"><div class="num">{% if HAS_EXISTING_COVER %}15{% else %}13{% endif %}</div><h2>Complaints and Disputes</h2></div>
  <p class="body-text">Henry Smith: henry@smiths.net.nz | 027 344 5255<br>Craig Smith: craig@smiths.net.nz | 0274 293 939</p>
  <p class="body-text"><strong>Financial Dispute Resolution Service (FDRS)</strong><br>Website: fdrs.org.nz | Email: enquiries@fdrs.org.nz</p>

  <!-- ════ TERMINATION ════ -->
  <div class="section-heading"><div class="num">{% if HAS_EXISTING_COVER %}16{% else %}14{% endif %}</div><h2>Termination</h2></div>
  <p class="body-text">Either party may terminate this engagement by providing written notice.</p>

  <!-- ════ SIGN-OFF ════ -->
  <div class="section-heading page-break"><div class="num">{% if HAS_EXISTING_COVER %}17{% else %}15{% endif %}</div><h2>Client Acknowledgement &amp; Sign-Off</h2></div>
  <div class="info-card" style="background:var(--card-bg);"><p class="body-text">I, <strong><span class="placeholder">{{ CLIENT_NAME }}</span></strong>, have read and understand this statement of advice and wish to:</p><ul class="checkbox-list" style="margin:16px 0;"><li><strong>ACCEPT</strong> the statement of advice</li><li><strong>DECLINE</strong> the statement of advice</li><li><strong>MODIFY</strong> the statement of advice (see notes below)</li></ul></div>
  <div class="sub-heading">Modification Notes (if applicable):</div>
  <div class="placeholder-block" style="min-height:60px;">{{ MODIFICATION_NOTES }}</div>
  <div class="sig-box"><div class="sig-name"><span class="placeholder">{{ CLIENT_NAME }}</span></div><div class="sig-line"></div><div class="sig-label">Client Signature</div><div class="sig-line"></div><div class="sig-label">Date</div></div>
  <div class="adviser-sig"><p style="margin-bottom:4px;"><strong>Financial Adviser</strong></p><p style="margin-bottom:18px;"><strong>Craig Smith</strong> | FAP License #33042</p><div class="sig-line"></div><div class="sig-label">Signature &amp; Date</div></div>

  <div class="footer"><span>Craig Smith Business Services Limited | FAP License #712931</span><span>www.smiths.net.nz</span></div>
  <p style="text-align:center; font-size:7.5pt; color:var(--muted); margin-top:8px; padding-bottom:24px;">This document is confidential and intended solely for the named recipients.</p>
</div>
</body>
</html>`;

// ============================================================
// SOA PARTNER -- Merged existing-cover + new-cover via Nunjucks
// ============================================================
const SOA_PARTNER = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Statement of Advice — Smiths Insurance & KiwiSaver</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:ital,wght@0,300;0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
<style>
  :root { --accent:#C08B6F;--accent-light:#D4A88E;--accent-bg:rgba(192,139,111,0.08);--accent-border:rgba(192,139,111,0.25);--dark:#2C2C2C;--body:#444444;--muted:#888888;--card-bg:#F7F5F2;--white:#FFFFFF;--border:#E8E4DF;--warning-bg:#FFF8F0;--warning-border:#E8C9A8;--font-display:'Playfair Display',Georgia,serif;--font-body:'Source Sans 3','Segoe UI',sans-serif; }
  *{margin:0;padding:0;box-sizing:border-box;} @page{size:A4;margin:18mm 16mm 22mm 16mm;}
  body{font-family:var(--font-body);font-size:10.5pt;line-height:1.6;color:var(--body);background:var(--white);-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .accent-bar{width:100%;height:8px;background:linear-gradient(90deg,var(--accent) 0%,var(--accent-light) 100%);}
  .page{max-width:800px;margin:0 auto;padding:0 40px;}
  .header{display:flex;align-items:center;justify-content:space-between;padding:32px 0 24px 0;border-bottom:1px solid var(--border);}
  .header img.logo{height:48px;width:auto;} .header .doc-type{font-size:9pt;font-weight:600;color:var(--muted);letter-spacing:0.5px;text-transform:uppercase;}
  .title-block{text-align:center;padding:48px 0 36px 0;} .title-block h1{font-family:var(--font-display);font-size:28pt;font-weight:700;color:var(--dark);letter-spacing:-0.5px;margin-bottom:4px;} .title-block .subtitle{font-size:13pt;color:var(--muted);font-weight:300;}
  .doc-title-center{text-align:center;margin-bottom:8px;} .doc-title-center .main{font-family:var(--font-display);font-size:18pt;font-weight:600;color:var(--dark);} .doc-title-center .sub{font-size:11pt;color:var(--muted);}
  .schedule-card{background:var(--card-bg);border:1px solid var(--border);border-radius:6px;padding:28px 32px;margin-bottom:32px;} .schedule-card h3{font-family:var(--font-display);font-size:13pt;font-weight:600;color:var(--dark);margin-bottom:4px;padding-bottom:10px;border-bottom:2px solid var(--accent);display:inline-block;}
  .schedule-table{width:100%;margin-top:16px;border-collapse:collapse;} .schedule-table td{padding:7px 0;vertical-align:top;border:none;} .schedule-table td:first-child{width:200px;color:var(--muted);font-size:9.5pt;} .schedule-table td:last-child{font-weight:600;color:var(--dark);font-size:10pt;}
  .prepared-for{display:flex;gap:48px;margin-bottom:36px;} .prepared-for .info-pair{display:flex;align-items:baseline;gap:12px;} .prepared-for .label{font-weight:600;color:var(--dark);font-size:10pt;white-space:nowrap;} .prepared-for .value{color:var(--body);font-style:italic;}
  .section-heading{display:flex;align-items:center;gap:14px;margin:40px 0 18px 0;page-break-after:avoid;} .section-heading .num{width:30px;height:30px;min-width:30px;background:var(--accent);color:var(--white);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12pt;} .section-heading h2{font-family:var(--font-display);font-size:15pt;font-weight:700;color:var(--dark);text-transform:uppercase;letter-spacing:0.3px;}
  .sub-heading{font-family:var(--font-display);font-size:12.5pt;font-weight:600;color:var(--dark);margin:28px 0 12px 0;page-break-after:avoid;}
  .client-divider{text-align:center;margin:36px 0 20px 0;position:relative;} .client-divider::before{content:'';position:absolute;left:0;right:0;top:50%;border-top:2px solid var(--accent);} .client-divider span{background:var(--white);padding:0 20px;position:relative;font-family:var(--font-display);font-size:13pt;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:0.5px;}
  .body-text{margin-bottom:14px;line-height:1.65;} .body-text em{color:var(--muted);}
  .info-card{background:var(--card-bg);border:1px solid var(--border);border-radius:6px;padding:22px 28px;margin-bottom:20px;page-break-inside:avoid;} .info-card h4{font-family:var(--font-display);font-size:11pt;font-weight:600;color:var(--dark);margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid var(--accent);display:inline-block;} .info-card p{margin-bottom:8px;}
  .placeholder{background:rgba(192,139,111,0.12);border:1px dashed var(--accent-border);border-radius:3px;padding:2px 8px;font-style:italic;color:var(--accent);font-weight:600;white-space:nowrap;}
  .placeholder-block{background:rgba(192,139,111,0.07);border:1px dashed var(--accent-border);border-radius:4px;padding:14px 18px;font-style:italic;color:var(--accent);margin:10px 0;min-height:50px;}
  .checkbox-list{list-style:none;padding:0;margin:10px 0 16px 4px;} .checkbox-list li{padding:5px 0 5px 30px;position:relative;line-height:1.5;} .checkbox-list li::before{content:'';position:absolute;left:0;top:7px;width:16px;height:16px;border:1.5px solid var(--accent);border-radius:3px;background:var(--white);}
  .data-table{width:100%;border-collapse:collapse;margin:12px 0 20px 0;font-size:10pt;page-break-inside:avoid;} .data-table th{background:var(--accent);color:var(--white);padding:10px 14px;text-align:left;font-weight:600;font-size:9pt;text-transform:uppercase;letter-spacing:0.5px;} .data-table td{padding:9px 14px;border-bottom:1px solid var(--border);vertical-align:top;} .data-table .empty{color:var(--accent);font-style:italic;font-size:9pt;}
  .comparison-wrapper{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:12px 0 24px 0;} .comparison-side{border:1px solid var(--border);border-radius:6px;overflow:hidden;} .comparison-side .side-header{padding:10px 16px;font-weight:700;font-size:10pt;text-align:center;color:var(--white);} .comparison-side.old-side .side-header{background:var(--muted);} .comparison-side.new-side .side-header{background:var(--accent);} .comparison-side table{width:100%;border-collapse:collapse;} .comparison-side table th{background:var(--card-bg);padding:7px 12px;font-size:8.5pt;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;color:var(--dark);border-bottom:1px solid var(--border);text-align:left;} .comparison-side table td{padding:7px 12px;border-bottom:1px solid var(--border);font-size:9.5pt;}
  .new-cover-centered{max-width:480px;margin:12px auto 24px auto;border:1px solid var(--border);border-radius:6px;overflow:hidden;} .new-cover-centered .side-header{background:var(--accent);color:var(--white);padding:10px 16px;font-weight:700;font-size:10pt;text-align:center;} .new-cover-centered table{width:100%;border-collapse:collapse;} .new-cover-centered table th{background:var(--card-bg);padding:7px 12px;font-size:8.5pt;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;color:var(--dark);border-bottom:1px solid var(--border);text-align:left;} .new-cover-centered table td{padding:7px 12px;border-bottom:1px solid var(--border);font-size:9.5pt;}
  .pros-cons{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:10px 0 24px 0;page-break-inside:avoid;} .pros-cons .col{border:1px solid var(--border);border-radius:6px;overflow:hidden;} .pros-cons .col-header{padding:9px 16px;font-weight:700;font-size:9.5pt;text-transform:uppercase;letter-spacing:0.5px;} .pros-cons .col.pro .col-header{background:#E8F5E9;color:#2E7D32;border-bottom:2px solid #A5D6A7;} .pros-cons .col.con .col-header{background:#FFF3E0;color:#E65100;border-bottom:2px solid #FFCC80;} .pros-cons .col-body{padding:14px 16px;min-height:60px;}
  .premium-card{background:var(--card-bg);border:1px solid var(--border);border-radius:6px;overflow:hidden;margin:16px 0 24px 0;page-break-inside:avoid;} .premium-row{display:grid;grid-template-columns:1fr 1fr;} .premium-row.single{grid-template-columns:1fr;} .premium-cell{padding:18px 24px;border-right:1px solid var(--border);border-bottom:1px solid var(--border);} .premium-cell:last-child{border-right:none;} .premium-row.single .premium-cell{text-align:center;border-right:none;} .premium-cell .label{font-size:9pt;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;font-weight:600;} .premium-cell .amount{font-family:var(--font-display);font-size:16pt;font-weight:700;color:var(--dark);}
  .premium-savings{padding:14px 24px;text-align:center;font-weight:700;color:#2E7D32;font-size:11pt;background:#F1F8E9;}
  .warning-box{background:var(--warning-bg);border:1px solid var(--warning-border);border-left:4px solid var(--accent);border-radius:4px;padding:16px 20px;margin:16px 0;page-break-inside:avoid;} .warning-box .warning-label{font-weight:700;color:var(--accent);font-size:9.5pt;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;}
  .callout-box{background:var(--accent-bg);border:1px solid var(--accent-border);border-radius:6px;padding:16px 22px;margin:16px 0;} .callout-box strong{color:var(--dark);}
  .signature-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:24px 0;page-break-inside:avoid;} .sig-box{border:1px solid var(--border);border-radius:6px;padding:22px 24px;} .sig-box .sig-name{font-weight:700;color:var(--dark);font-size:10.5pt;margin-bottom:24px;} .sig-line{border-bottom:1px solid var(--dark);height:1px;margin-bottom:6px;margin-top:32px;} .sig-label{font-size:8.5pt;color:var(--muted);text-transform:uppercase;letter-spacing:0.3px;} .adviser-sig{border:1px solid var(--border);border-radius:6px;padding:22px 24px;margin:16px 0;page-break-inside:avoid;}
  .provider-table{width:100%;border-collapse:collapse;margin:12px 0 16px 0;} .provider-table td{padding:6px 0;vertical-align:top;} .provider-table td:first-child{width:180px;font-weight:700;color:var(--dark);font-size:10pt;}
  .styled-list{list-style:none;padding:0;margin:8px 0 16px 0;} .styled-list li{padding:4px 0 4px 22px;position:relative;line-height:1.55;} .styled-list li::before{content:'';position:absolute;left:4px;top:12px;width:7px;height:7px;background:var(--accent);border-radius:50%;}
  .footer{border-top:2px solid var(--accent);padding-top:12px;margin-top:40px;display:flex;justify-content:space-between;font-size:8pt;color:var(--muted);} .page-break{page-break-before:always;margin-top:0;}
  @media print { body{background:white;} .page{max-width:none;padding:0;} .accent-bar{position:fixed;top:0;left:0;right:0;} h2,h3,h4{page-break-after:avoid;} .info-card,.data-table,.comparison-wrapper,.new-cover-centered,.pros-cons,.premium-card,.sig-box{page-break-inside:avoid;} }
</style>
</head>
<body>
<div class="accent-bar"></div>
<div class="page">
  <div class="header"><img class="logo" src="https://images.squarespace-cdn.com/content/v1/6033fe3152058c67d1e84e7f/1614286673894-ZH98E19GRUKA55E6Z17W/Smiths_wide_withouttagline_RGB_COLOUR-300dpi.jpg?format=1500w" alt="Smiths"><span class="doc-type">Statement of Advice</span></div>
  <div class="title-block"><h1>Smiths Insurance &amp; KiwiSaver</h1><div class="subtitle">Financial Advice Provider</div></div>
  <div class="doc-title-center"><span class="main">Statement of Advice</span><br><span class="sub">Personal Risk Insurance Advisory Services</span></div>
  <div class="schedule-card"><h3>Engagement Schedule</h3><table class="schedule-table"><tr><td>Financial Advice Provider</td><td>Craig Smith Business Services Limited</td></tr><tr><td>FAP Licence Number</td><td>FSP712931 (Class 2 — FMA)</td></tr><tr><td>Trading Name</td><td>Smiths Insurance &amp; KiwiSaver</td></tr><tr><td>Individual Adviser</td><td>{{ ADVISER_NAME }} ({{ ADVISER_FSP }})</td></tr><tr><td>Services</td><td>Personal Risk Insurance Advisory</td></tr><tr><td>Dispute Resolution Scheme</td><td>Financial Dispute Resolution Service (FDRS)</td></tr><tr><td>Engagement Date</td><td><span class="placeholder">{{ ENGAGEMENT_DATE }}</span></td></tr></table></div>
  <div class="prepared-for"><div class="info-pair"><span class="label">Prepared For:</span><span class="value"><span class="placeholder">{{ CLIENT_A_NAME }}</span> &amp; <span class="placeholder">{{ CLIENT_B_NAME }}</span></span></div><div class="info-pair"><span class="label">Date:</span><span class="value"><span class="placeholder">{{ DATE }}</span></span></div></div>

  <div class="section-heading"><div class="num">1</div><h2>Parties</h2></div>
  <div class="info-card"><h4>Client Details</h4><table class="schedule-table"><tr><td>Client Name(s)</td><td>{{ CLIENT_A_NAME }} &amp; {{ CLIENT_B_NAME }}</td></tr><tr><td>Email</td><td>{{ CLIENT_EMAIL }}</td></tr><tr><td>Phone</td><td>{{ CLIENT_PHONE }}</td></tr></table></div>

  <div class="section-heading"><div class="num">2</div><h2>Scope of Advice You Are Requesting</h2></div>
  <div class="sub-heading">{{ CLIENT_A_NAME }}</div>
  <ul class="checkbox-list"><li>Untimely death (Life Insurance)</li><li>Suffering a serious critical illness or injury (Trauma Insurance)</li><li>Suffering a permanent disability (TPD Insurance)</li><li>Loss of income due to sickness or injury (Income Protection)</li><li>Requiring hospital or specialist treatment (Health Insurance)</li></ul>
  <div class="sub-heading">{{ CLIENT_B_NAME }}</div>
  <ul class="checkbox-list"><li>Untimely death (Life Insurance)</li><li>Suffering a serious critical illness or injury (Trauma Insurance)</li><li>Suffering a permanent disability (TPD Insurance)</li><li>Loss of income due to sickness or injury (Income Protection)</li><li>Requiring hospital or specialist treatment (Health Insurance)</li></ul>
  <div class="sub-heading" style="text-decoration:underline;">Special Instructions</div>
  <div class="placeholder-block">{{ SPECIAL_INSTRUCTIONS }}</div>

  <div class="section-heading"><div class="num">3</div><h2>Nature and Scope of Advice Provided</h2></div>
  <table class="provider-table"><tr><td>Life Insurance:</td><td>Partners Life, AIA, Asteron, Fidelity Life, Chubb and Pinnacle</td></tr><tr><td>Health Insurance:</td><td>Partners Life, AIA and NIB</td></tr><tr><td>KiwiSaver:</td><td>Booster, Milford and Generate</td></tr></table>

  <!-- ════ 8. RECOMMENDED COVERS ════ -->
  <div class="section-heading page-break"><div class="num">8</div><h2>Recommended Covers</h2></div>
  <p class="body-text"><strong>Date:</strong> {{ SIGNOFF_DATE }}</p>

  <!-- CLIENT A -->
  <div class="client-divider"><span>{{ CLIENT_A_NAME }}</span></div>
  <div class="sub-heading" style="text-decoration:underline;">Agreed Covers — {{ CLIENT_A_NAME }}</div>
  {% if HAS_EXISTING_COVER %}
  <p class="body-text"><em>Summary of changes from {{ CLIENT_A_OLD_INSURER }} to {{ CLIENT_A_NEW_INSURER }}</em></p>
  <div class="comparison-wrapper">
    <div class="comparison-side old-side"><div class="side-header">Current Cover — {{ CLIENT_A_OLD_INSURER }}</div><table><tr><th>Cover Type</th><th>Sum Insured</th></tr><tr><td>Life</td><td class="empty">{{ CLIENT_A_OLD_LIFE }}</td></tr><tr><td>Trauma</td><td class="empty">{{ CLIENT_A_OLD_TRAUMA }}</td></tr><tr><td>T.P.D.</td><td class="empty">{{ CLIENT_A_OLD_TPD }}</td></tr><tr><td>Income Protection</td><td class="empty">{{ CLIENT_A_OLD_IP }}</td></tr><tr><td>Mortgage Protection</td><td class="empty">{{ CLIENT_A_OLD_MP }}</td></tr></table></div>
    <div class="comparison-side new-side"><div class="side-header">Recommended Cover — {{ CLIENT_A_NEW_INSURER }}</div><table><tr><th>Cover Type</th><th>Sum Insured</th></tr><tr><td>Life</td><td class="empty">{{ CLIENT_A_NEW_LIFE }}</td></tr><tr><td>Progressive Care / Trauma</td><td class="empty">{{ CLIENT_A_NEW_TRAUMA }}</td></tr><tr><td>T.P.D.</td><td class="empty">{{ CLIENT_A_NEW_TPD }}</td></tr><tr><td>Income Protection</td><td class="empty">{{ CLIENT_A_NEW_IP }}</td></tr><tr><td>Mortgage Protection</td><td class="empty">{{ CLIENT_A_NEW_MP }}</td></tr></table></div>
  </div>
  {% else %}
  <p class="body-text"><em>Recommended new cover with {{ CLIENT_A_NEW_INSURER }}</em></p>
  <div class="new-cover-centered"><div class="side-header">Recommended Cover — {{ CLIENT_A_NEW_INSURER }}</div><table><tr><th>Cover Type</th><th>Sum Insured</th></tr><tr><td>Life</td><td class="empty">{{ CLIENT_A_NEW_LIFE }}</td></tr><tr><td>Progressive Care / Trauma</td><td class="empty">{{ CLIENT_A_NEW_TRAUMA }}</td></tr><tr><td>T.P.D.</td><td class="empty">{{ CLIENT_A_NEW_TPD }}</td></tr><tr><td>Income Protection</td><td class="empty">{{ CLIENT_A_NEW_IP }}</td></tr><tr><td>Mortgage Protection</td><td class="empty">{{ CLIENT_A_NEW_MP }}</td></tr></table></div>
  {% endif %}

  <!-- CLIENT B -->
  <div class="client-divider"><span>{{ CLIENT_B_NAME }}</span></div>
  <div class="sub-heading" style="text-decoration:underline;">Agreed Covers — {{ CLIENT_B_NAME }}</div>
  {% if HAS_EXISTING_COVER %}
  <p class="body-text"><em>Summary of changes from {{ CLIENT_B_OLD_INSURER }} to {{ CLIENT_B_NEW_INSURER }}</em></p>
  <div class="comparison-wrapper">
    <div class="comparison-side old-side"><div class="side-header">Current Cover — {{ CLIENT_B_OLD_INSURER }}</div><table><tr><th>Cover Type</th><th>Sum Insured</th></tr><tr><td>Life</td><td class="empty">{{ CLIENT_B_OLD_LIFE }}</td></tr><tr><td>Trauma</td><td class="empty">{{ CLIENT_B_OLD_TRAUMA }}</td></tr><tr><td>T.P.D.</td><td class="empty">{{ CLIENT_B_OLD_TPD }}</td></tr><tr><td>Income Protection</td><td class="empty">{{ CLIENT_B_OLD_IP }}</td></tr><tr><td>Mortgage Protection</td><td class="empty">{{ CLIENT_B_OLD_MP }}</td></tr></table></div>
    <div class="comparison-side new-side"><div class="side-header">Recommended Cover — {{ CLIENT_B_NEW_INSURER }}</div><table><tr><th>Cover Type</th><th>Sum Insured</th></tr><tr><td>Life</td><td class="empty">{{ CLIENT_B_NEW_LIFE }}</td></tr><tr><td>Progressive Care / Trauma</td><td class="empty">{{ CLIENT_B_NEW_TRAUMA }}</td></tr><tr><td>T.P.D.</td><td class="empty">{{ CLIENT_B_NEW_TPD }}</td></tr><tr><td>Income Protection</td><td class="empty">{{ CLIENT_B_NEW_IP }}</td></tr><tr><td>Mortgage Protection</td><td class="empty">{{ CLIENT_B_NEW_MP }}</td></tr></table></div>
  </div>
  {% else %}
  <p class="body-text"><em>Recommended new cover with {{ CLIENT_B_NEW_INSURER }}</em></p>
  <div class="new-cover-centered"><div class="side-header">Recommended Cover — {{ CLIENT_B_NEW_INSURER }}</div><table><tr><th>Cover Type</th><th>Sum Insured</th></tr><tr><td>Life</td><td class="empty">{{ CLIENT_B_NEW_LIFE }}</td></tr><tr><td>Progressive Care / Trauma</td><td class="empty">{{ CLIENT_B_NEW_TRAUMA }}</td></tr><tr><td>T.P.D.</td><td class="empty">{{ CLIENT_B_NEW_TPD }}</td></tr><tr><td>Income Protection</td><td class="empty">{{ CLIENT_B_NEW_IP }}</td></tr><tr><td>Mortgage Protection</td><td class="empty">{{ CLIENT_B_NEW_MP }}</td></tr></table></div>
  {% endif %}

  <!-- COMBINED PREMIUM -->
  <div class="sub-heading">Combined Premium Summary</div>
  {% if HAS_EXISTING_COVER %}
  <div class="premium-card"><div class="premium-row"><div class="premium-cell"><div class="label">Current Combined Premium</div><div class="amount">{{ OLD_PREMIUM }} <span style="font-size:9pt;color:var(--muted);">per month</span></div></div><div class="premium-cell"><div class="label">Recommended Combined Premium</div><div class="amount">{{ NEW_PREMIUM }} <span style="font-size:9pt;color:var(--muted);">per month</span></div></div></div><div class="premium-savings">Monthly Savings: {{ MONTHLY_SAVINGS }} | Annual Savings: {{ ANNUAL_SAVINGS }}</div></div>
  {% else %}
  <div class="premium-card"><div class="premium-row single"><div class="premium-cell"><div class="label">Recommended Combined Premium</div><div class="amount">{{ NEW_PREMIUM }} <span style="font-size:9pt;color:var(--muted);">per month</span></div></div></div></div>
  {% endif %}

  <!-- SIGN-OFF -->
  <div class="section-heading page-break"><div class="num">17</div><h2>Client Acknowledgement &amp; Sign-Off</h2></div>
  <div class="info-card" style="background:var(--card-bg);"><p class="body-text">We, <strong>{{ CLIENT_A_NAME }}</strong> and <strong>{{ CLIENT_B_NAME }}</strong>, have read and understand this statement of advice.</p></div>
  <div class="signature-grid"><div class="sig-box"><div class="sig-name">{{ CLIENT_A_NAME }}</div><div class="sig-line"></div><div class="sig-label">Client Signature</div><div class="sig-line"></div><div class="sig-label">Date</div></div><div class="sig-box"><div class="sig-name">{{ CLIENT_B_NAME }}</div><div class="sig-line"></div><div class="sig-label">Client Signature</div><div class="sig-line"></div><div class="sig-label">Date</div></div></div>
  <div class="adviser-sig"><p style="margin-bottom:4px;"><strong>Financial Adviser</strong></p><p style="margin-bottom:18px;"><strong>Craig Smith</strong> | FAP License #33042</p><div class="sig-line"></div><div class="sig-label">Signature &amp; Date</div></div>
  <div class="footer"><span>Craig Smith Business Services Limited | FAP License #712931</span><span>www.smiths.net.nz</span></div>
</div>
</body>
</html>`;

// ============================================================
// ROA DEFAULT
// ============================================================
const ROA_DEFAULT = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Record of Advice — Smiths Insurance & KiwiSaver</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;600;700&display=swap" rel="stylesheet">
<style>:root{--accent:#C08B6F;--dark:#2C2C2C;--body:#444;--muted:#888;--card-bg:#F7F5F2;--border:#E8E4DF;--font-display:'Playfair Display',Georgia,serif;--font-body:'Source Sans 3',sans-serif;}*{margin:0;padding:0;box-sizing:border-box;}@page{size:A4;margin:18mm 16mm 22mm 16mm;}body{font-family:var(--font-body);font-size:10.5pt;line-height:1.6;color:var(--body);background:#fff;-webkit-print-color-adjust:exact;}.page{max-width:800px;margin:0 auto;padding:0 40px;}.accent-bar{width:100%;height:8px;background:linear-gradient(90deg,var(--accent),#D4A88E);}.header{display:flex;justify-content:space-between;align-items:center;padding:32px 0 24px;border-bottom:1px solid var(--border);}.header img{height:48px;}.title-block{text-align:center;padding:48px 0 36px;}.title-block h1{font-family:var(--font-display);font-size:28pt;color:var(--dark);}.section-heading{display:flex;align-items:center;gap:14px;margin:40px 0 18px;}.section-heading .num{width:30px;height:30px;background:var(--accent);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12pt;}.section-heading h2{font-family:var(--font-display);font-size:15pt;color:var(--dark);text-transform:uppercase;}.body-text{margin-bottom:14px;}.info-card{background:var(--card-bg);border:1px solid var(--border);border-radius:6px;padding:22px 28px;margin-bottom:20px;}.footer{border-top:2px solid var(--accent);padding-top:12px;margin-top:40px;display:flex;justify-content:space-between;font-size:8pt;color:var(--muted);}</style>
</head><body>
<div class="accent-bar"></div>
<div class="page">
  <div class="header"><img src="https://images.squarespace-cdn.com/content/v1/6033fe3152058c67d1e84e7f/1614286673894-ZH98E19GRUKA55E6Z17W/Smiths_wide_withouttagline_RGB_COLOUR-300dpi.jpg?format=1500w" alt="Smiths"><span style="font-size:9pt;color:var(--muted);text-transform:uppercase;font-weight:600;">Record of Advice</span></div>
  <div class="title-block"><h1>Record of Advice</h1><p style="color:var(--muted);font-size:13pt;">Smiths Insurance &amp; KiwiSaver</p></div>
  <p class="body-text"><strong>Client:</strong> {{ CLIENT_A_NAME }}{% if CLIENT_B_NAME %} &amp; {{ CLIENT_B_NAME }}{% endif %}</p>
  <p class="body-text"><strong>Date:</strong> {{ DATE }}</p>
  <div class="section-heading"><div class="num">1</div><h2>Summary of Implemented Changes</h2></div>
  <div class="info-card">{{ SECTION_SUMMARY }}</div>
  {% if ROA_DEVIATIONS %}
  <div class="section-heading"><div class="num">2</div><h2>Deviations from SOA</h2></div>
  <div class="info-card">{{ ROA_DEVIATIONS }}</div>
  {% endif %}
  <div class="section-heading"><div class="num">3</div><h2>Reasons for Implementation</h2></div>
  <div class="info-card">{{ SECTION_REASONS }}</div>
  <div class="footer"><span>Craig Smith Business Services Limited | FAP License #712931</span><span>www.smiths.net.nz</span></div>
</div>
</body></html>`;

// ============================================================
// SOE DEFAULT
// ============================================================
const SOE_DEFAULT = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Scope of Engagement — Smiths Insurance & KiwiSaver</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;600;700&display=swap" rel="stylesheet">
<style>:root{--accent:#C08B6F;--dark:#2C2C2C;--body:#444;--muted:#888;--card-bg:#F7F5F2;--border:#E8E4DF;--font-display:'Playfair Display',Georgia,serif;--font-body:'Source Sans 3',sans-serif;}*{margin:0;padding:0;box-sizing:border-box;}@page{size:A4;margin:18mm 16mm 22mm 16mm;}body{font-family:var(--font-body);font-size:10.5pt;line-height:1.6;color:var(--body);background:#fff;-webkit-print-color-adjust:exact;}.page{max-width:800px;margin:0 auto;padding:0 40px;}.accent-bar{width:100%;height:8px;background:linear-gradient(90deg,var(--accent),#D4A88E);}.header{display:flex;justify-content:space-between;align-items:center;padding:32px 0 24px;border-bottom:1px solid var(--border);}.header img{height:48px;}.title-block{text-align:center;padding:48px 0 36px;}.title-block h1{font-family:var(--font-display);font-size:28pt;color:var(--dark);}.section-heading{display:flex;align-items:center;gap:14px;margin:40px 0 18px;}.section-heading .num{width:30px;height:30px;background:var(--accent);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12pt;}.section-heading h2{font-family:var(--font-display);font-size:15pt;color:var(--dark);text-transform:uppercase;}.body-text{margin-bottom:14px;}.info-card{background:var(--card-bg);border:1px solid var(--border);border-radius:6px;padding:22px 28px;margin-bottom:20px;}.footer{border-top:2px solid var(--accent);padding-top:12px;margin-top:40px;display:flex;justify-content:space-between;font-size:8pt;color:var(--muted);}</style>
</head><body>
<div class="accent-bar"></div>
<div class="page">
  <div class="header"><img src="https://images.squarespace-cdn.com/content/v1/6033fe3152058c67d1e84e7f/1614286673894-ZH98E19GRUKA55E6Z17W/Smiths_wide_withouttagline_RGB_COLOUR-300dpi.jpg?format=1500w" alt="Smiths"><span style="font-size:9pt;color:var(--muted);text-transform:uppercase;font-weight:600;">Scope of Engagement</span></div>
  <div class="title-block"><h1>Scope of Engagement</h1><p style="color:var(--muted);font-size:13pt;">Smiths Insurance &amp; KiwiSaver</p></div>
  <p class="body-text"><strong>Client:</strong> {{ CLIENT_A_NAME }}{% if CLIENT_B_NAME %} &amp; {{ CLIENT_B_NAME }}{% endif %}</p>
  <p class="body-text"><strong>Date:</strong> {{ DATE }}</p>
  <div class="section-heading"><div class="num">1</div><h2>Scope of Services</h2></div>
  <div class="info-card">{{ SECTION_SCOPE }}</div>
  <div class="section-heading"><div class="num">2</div><h2>Out of Scope</h2></div>
  <div class="info-card">{{ SECTION_OUT_OF_SCOPE }}</div>
  <div class="section-heading"><div class="num">3</div><h2>Client Responsibilities</h2></div>
  <div class="info-card">{{ SECTION_RESPONSIBILITIES }}</div>
  <div class="footer"><span>Craig Smith Business Services Limited | FAP License #712931</span><span>www.smiths.net.nz</span></div>
</div>
</body></html>`;
