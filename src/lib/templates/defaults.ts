import { DocType, ClientType } from "@prisma/client";

export function getDefaultTemplate(
  docType: DocType,
  clientType: ClientType | null,
  hasCover?: boolean | null
): { html: string; css: string } {
  if (docType === DocType.SOA) {
    return { html: buildTemplate("SOA"), css: "" };
  }
  if (docType === DocType.ROA) {
    return { html: buildTemplate("ROA"), css: "" };
  }
  if (docType === DocType.KIWISAVER) {
    return { html: buildKiwisaverTemplate(), css: "" };
  }
  return { html: SOE_DEFAULT, css: "" };
}

// ══════════════════════════════════════════════════════════════
// SHARED CSS — Bronze / Satoshi / Instrument Serif design system
// ══════════════════════════════════════════════════════════════
const SHARED_CSS = `
@font-face{font-family:'Satoshi';src:url('/fonts/Satoshi-Regular.woff2') format('woff2');font-weight:400;font-style:normal;font-display:block;}
@font-face{font-family:'Satoshi';src:url('/fonts/Satoshi-Medium.woff2') format('woff2');font-weight:500;font-style:normal;font-display:block;}
@font-face{font-family:'Satoshi';src:url('/fonts/Satoshi-Bold.woff2') format('woff2');font-weight:700;font-style:normal;font-display:block;}
@font-face{font-family:'Satoshi';src:url('/fonts/Satoshi-Italic.woff2') format('woff2');font-weight:400;font-style:italic;font-display:block;}
@font-face{font-family:'Instrument Serif';src:url('/fonts/instrument-serif-latin-400-normal.woff2') format('woff2');font-weight:400;font-style:normal;font-display:block;}
:root {
  --bronze:#B07D56;--bronze-muted:#C49A78;--bronze-wash:rgba(184,132,95,0.06);--bronze-border:rgba(184,132,95,0.22);
  --navy:#1B2A4A;--navy-soft:rgba(27,42,74,0.07);
  --black:#1A1A1A;--dark:#2C2C2C;--body:#3D3D3D;--muted:#7A7A7A;--subtle:#A0A0A0;
  --rule:#E0E0E0;--rule-lt:#EEEEEE;--white:#FFFFFF;
  --pro-bg:#F4FAF4;--pro-bdr:#C8E6C8;--con-bg:#FFF5F5;--con-bdr:#E8C8C8;
  --warn-bg:#FFF9F0;--warn-bdr:#E8CFA8;
  --font-display:'Instrument Serif',Georgia,'Times New Roman',serif;
  --font-body:'Satoshi',-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif;
  --section-gap:52px;
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
@page{size:A4;margin:20mm 18mm 24mm 18mm;}
body{font-family:var(--font-body);font-size:10.5pt;line-height:1.62;color:var(--body);background:var(--white);-webkit-print-color-adjust:exact;print-color-adjust:exact;font-feature-settings:'kern' 1,'liga' 1;-webkit-font-smoothing:antialiased;}
body.production .placeholder{border:none;background:none;color:#1A1A1A;font-style:normal;font-weight:600;padding:0;}
body.production .placeholder-block{border:none;background:none;color:#3A3A3A;font-style:italic;padding:0;min-height:0;}
.page{max-width:820px;margin:0 auto;padding:0 44px;}
.accent-bar{width:100%;height:3px;background:var(--bronze);}
.header{display:flex;align-items:center;justify-content:space-between;padding:28px 0 20px 0;border-bottom:1px solid var(--rule);}
.header img.logo{height:44px;width:auto;}
.header .doc-label{font-family:var(--font-body);font-size:8.5pt;font-weight:600;color:var(--muted);letter-spacing:1.2px;text-transform:uppercase;}
.cover-hero{width:calc(100% + 88px);height:400px;background-image:url('/images/image1.jpg');background-size:cover;background-position:center 35%;background-repeat:no-repeat;position:relative;margin:0 -44px;}
.cover-logo-overlay{position:absolute;bottom:-28px;left:50%;transform:translateX(-50%);z-index:10;background:var(--white);padding:10px 18px;box-shadow:0 2px 12px rgba(0,0,0,0.06);}
.cover-logo-overlay img{height:80px;width:auto;display:block;}
.cover-page{display:flex;flex-direction:column;align-items:center;text-align:center;padding:72px 0 0 0;position:relative;}
.cover-page h1{font-family:var(--font-display);font-size:34pt;font-weight:700;color:var(--black);letter-spacing:-0.5px;line-height:1.1;margin-bottom:10px;}
.cover-page .cover-type{font-family:var(--font-body);font-size:8.5pt;font-weight:500;color:var(--muted);letter-spacing:2.5px;text-transform:uppercase;margin-bottom:0;}
.cover-rule{width:40px;height:1.5px;background:var(--bronze);margin:32px auto 0 auto;}
.cover-meta{margin-top:32px;text-align:center;}
.cover-meta .cm-label{display:block;font-family:var(--font-body);font-size:8pt;font-weight:500;color:var(--muted);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;}
.cover-meta .cm-value{display:block;font-family:var(--font-display);font-size:13pt;font-weight:400;color:var(--black);margin-bottom:22px;}
.cover-adviser-block{margin-top:auto;padding-top:40px;text-align:center;width:100%;}
.cover-adviser-block p{font-family:var(--font-body);font-size:8pt;line-height:1.7;color:var(--muted);margin:0;}
.cover-adviser-block p strong{color:var(--dark);font-size:8.5pt;}
.section-heading{display:flex;align-items:center;gap:14px;margin:var(--section-gap) 0 16px 0;page-break-after:avoid;}
.section-heading .num{width:28px;height:28px;min-width:28px;background:var(--bronze);color:var(--white);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11pt;font-family:var(--font-body);}
.section-heading h2{font-family:var(--font-display);font-size:15pt;font-weight:700;color:var(--black);letter-spacing:-0.2px;}
.sub-heading{font-family:var(--font-display);font-size:12pt;font-weight:600;color:var(--dark);margin:26px 0 10px 0;page-break-after:avoid;}
.client-divider{text-align:center;margin:34px 0 18px 0;position:relative;}
.client-divider::before{content:'';position:absolute;left:0;right:0;top:50%;border-top:1.5px solid var(--rule);}
.client-divider span{background:var(--white);padding:0 18px;position:relative;font-family:var(--font-display);font-size:12pt;font-weight:700;color:var(--bronze);text-transform:uppercase;letter-spacing:0.5px;}
.body-text{margin-bottom:12px;line-height:1.65;}
.body-text em{color:var(--muted);}
.info-card{background:var(--white);border:1px solid var(--rule);padding:20px 26px;margin-bottom:18px;page-break-inside:avoid;}
.info-card h4{font-family:var(--font-display);font-size:10.5pt;font-weight:600;color:var(--dark);margin-bottom:10px;padding-bottom:7px;border-bottom:2px solid var(--bronze);display:inline-block;}
.info-card p{margin-bottom:6px;}
.schedule-card{background:var(--white);border:1px solid var(--rule);padding:24px 28px;margin-bottom:28px;}
.schedule-card h3{font-family:var(--font-display);font-size:12pt;font-weight:600;color:var(--dark);margin-bottom:4px;padding-bottom:8px;border-bottom:2px solid var(--bronze);display:inline-block;}
.schedule-table{width:100%;margin-top:14px;border-collapse:collapse;}
.schedule-table td{padding:6px 0;vertical-align:top;border:none;}
.schedule-table td:first-child{width:200px;color:var(--muted);font-size:9pt;font-weight:500;}
.schedule-table td:last-child{font-weight:600;color:var(--dark);font-size:9.5pt;}
.placeholder{background:rgba(184,132,95,0.10);border:1px dashed var(--bronze-border);padding:1px 7px;font-style:italic;color:var(--bronze);font-weight:600;white-space:nowrap;}
.placeholder-block{background:rgba(184,132,95,0.05);border:1px dashed var(--bronze-border);padding:14px 18px;font-style:italic;color:var(--bronze);margin:8px 0;min-height:48px;line-height:1.55;}
.checkbox-group{padding:0;margin:8px 0 14px 4px;}
.checkbox-item{padding:4px 0;display:flex;align-items:flex-start;gap:10px;line-height:1.5;font-size:10pt;}
.checkbox-box{display:inline-block;flex-shrink:0;width:14px;height:14px;border:1.5px solid var(--bronze);background:var(--white);position:relative;margin-top:3px;}
.checkbox-item.checked .checkbox-box::after{content:'';position:absolute;left:3px;top:0px;width:5px;height:9px;border-right:2px solid var(--bronze);border-bottom:2px solid var(--bronze);transform:rotate(45deg);}
.checkbox-label{flex:1;}
.data-table{width:100%;border-collapse:collapse;margin:10px 0 18px 0;font-size:9.5pt;page-break-inside:avoid;}
.data-table th{background:var(--navy);color:var(--white);padding:9px 14px;text-align:left;font-weight:600;font-size:8.5pt;text-transform:uppercase;letter-spacing:0.6px;}
.data-table td{padding:8px 14px;border-bottom:1px solid var(--rule);vertical-align:top;}
.data-table .na{color:var(--subtle);font-style:italic;font-size:9pt;}
.dual-cover-wrapper{margin:12px 0 22px 0;border:1px solid var(--rule);overflow:hidden;page-break-inside:avoid;}
.dual-cover-wrapper table{width:100%;border-collapse:collapse;}
.dual-cover-wrapper th{padding:8px 12px;font-size:8pt;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--rule);text-align:left;}
.dual-cover-wrapper .header-proposed{background:var(--bronze);color:var(--white);vertical-align:middle;}
.dual-cover-wrapper .header-existing{background:var(--navy);color:var(--white);vertical-align:middle;}
.insurer-logo{height:22px;width:auto;display:inline-block;vertical-align:middle;margin-right:6px;}
.header-proposed .insurer-logo,.header-existing .insurer-logo{filter:brightness(0) invert(1);}
.single-cover-wrapper .insurer-logo{height:20px;filter:brightness(0) invert(1);margin-right:6px;vertical-align:middle;}
.dual-cover-wrapper td{padding:7px 12px;border-bottom:1px solid var(--rule);font-size:9.5pt;}
.dual-cover-wrapper .spacer-col{width:20px;background:var(--white);border-bottom:1px solid var(--rule);}
.single-cover-wrapper{max-width:420px;margin:12px auto 22px auto;border:1px solid var(--rule);overflow:hidden;page-break-inside:avoid;}
.single-cover-wrapper .side-header{background:var(--bronze);color:var(--white);padding:9px 16px;font-weight:700;font-size:9.5pt;text-align:center;letter-spacing:0.3px;}
.single-cover-wrapper table{width:100%;border-collapse:collapse;}
.single-cover-wrapper th{background:var(--white);padding:7px 14px;font-size:8pt;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;color:var(--dark);border-bottom:1px solid var(--rule);text-align:left;}
.single-cover-wrapper td{padding:7px 14px;border-bottom:1px solid var(--rule);font-size:9.5pt;}
.premium-card{background:var(--white);border:1px solid var(--rule);overflow:hidden;margin:14px 0 22px 0;page-break-inside:avoid;}
.premium-grid{display:flex;}
.premium-grid.single-row{justify-content:center;}
.premium-cell{flex:1;padding:18px 22px;text-align:center;border-right:1px solid var(--rule);}
.premium-cell:last-child{border-right:none;}
.premium-cell .p-label{font-size:8.5pt;color:var(--muted);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:5px;font-weight:600;}
.premium-cell .p-amount{font-family:var(--font-display);font-size:22pt;font-weight:400;color:var(--black);letter-spacing:-0.5px;}
.premium-cell .p-freq{font-size:8.5pt;color:var(--muted);font-weight:400;}
.premium-analysis-bar{background:var(--navy);color:var(--white);padding:10px 18px;font-size:9pt;font-weight:600;display:flex;justify-content:center;gap:24px;letter-spacing:0.3px;}
.premium-analysis-bar span{font-style:italic;font-weight:400;}
.pros-cons-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:10px 0 22px 0;page-break-inside:avoid;}
.pro-card,.con-card{padding:16px 18px;font-size:9.5pt;line-height:1.55;}
.pro-card{background:var(--pro-bg);border:1px solid var(--pro-bdr);}
.con-card{background:var(--con-bg);border:1px solid var(--con-bdr);}
.pro-card .pc-title,.con-card .pc-title{font-weight:700;font-size:9pt;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;}
.pro-card .pc-title{color:#2E7D32;}
.con-card .pc-title{color:#C62828;}
.callout-box{background:var(--bronze-wash);border:1px solid var(--bronze-border);border-left:3px solid var(--bronze);padding:14px 20px;margin:14px 0;font-size:10pt;line-height:1.55;}
.callout-box strong{color:var(--dark);}
.warning-box{background:var(--warn-bg);border:1px solid var(--warn-bdr);border-left:3px solid #E6A352;padding:14px 20px;margin:14px 0;font-size:9.5pt;line-height:1.55;}
.provider-table{width:100%;border-collapse:collapse;margin:10px 0 14px 0;}
.provider-table td{padding:5px 0;vertical-align:top;}
.provider-table td:first-child{width:180px;font-weight:700;color:var(--bronze);font-size:9.5pt;}
.provider-table td:last-child{font-size:10pt;}
.styled-list{list-style:none;padding:0;margin:6px 0 14px 0;}
.styled-list li{padding:3px 0 3px 20px;position:relative;line-height:1.55;}
.styled-list li::before{content:'';position:absolute;left:3px;top:11px;width:6px;height:6px;background:var(--bronze);border-radius:50%;}
.signature-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:22px 0;page-break-inside:avoid;}
.signature-grid.single{grid-template-columns:1fr;max-width:400px;}
.sig-box{border:1px solid var(--rule);padding:20px 22px;}
.sig-box .sig-name{font-weight:700;color:var(--dark);font-size:10.5pt;margin-bottom:20px;}
.sig-line{border-bottom:1px solid var(--dark);height:1px;margin-bottom:5px;margin-top:28px;}
.sig-label{font-size:8pt;color:var(--muted);text-transform:uppercase;letter-spacing:0.4px;}
.adviser-sig{border:1px solid var(--rule);padding:20px 22px;margin:14px 0;page-break-inside:avoid;}
.footer{border-top:1.5px solid var(--bronze);padding-top:10px;margin-top:36px;display:flex;justify-content:space-between;font-size:7.5pt;color:var(--muted);}
.footer a{color:var(--bronze);text-decoration:none;}
.page-break{page-break-before:always;margin-top:0;}
.section-block{page-break-inside:avoid;}
.section-block-break{page-break-before:always;}
.section-page-2{page-break-before:always;page-break-after:always;}
.section-heading{page-break-after:avoid;}
@media print{body{background:white;}.page{max-width:none;padding:0;}.cover-hero{margin:0;width:100%;height:400px;}.cover-page{page-break-after:always;}h2,h3,h4{page-break-after:avoid;}.section-heading{page-break-after:avoid;}.info-card,.data-table,.dual-cover-wrapper,.single-cover-wrapper,.premium-card,.sig-box,.pros-cons-grid{page-break-inside:avoid;}.section-block-break{page-break-before:always;}.section-page-2{page-break-before:always;page-break-after:always;}.placeholder{border:none;background:transparent;color:var(--dark);font-style:normal;font-weight:600;padding:0;}.placeholder-block{border:none;background:transparent;color:var(--body);font-style:normal;padding:14px 0;min-height:0;}}
`;

const LOGO_URL = "https://images.squarespace-cdn.com/content/v1/6033fe3152058c67d1e84e7f/1614286673894-ZH98E19GRUKA55E6Z17W/Smiths_wide_withouttagline_RGB_COLOUR-300dpi.jpg?format=1500w";

function buildTemplate(docType: "SOA" | "ROA"): string {
  const title = docType === "SOA" ? "Statement of Advice" : "Record of Advice";
  const titleShort = docType === "SOA" ? "Statement of Advice" : "Record of Advice";
  const reasonsHeadingExisting = docType === "SOA" ? "Reasons for Recommendations" : "Reasons for Modifications";
  const reasonsHeadingNew = "Reasons for Recommendations";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — Smiths Insurance &amp; KiwiSaver</title>
<!-- Fonts embedded locally via @font-face in CSS -->
<style>${SHARED_CSS}</style>
</head>
<body>

<div class="page">

<!-- ═══ COVER PAGE ═══ -->
<div class="cover-hero">
  <div class="cover-logo-overlay">
    <img src="/images/coverlogo.jpg" alt="Smiths Insurance &amp; KiwiSaver">
  </div>
</div>

<div class="cover-page">

  <h1>${title}</h1>
  {% if HAS_EXISTING_COVER %}
  <div class="cover-type">Insurance Review</div>
  {% else %}
  <div class="cover-type">Personal Risk Advisory</div>
  {% endif %}

  <div class="cover-rule"></div>

  <div class="cover-meta">
    <span class="cm-label">Prepared for</span>
    {% if IS_PARTNER %}
    <span class="cm-value">{{ CLIENT_A_NAME }} &amp; {{ CLIENT_B_NAME }}</span>
    {% else %}
    <span class="cm-value">{{ CLIENT_A_NAME }}</span>
    {% endif %}
    <span class="cm-label">Date</span>
    <span class="cm-value">{{ DATE }}</span>
  </div>

  <div class="cover-adviser-block">
    <p><strong>{{ ADVISER_NAME }}</strong></p>
    <p>Financial Adviser | FSP #33042</p>
    <p>Craig Smith Business Services Limited</p>
    <p>FAP Licence #712931</p>
  </div>

</div>

<!-- ═══ SECTION 1 — SCOPE + SPECIAL INSTRUCTIONS (Page 2) ═══ -->
<div class="section-page-2">
<div class="header">
  <img class="logo" src="${LOGO_URL}" alt="Smiths"><span class="doc-label">${titleShort}</span>
</div>

<div class="section-heading"><div class="num">1</div><h2>Scope of Advice You Are Requesting</h2></div>
<p class="body-text"><em>"How would you like us to help you?"</em></p>
<p class="body-text">The following are the areas of insurance advice that you are requesting. Unless noted below, discussions and advice will be limited to assisting you and your family's financial security in the event of:</p>

<div class="sub-heading"><span class="placeholder">{{ CLIENT_A_NAME }}</span></div>
<div class="checkbox-group">
  <div class="checkbox-item{% if LIFE_INCLUDED %} checked{% endif %}"><span class="checkbox-box"></span><span class="checkbox-label">Untimely death (Life Insurance)</span></div>
  <div class="checkbox-item{% if TRAUMA_INCLUDED %} checked{% endif %}"><span class="checkbox-box"></span><span class="checkbox-label">Suffering a serious critical illness or injury (Trauma Insurance)</span></div>
  <div class="checkbox-item{% if TPD_INCLUDED %} checked{% endif %}"><span class="checkbox-box"></span><span class="checkbox-label">Suffering a permanent disability (Total &amp; Permanent Disability Insurance)</span></div>
  <div class="checkbox-item{% if IP_INCLUDED or MP_INCLUDED or INCOME_MP_INCLUDED %} checked{% endif %}"><span class="checkbox-box"></span><span class="checkbox-label">Loss of income due to sickness or injury (Income Protection Insurance)</span></div>
  <div class="checkbox-item{% if MP_INCLUDED or INCOME_MP_INCLUDED %} checked{% endif %}"><span class="checkbox-box"></span><span class="checkbox-label">Loss of income due to redundancy (Added benefit to Income/Mortgage Protection)</span></div>
  <div class="checkbox-item{% if HEALTH_INCLUDED %} checked{% endif %}"><span class="checkbox-box"></span><span class="checkbox-label">Requiring hospital or specialist treatment (Health Insurance)</span></div>
  <div class="checkbox-item"><span class="checkbox-box"></span><span class="checkbox-label">This is a limited advice engagement process</span></div>
</div>

{% if IS_PARTNER %}
<div class="sub-heading"><span class="placeholder">{{ CLIENT_B_NAME }}</span></div>
<div class="checkbox-group">
  <div class="checkbox-item{% if LIFE_INCLUDED %} checked{% endif %}"><span class="checkbox-box"></span><span class="checkbox-label">Untimely death (Life Insurance)</span></div>
  <div class="checkbox-item{% if TRAUMA_INCLUDED %} checked{% endif %}"><span class="checkbox-box"></span><span class="checkbox-label">Suffering a serious critical illness or injury (Trauma Insurance)</span></div>
  <div class="checkbox-item{% if TPD_INCLUDED %} checked{% endif %}"><span class="checkbox-box"></span><span class="checkbox-label">Suffering a permanent disability (Total &amp; Permanent Disability Insurance)</span></div>
  <div class="checkbox-item{% if IP_INCLUDED or MP_INCLUDED or INCOME_MP_INCLUDED %} checked{% endif %}"><span class="checkbox-box"></span><span class="checkbox-label">Loss of income due to sickness or injury (Income Protection Insurance)</span></div>
  <div class="checkbox-item{% if MP_INCLUDED or INCOME_MP_INCLUDED %} checked{% endif %}"><span class="checkbox-box"></span><span class="checkbox-label">Loss of income due to redundancy (Added benefit to Income/Mortgage Protection)</span></div>
  <div class="checkbox-item{% if HEALTH_INCLUDED %} checked{% endif %}"><span class="checkbox-box"></span><span class="checkbox-label">Requiring hospital or specialist treatment (Health Insurance)</span></div>
  <div class="checkbox-item"><span class="checkbox-box"></span><span class="checkbox-label">This is a limited advice engagement process</span></div>
</div>
{% endif %}

<div class="sub-heading" style="border-bottom:1.5px solid var(--bronze); padding-bottom:4px;">Special Instructions / Objectives / Comments</div>
<div class="placeholder-block">{{ SPECIAL_INSTRUCTIONS }}</div>
</div><!-- /section-page-2 -->

<!-- ═══ SECTION 2 — NATURE AND SCOPE (forced new page) ═══ -->
<div class="section-block section-block-break">
<div class="header">
  <img class="logo" src="${LOGO_URL}" alt="Smiths"><span class="doc-label">${titleShort}</span>
</div>

<div class="section-heading"><div class="num">2</div><h2>Nature and Scope of Advice Provided</h2></div>
<p class="body-text"><em>"What we do (and don't do) for our clients"</em></p>
<p class="body-text">Craig Smith (your Financial Adviser) in working for Craig Smith Business Services Limited (the Financial Advice Provider) provides advice to clients about their investments, life insurance, health insurance and certain general insurance such as home, car, and contents insurance.</p>
<p class="body-text">Craig Smith provides financial advice in relation to KiwiSaver, managed funds, life insurance, health insurance, home, car and contents insurance. He only provides financial advice about products from certain providers:</p>

<table class="provider-table">
  <tr><td>Life Insurance:</td><td>Partners Life, AIA, Asteron, Fidelity Life, Chubb and Pinnacle</td></tr>
  <tr><td>Health Insurance:</td><td>Partners Life, AIA and NIB</td></tr>
  <tr><td>KiwiSaver / Investment:</td><td>Booster, Milford and Generate</td></tr>
  <tr><td>General Insurance:</td><td>AON Insurance Brokers</td></tr>
</table>

<div class="callout-box"><strong>Preferred Insurer:</strong> Our preferred insurer (if appropriate for your needs) will be AIA Life due to (1) the excellent policy benefits and product ratings, (2) their reasonable premiums, (3) the modular benefits which allow you to add and delete benefits over time without having to take a "whole package" approach.</div>

<p class="body-text">In providing you with financial advice, we will only consider existing term life, trauma, income protection and health insurance policies available through the above-mentioned insurers.</p>
<p class="body-text">We will not provide advice on existing whole of life or endowment products. Our advice is limited to New Zealand based financial insurance products only.</p>
</div><!-- /section-block-break: Section 2 -->

<!-- ═══ SECTION 3 — OUT OF SCOPE ═══ -->
<div class="section-heading"><div class="num">3</div><h2>Out of Scope - What We Do Not Provide</h2></div>
<p class="body-text">The following services are explicitly outside the scope of this engagement:</p>
<ul class="styled-list">
  <li>Fire and general insurance (home, contents, vehicle) - referred to Aon Insurance Brokers</li>
  <li>Mortgages, lending, or budgeting services</li>
  <li>Tax advice, legal advice, or accounting services</li>
  <li>Estate planning, trust structuring, or business succession planning</li>
</ul>
<p class="body-text">If you require advice in these areas, we recommend seeking specialist assistance. Referrals may be provided on request.</p>

<!-- ═══ SECTION 4 — CLIENT RESPONSIBILITIES ═══ -->
<div class="section-heading"><div class="num">4</div><h2>Information We Rely On - Client Responsibilities</h2></div>
<p class="body-text">Our advice is based on information you provide during the Fact Find process. You have a responsibility to:</p>
<ul class="styled-list">
  <li>Provide complete and accurate information about your circumstances, health, income, and financial position</li>
  <li>Disclose all information that could influence an insurer's decision - this is your Duty of Disclosure under the Insurance Contracts Act</li>
  <li>Inform us promptly if your circumstances change (e.g., health, occupation, income, smoking status)</li>
  <li>Read and confirm key documents including policy wordings, quotes, application forms, and disclosures</li>
</ul>

<!-- ═══ SECTION 5 — FEES ═══ -->
<div class="section-heading"><div class="num">5</div><h2>Fees, Commission, and Other Payments</h2></div>
<p class="body-text">There is no fee charged to you for advisory services.</p>
<p class="body-text">Smiths Insurance &amp; KiwiSaver receives commission from insurers when policies are placed. Commission typically includes an upfront payment (based on first-year premium) and ongoing trail commission (based on renewal premiums). Commission varies by provider and product - details are in the Disclosure Statement.</p>

<!-- ═══ SECTION 6 — CONFLICTS ═══ -->
<div class="section-heading"><div class="num">6</div><h2>Conflicts of Interest</h2></div>
<p class="body-text">Commission-based remuneration can create conflicts of interest. We manage this by:</p>
<ul class="styled-list">
  <li>Following a documented advice process that ensures recommendations are based on your needs and circumstances</li>
  <li>Comparing products across multiple providers before making recommendations</li>
  <li>Completing annual training on identifying and managing conflicts of interest</li>
  <li>Maintaining a conflicts register and gift register</li>
  <li>Disclosing any material conflict that could reasonably be seen as influencing advice</li>
</ul>

<!-- ═══ SECTION 7 — SIGN-OFF / AGREED COVERS ═══ -->
<div class="header page-break">
  <img class="logo" src="${LOGO_URL}" alt="Smiths"><span class="doc-label">${titleShort}</span>
</div>

<div class="section-heading"><div class="num">7</div><h2>Sign-Off Document</h2></div>
<p class="body-text"><strong>Date:</strong> <span class="placeholder">{{ SIGNOFF_DATE }}</span></p>

<!-- CLIENT A BREAKDOWN -->
<div class="section-block">
  <div class="client-divider"><span>{{ CLIENT_A_NAME }}</span></div>
  <div class="sub-heading">Agreed Covers - <span class="placeholder">{{ CLIENT_A_NAME }}</span></div>

  {% if HAS_EXISTING_COVER %}
  <p class="body-text"><em>{{ CLIENT_A_ADVICE_TYPE_LABEL }}</em></p>
  <div class="dual-cover-wrapper">
    <table>
      <thead>
        <tr><th class="header-proposed" colspan="2">{% for logo in CLIENT_A_NEW_INSURER_LOGOS %}<img class="insurer-logo" src="{{ logo.src }}" alt="{{ logo.alt }}"> {% endfor %}Proposed Cover</th><th class="spacer-col"></th><th class="header-existing" colspan="2">{% for logo in CLIENT_A_EXISTING_INSURER_LOGOS %}<img class="insurer-logo" src="{{ logo.src }}" alt="{{ logo.alt }}"> {% endfor %}Existing Cover</th></tr>
        <tr><th style="background:var(--white);color:var(--dark);">Cover Type</th><th style="background:var(--white);color:var(--dark);text-align:right;">Sum Insured</th><th class="spacer-col"></th><th style="background:var(--white);color:var(--dark);">Cover Type</th><th style="background:var(--white);color:var(--dark);text-align:right;">Sum Insured</th></tr>
      </thead>
      <tbody>
        <tr><td>Life</td><td style="text-align:right;">{{ CLIENT_A_NEW_LIFE }}</td><td class="spacer-col"></td><td>Life</td><td style="text-align:right;">{{ CLIENT_A_OLD_LIFE }}</td></tr>
        <tr><td>Progressive Care / Trauma</td><td style="text-align:right;">{{ CLIENT_A_NEW_TRAUMA }}</td><td class="spacer-col"></td><td>Trauma</td><td style="text-align:right;">{{ CLIENT_A_OLD_TRAUMA }}</td></tr>
        <tr><td>T.P.D.</td><td style="text-align:right;">{{ CLIENT_A_NEW_TPD }}</td><td class="spacer-col"></td><td>T.P.D.</td><td style="text-align:right;">{{ CLIENT_A_OLD_TPD }}</td></tr>
        <tr><td>Income Protection</td><td style="text-align:right;">{{ CLIENT_A_NEW_IP }}</td><td class="spacer-col"></td><td>Income Protection</td><td style="text-align:right;">{{ CLIENT_A_OLD_IP }}</td></tr>
        <tr><td>Health Insurance</td><td style="text-align:right;">{{ CLIENT_A_NEW_HEALTH }}</td><td class="spacer-col"></td><td>Health Insurance</td><td style="text-align:right;">{{ CLIENT_A_OLD_HEALTH }}</td></tr>
        <tr><td>Mortgage Protection</td><td style="text-align:right;">{{ CLIENT_A_NEW_MP }}</td><td class="spacer-col"></td><td>Mortgage Protection</td><td style="text-align:right;">{{ CLIENT_A_OLD_MP }}</td></tr>
        <tr><td>Accidental Injury</td><td style="text-align:right;">{{ CLIENT_A_NEW_AIC }}</td><td class="spacer-col"></td><td>Accidental Injury</td><td style="text-align:right;">{{ CLIENT_A_OLD_AIC }}</td></tr>
        <tr><td>Premium Cover</td><td style="text-align:right;">{{ CLIENT_A_NEW_PREMIUM_COVER }}</td><td class="spacer-col"></td><td>Premium Cover</td><td style="text-align:right;">{{ CLIENT_A_OLD_PREMIUM_COVER }}</td></tr>
      </tbody>
    </table>
  </div>
  {% else %}
  <p class="body-text"><em>Recommended new cover</em></p>
  <div class="single-cover-wrapper">
    <div class="side-header">{% for logo in CLIENT_A_NEW_INSURER_LOGOS %}<img class="insurer-logo" src="{{ logo.src }}" alt="{{ logo.alt }}"> {% endfor %}Recommended Cover</div>
    <table>
      <tr><th>Cover Type</th><th style="text-align:right;">Sum Insured</th></tr>
      <tr><td>Life</td><td style="text-align:right;">{{ CLIENT_A_NEW_LIFE }}</td></tr>
      <tr><td>Progressive Care / Trauma</td><td style="text-align:right;">{{ CLIENT_A_NEW_TRAUMA }}</td></tr>
      <tr><td>T.P.D.</td><td style="text-align:right;">{{ CLIENT_A_NEW_TPD }}</td></tr>
      <tr><td>Income Protection</td><td style="text-align:right;">{{ CLIENT_A_NEW_IP }}</td></tr>
      <tr><td>Health Insurance</td><td style="text-align:right;">{{ CLIENT_A_NEW_HEALTH }}</td></tr>
      <tr><td>Mortgage Protection</td><td style="text-align:right;">{{ CLIENT_A_NEW_MP }}</td></tr>
      <tr><td>Accidental Injury</td><td style="text-align:right;">{{ CLIENT_A_NEW_AIC }}</td></tr>
      <tr><td>Premium Cover</td><td style="text-align:right;">{{ CLIENT_A_NEW_PREMIUM_COVER }}</td></tr>
    </table>
  </div>
  {% endif %}
</div>

{% if IS_PARTNER %}
<!-- CLIENT B BREAKDOWN — forced new page -->
<div class="section-block section-block-break">
  <div class="header">
    <img class="logo" src="${LOGO_URL}" alt="Smiths"><span class="doc-label">${titleShort}</span>
  </div>
  <div class="client-divider"><span>{{ CLIENT_B_NAME }}</span></div>
  <div class="sub-heading">Agreed Covers - <span class="placeholder">{{ CLIENT_B_NAME }}</span></div>

  {% if HAS_EXISTING_COVER %}
  <p class="body-text"><em>{{ CLIENT_B_ADVICE_TYPE_LABEL }}</em></p>
  <div class="dual-cover-wrapper">
    <table>
      <thead>
        <tr><th class="header-proposed" colspan="2">{% for logo in CLIENT_B_NEW_INSURER_LOGOS %}<img class="insurer-logo" src="{{ logo.src }}" alt="{{ logo.alt }}"> {% endfor %}Proposed Cover</th><th class="spacer-col"></th><th class="header-existing" colspan="2">{% for logo in CLIENT_B_EXISTING_INSURER_LOGOS %}<img class="insurer-logo" src="{{ logo.src }}" alt="{{ logo.alt }}"> {% endfor %}Existing Cover</th></tr>
        <tr><th style="background:var(--white);color:var(--dark);">Cover Type</th><th style="background:var(--white);color:var(--dark);text-align:right;">Sum Insured</th><th class="spacer-col"></th><th style="background:var(--white);color:var(--dark);">Cover Type</th><th style="background:var(--white);color:var(--dark);text-align:right;">Sum Insured</th></tr>
      </thead>
      <tbody>
        <tr><td>Life</td><td style="text-align:right;">{{ CLIENT_B_NEW_LIFE }}</td><td class="spacer-col"></td><td>Life</td><td style="text-align:right;">{{ CLIENT_B_OLD_LIFE }}</td></tr>
        <tr><td>Progressive Care / Trauma</td><td style="text-align:right;">{{ CLIENT_B_NEW_TRAUMA }}</td><td class="spacer-col"></td><td>Trauma</td><td style="text-align:right;">{{ CLIENT_B_OLD_TRAUMA }}</td></tr>
        <tr><td>T.P.D.</td><td style="text-align:right;">{{ CLIENT_B_NEW_TPD }}</td><td class="spacer-col"></td><td>T.P.D.</td><td style="text-align:right;">{{ CLIENT_B_OLD_TPD }}</td></tr>
        <tr><td>Income Protection</td><td style="text-align:right;">{{ CLIENT_B_NEW_IP }}</td><td class="spacer-col"></td><td>Income Protection</td><td style="text-align:right;">{{ CLIENT_B_OLD_IP }}</td></tr>
        <tr><td>Health Insurance</td><td style="text-align:right;">{{ CLIENT_B_NEW_HEALTH }}</td><td class="spacer-col"></td><td>Health Insurance</td><td style="text-align:right;">{{ CLIENT_B_OLD_HEALTH }}</td></tr>
        <tr><td>Mortgage Protection</td><td style="text-align:right;">{{ CLIENT_B_NEW_MP }}</td><td class="spacer-col"></td><td>Mortgage Protection</td><td style="text-align:right;">{{ CLIENT_B_OLD_MP }}</td></tr>
        <tr><td>Accidental Injury</td><td style="text-align:right;">{{ CLIENT_B_NEW_AIC }}</td><td class="spacer-col"></td><td>Accidental Injury</td><td style="text-align:right;">{{ CLIENT_B_OLD_AIC }}</td></tr>
        <tr><td>Premium Cover</td><td style="text-align:right;">{{ CLIENT_B_NEW_PREMIUM_COVER }}</td><td class="spacer-col"></td><td>Premium Cover</td><td style="text-align:right;">{{ CLIENT_B_OLD_PREMIUM_COVER }}</td></tr>
      </tbody>
    </table>
  </div>
  {% else %}
  <p class="body-text"><em>Recommended new cover</em></p>
  <div class="single-cover-wrapper">
    <div class="side-header">{% for logo in CLIENT_B_NEW_INSURER_LOGOS %}<img class="insurer-logo" src="{{ logo.src }}" alt="{{ logo.alt }}"> {% endfor %}Recommended Cover</div>
    <table>
      <tr><th>Cover Type</th><th style="text-align:right;">Sum Insured</th></tr>
      <tr><td>Life</td><td style="text-align:right;">{{ CLIENT_B_NEW_LIFE }}</td></tr>
      <tr><td>Progressive Care / Trauma</td><td style="text-align:right;">{{ CLIENT_B_NEW_TRAUMA }}</td></tr>
      <tr><td>T.P.D.</td><td style="text-align:right;">{{ CLIENT_B_NEW_TPD }}</td></tr>
      <tr><td>Income Protection</td><td style="text-align:right;">{{ CLIENT_B_NEW_IP }}</td></tr>
      <tr><td>Health Insurance</td><td style="text-align:right;">{{ CLIENT_B_NEW_HEALTH }}</td></tr>
      <tr><td>Mortgage Protection</td><td style="text-align:right;">{{ CLIENT_B_NEW_MP }}</td></tr>
      <tr><td>Accidental Injury</td><td style="text-align:right;">{{ CLIENT_B_NEW_AIC }}</td></tr>
      <tr><td>Premium Cover</td><td style="text-align:right;">{{ CLIENT_B_NEW_PREMIUM_COVER }}</td></tr>
    </table>
  </div>
  {% endif %}
</div>
{% endif %}

<!-- ═══ SECTION 8 — PREMIUM SUMMARY (forced new page) ═══ -->
<div class="section-block section-block-break">
<div class="header">
  <img class="logo" src="${LOGO_URL}" alt="Smiths"><span class="doc-label">${titleShort}</span>
</div>

<div class="section-heading"><div class="num">8</div><h2>Premium Summary</h2></div>

<div class="premium-card">
  {% if HAS_EXISTING_COVER %}
  <div class="premium-grid">
    <div class="premium-cell"><div class="p-label">Existing Premium</div><div class="p-amount">{{ OLD_PREMIUM }}</div><div class="p-freq">{{ PREMIUM_FREQUENCY }}</div></div>
    <div class="premium-cell"><div class="p-label">New Premium</div><div class="p-amount">{{ NEW_PREMIUM }}</div><div class="p-freq">{{ PREMIUM_FREQUENCY }}</div></div>
    <div class="premium-cell"><div class="p-label">{{ PREMIUM_CHANGE_LABEL }}</div><div class="p-amount">{{ PREMIUM_CHANGE }}</div><div class="p-freq">{{ PREMIUM_FREQUENCY }}</div></div>
  </div>
  {% else %}
  <div class="premium-grid single-row">
    <div class="premium-cell"><div class="p-label">Recommended Combined Premium</div><div class="p-amount">{{ NEW_PREMIUM }}</div><div class="p-freq">{{ PREMIUM_FREQUENCY }}</div></div>
  </div>
  {% endif %}
</div>
</div><!-- /section-block-break: Premium Summary -->

<!-- ═══ SECTION 9 — MIGRATION ANALYSIS (existing cover only) ═══ -->
{% if HAS_EXISTING_COVER %}
<div class="section-heading"><div class="num">9</div><h2>Migration Analysis - Pros &amp; Cons</h2></div>
{% if LIFE_INCLUDED %}<div class="sub-heading">Life Cover</div><div class="pros-cons-grid"><div class="pro-card"><div class="pc-title">Pros</div>{{ LIFE_PROS }}</div><div class="con-card"><div class="pc-title">Cons</div>{{ LIFE_CONS }}</div></div>{% endif %}
{% if TRAUMA_INCLUDED %}<div class="sub-heading">Trauma / Progressive Care</div><div class="pros-cons-grid"><div class="pro-card"><div class="pc-title">Pros</div>{{ TRAUMA_PROS }}</div><div class="con-card"><div class="pc-title">Cons</div>{{ TRAUMA_CONS }}</div></div>{% endif %}
{% if TPD_INCLUDED %}<div class="sub-heading">Total and Permanent Disability</div><div class="pros-cons-grid"><div class="pro-card"><div class="pc-title">Pros</div>{{ TPD_PROS }}</div><div class="con-card"><div class="pc-title">Cons</div>{{ TPD_CONS }}</div></div>{% endif %}
{% if INCOME_MP_INCLUDED %}<div class="sub-heading">Income &amp; Mortgage Protection</div><div class="pros-cons-grid"><div class="pro-card"><div class="pc-title">Pros</div>{{ INCOME_MP_PROS }}</div><div class="con-card"><div class="pc-title">Cons</div>{{ INCOME_MP_CONS }}</div></div>{% endif %}
{% if AIC_INCLUDED %}<div class="sub-heading">Accidental Injury Cover</div><div class="pros-cons-grid"><div class="pro-card"><div class="pc-title">Pros</div>{{ AIC_PROS }}</div><div class="con-card"><div class="pc-title">Cons</div>{{ AIC_CONS }}</div></div>{% endif %}
{% endif %}

<!-- ═══ SECTION 10 — REASONS ═══ -->
<div class="header page-break">
  <img class="logo" src="${LOGO_URL}" alt="Smiths"><span class="doc-label">${titleShort}</span>
</div>

<div class="section-heading"><div class="num">10</div>
  {% if HAS_EXISTING_COVER %}<h2>${reasonsHeadingExisting}</h2>{% else %}<h2>${reasonsHeadingNew}</h2>{% endif %}
</div>

{% if LIFE_INCLUDED %}<div class="sub-heading">Life Cover</div><div class="info-card">{{ REASON_LIFE_COVER }}</div>{% else %}<div class="sub-heading">Life Cover</div><div class="info-card"><p class="body-text">Life cover was discussed and considered as part of this review. Based on your current circumstances and objectives, life cover was not required or requested at this time. This can be revisited at any future review.</p></div>{% endif %}
{% if TRAUMA_INCLUDED %}<div class="sub-heading">Trauma / Critical Conditions Cover</div><div class="info-card">{{ REASON_TRAUMA }}</div><div class="sub-heading">Progressive Care (Severity-Based Trauma)</div><div class="info-card">{{ REASON_PROGRESSIVE_CARE }}</div>{% else %}<div class="sub-heading">Trauma / Critical Conditions Cover</div><div class="info-card"><p class="body-text">Trauma and critical conditions cover was discussed and considered as part of this review. Based on your current circumstances and objectives, this cover was not required or requested at this time. This can be revisited at any future review.</p></div>{% endif %}
{% if TPD_INCLUDED %}<div class="sub-heading">Total and Permanent Disability Cover</div><div class="info-card">{{ REASON_TPD }}</div>{% else %}<div class="sub-heading">Total and Permanent Disability Cover</div><div class="info-card"><p class="body-text">Total and permanent disability (TPD) cover was discussed and considered as part of this review. Based on your current circumstances and objectives, this cover was not required or requested at this time. This can be revisited at any future review.</p></div>{% endif %}
{% if INCOME_MP_INCLUDED %}<div class="sub-heading">Mortgage and Income Protection Cover</div><div class="info-card">{{ REASON_INCOME_MORTGAGE }}</div>{% else %}<div class="sub-heading">Mortgage and Income Protection Cover</div><div class="info-card"><p class="body-text">Mortgage and income protection cover was discussed and considered as part of this review. Based on your current circumstances and objectives, this cover was not required or requested at this time. This can be revisited at any future review.</p></div>{% endif %}
{% if AIC_INCLUDED %}<div class="sub-heading">Accidental Injury Cover</div><div class="info-card">{{ REASON_ACCIDENTAL_INJURY }}</div>{% else %}<div class="sub-heading">Accidental Injury Cover</div><div class="info-card"><p class="body-text">Accidental injury cover was discussed and considered as part of this review. Based on your current circumstances and objectives, this cover was not required or requested at this time. This can be revisited at any future review.</p></div>{% endif %}
{% if HEALTH_INCLUDED %}<div class="sub-heading">Health Insurance</div><div class="info-card">{{ REASON_HEALTH }}</div>{% else %}<div class="sub-heading">Health Insurance</div><div class="info-card"><p class="body-text">Health insurance was discussed and considered as part of this review. Based on your current circumstances and objectives, health insurance was not required or requested at this time. This can be revisited at any future review.</p></div>{% endif %}

<!-- ═══ SECTION 11 — BENEFITS SUMMARY ═══ -->
{% if INCOME_MP_INCLUDED %}
<div class="section-heading"><div class="num">11</div><h2>Your Benefits Summary</h2></div>

{% if IS_PARTNER %}
<div class="sub-heading">{{ CLIENT_A_NAME }}</div>
{% endif %}
{% if MP_MONTHLY != "N/A" or IP_MONTHLY != "N/A" %}
<table class="data-table">
  <thead><tr><th>Benefit Type</th><th>Monthly Amount</th><th>Wait Period</th><th>Benefit Period</th><th>Premium</th></tr></thead>
  <tbody>
    <tr><td>Mortgage Protection</td><td class="na">{{ MP_MONTHLY }}</td><td class="na">{{ MP_WAIT }}</td><td class="na">{{ MP_BENEFIT_PERIOD }}</td><td class="na">{{ MP_PREMIUM }}</td></tr>
    <tr><td>Income Protection</td><td class="na">{{ IP_MONTHLY }}</td><td class="na">{{ IP_WAIT }}</td><td class="na">{{ IP_BENEFIT_PERIOD }}</td><td class="na">{{ IP_PREMIUM }}</td></tr>
  </tbody>
</table>
{% endif %}

{% if IS_PARTNER %}
{% if CLIENT_B_MP_MONTHLY != "N/A" or CLIENT_B_IP_MONTHLY != "N/A" %}
<div class="sub-heading">{{ CLIENT_B_NAME }}</div>
<table class="data-table">
  <thead><tr><th>Benefit Type</th><th>Monthly Amount</th><th>Wait Period</th><th>Benefit Period</th><th>Premium</th></tr></thead>
  <tbody>
    <tr><td>Mortgage Protection</td><td class="na">{{ CLIENT_B_MP_MONTHLY }}</td><td class="na">{{ CLIENT_B_MP_WAIT }}</td><td class="na">{{ CLIENT_B_MP_BENEFIT_PERIOD }}</td><td class="na">{{ CLIENT_B_MP_PREMIUM }}</td></tr>
    <tr><td>Income Protection</td><td class="na">{{ CLIENT_B_IP_MONTHLY }}</td><td class="na">{{ CLIENT_B_IP_WAIT }}</td><td class="na">{{ CLIENT_B_IP_BENEFIT_PERIOD }}</td><td class="na">{{ CLIENT_B_IP_PREMIUM }}</td></tr>
  </tbody>
</table>
{% endif %}
{% endif %}

{% endif %}

<!-- ═══ SECTION 12 — ONGOING SERVICE ═══ -->
<div class="section-heading"><div class="num">12</div><h2>Ongoing Service</h2></div>
<p class="body-text">Following policy placement, we will provide ongoing service at no additional fee:</p>
<ul class="styled-list">
  <li>Policy queries and administration support</li>
  <li>Claims assistance - guidance, documentation support, and liaison with insurers</li>
  <li>Annual review on request or when circumstances change</li>
  <li>Policy amendments, updates, and renewals</li>
</ul>

<!-- ═══ SECTION 13 — PRIVACY ═══ -->
<div class="section-heading"><div class="num">13</div><h2>Privacy and Records</h2></div>
<p class="body-text">We collect personal information to provide advice and arrange insurance. Information may be shared with insurers, reinsurers, premium funders, claims assessors, and service providers. Records are retained for a minimum of seven years in accordance with regulatory requirements.</p>

<!-- ═══ SECTION 14 — DECLARATION (existing cover only) ═══ -->
{% if HAS_EXISTING_COVER %}
<div class="header page-break">
  <img class="logo" src="${LOGO_URL}" alt="Smiths"><span class="doc-label">${titleShort}</span>
</div>

<div class="section-heading"><div class="num">14</div><h2>Declaration of Continued Good Health</h2></div>
<p class="body-text">As your Financial Adviser, I want to ensure the cover applied for can operate correctly at claim time.</p>
<div class="checkbox-group" style="margin:16px 0 16px 12px;">
  <div class="checkbox-item"><span class="checkbox-box"></span><span class="checkbox-label">You have not received therapy or treatment since completing the application form</span></div>
  <div class="checkbox-item"><span class="checkbox-box"></span><span class="checkbox-label">You are not currently receiving treatment not already disclosed</span></div>
  <div class="checkbox-item"><span class="checkbox-box"></span><span class="checkbox-label">There have not been any changes in your health, occupation, or pastimes</span></div>
  <div class="checkbox-item"><span class="checkbox-box"></span><span class="checkbox-label">I can confirm that I provided all the answers myself</span></div>
  <div class="checkbox-item"><span class="checkbox-box"></span><span class="checkbox-label">The adviser explained any additional exclusions applicable to this policy</span></div>
  <div class="checkbox-item"><span class="checkbox-box"></span><span class="checkbox-label">The adviser explained the payment dates and premium amounts</span></div>
  <div class="checkbox-item"><span class="checkbox-box"></span><span class="checkbox-label">The adviser explained the risk of non-disclosure or misstatement</span></div>
  <div class="checkbox-item"><span class="checkbox-box"></span><span class="checkbox-label">The adviser explained the difference between my new and previous insurance policy</span></div>
</div>
<div class="warning-box"><strong>Important:</strong> The adviser, {{ ADVISER_NAME }}, also explained the risks of shifting insurance cover which manifests if your health has changed since the initial policy was issued. {{ CLIENT_A_NEW_INSURER }} have underwritten the insurance risk as of today with the information you provided to us.</div>
{% endif %}

<!-- ═══ SECTION 15 — COMPLAINTS ═══ -->
<div class="section-heading"><div class="num">15</div><h2>Complaints and Disputes</h2></div>
<p class="body-text">If you have a complaint about our service, please contact us:</p>
<p class="body-text">Henry Smith: henry@smiths.net.nz | 027 344 5255<br>Craig Smith: craig@smiths.net.nz | 0274 293 939<br>Post: PO Box 8267, Riccarton, Christchurch</p>
<p class="body-text"><strong>Financial Dispute Resolution Service (FDRS)</strong><br>Website: fdrs.org.nz | Email: enquiries@fdrs.org.nz<br>Freepost 231075, PO Box 2272, Wellington 6140</p>

<!-- ═══ SECTION 16 — TERMINATION ═══ -->
<div class="section-heading"><div class="num">16</div><h2>Termination</h2></div>
<p class="body-text">Either party may terminate this engagement by providing written notice. Existing policies will remain in force until cancelled directly with the insurer.</p>

<!-- ═══ SECTION 17 — SIGN-OFF ═══ -->
<div class="header page-break">
  <img class="logo" src="${LOGO_URL}" alt="Smiths"><span class="doc-label">${titleShort}</span>
</div>

<div class="section-heading"><div class="num">17</div><h2>Declaration &amp; Sign-Off</h2></div>
<div class="info-card" style="background:var(--white);">
  {% if IS_PARTNER %}
  <p class="body-text">We, <strong><em>{{ CLIENT_A_NAME }}</em></strong> and <strong><em>{{ CLIENT_B_NAME }}</em></strong>, have read and understand this report and wish to:</p>
  {% else %}
  <p class="body-text">I, <strong><em>{{ CLIENT_A_NAME }}</em></strong>, have read and understand this report and wish to:</p>
  {% endif %}
  <div class="checkbox-group" style="margin:14px 0;">
    <div class="checkbox-item"><span class="checkbox-box"></span><span class="checkbox-label"><strong>ACCEPT</strong> the sign-off document</span></div>
    <div class="checkbox-item"><span class="checkbox-box"></span><span class="checkbox-label"><strong>DECLINE</strong> the sign-off document</span></div>
    <div class="checkbox-item"><span class="checkbox-box"></span><span class="checkbox-label"><strong>MODIFY</strong> the sign-off document (see notes below)</span></div>
  </div>
</div>

<div class="sub-heading">Modification Notes (if applicable):</div>
<div class="placeholder-block" style="min-height:56px;">{{ MODIFICATION_NOTES }}</div>

{% if IS_PARTNER %}
<div class="signature-grid">
  <div class="sig-box"><div class="sig-name">{{ CLIENT_A_NAME }}</div><div class="sig-line"></div><div class="sig-label">Signature</div><div class="sig-line"></div><div class="sig-label">Date</div></div>
  <div class="sig-box"><div class="sig-name">{{ CLIENT_B_NAME }}</div><div class="sig-line"></div><div class="sig-label">Signature</div><div class="sig-line"></div><div class="sig-label">Date</div></div>
</div>
{% else %}
<div class="signature-grid single">
  <div class="sig-box"><div class="sig-name">{{ CLIENT_A_NAME }}</div><div class="sig-line"></div><div class="sig-label">Signature</div><div class="sig-line"></div><div class="sig-label">Date</div></div>
</div>
{% endif %}

<!-- ═══ FOOTER ═══ -->
<div class="footer">
  <span>${title} | Confidential</span>
  <span>Craig Smith Business Services Limited | FAP License #712931 | <a href="https://www.smiths.net.nz">www.smiths.net.nz</a></span>
</div>

</div><!-- /page -->
</body>
</html>`;
}

// ══════════════════════════════════════════════════════════════
// KIWISAVER SOA TEMPLATE
// ══════════════════════════════════════════════════════════════

const KIWISAVER_EXTRA_CSS = `
/* ═══ SPACING SYSTEM ═══ */
:root{--sp-xs:8px;--sp-sm:16px;--sp-md:24px;--sp-lg:40px;--sp-xl:64px;--panel-bg:#F8F6F3;--panel-bdr:#E6E1DA;--section-gap:var(--sp-lg);}

/* ═══ PAGE BREAK CONTROL ═══ */
.section-block-break{page-break-before:always;}
.section-heading{page-break-after:avoid;page-break-inside:avoid;}
.info-card,.callout-box,.warning-box,.ks-compare,.dual-cover-wrapper,.strategy-card,.risk-dimensions,.review-schedule{page-break-inside:avoid;break-inside:avoid;}
.section-heading+.body-text,.section-heading+.info-card,.sub-heading+.info-card{page-break-before:avoid;}

/* ═══ EDITORIAL SECTION HEADINGS ═══ */
.section-heading{display:block;margin:var(--sp-lg) 0 var(--sp-md) 0;padding-bottom:var(--sp-sm);border-bottom:1px solid var(--panel-bdr);}
.section-heading .num{display:inline;width:auto;height:auto;min-width:auto;background:none;color:var(--bronze);border-radius:0;font-family:var(--font-display);font-size:11pt;font-weight:400;letter-spacing:-0.2px;}
.section-heading .num::after{content:'.';}
.section-heading h2{display:inline;font-family:var(--font-body);font-size:11px;font-weight:600;color:var(--dark);letter-spacing:0.12em;text-transform:uppercase;margin-left:6px;}
.sub-heading{font-family:var(--font-body);font-size:10px;font-weight:600;color:var(--dark);letter-spacing:0.08em;text-transform:uppercase;margin:var(--sp-md) 0 var(--sp-sm) 0;page-break-after:avoid;}

/* ═══ PANELS (replace heavy cards) ═══ */
.info-card{background:var(--panel-bg);border:1px solid var(--panel-bdr);border-radius:0;padding:var(--sp-md);margin-bottom:var(--sp-md);box-shadow:none;}
.info-card h4{font-family:var(--font-body);font-size:10px;font-weight:600;color:var(--dark);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:var(--sp-sm);padding-bottom:6px;border-bottom:1px solid var(--panel-bdr);display:block;}

/* ═══ BODY TEXT RHYTHM ═══ */
.body-text{margin-bottom:var(--sp-sm);line-height:1.68;font-size:10pt;}
.body-text em{color:var(--muted);font-style:italic;}

/* ═══ CALLOUT & WARNING ═══ */
.callout-box{background:var(--panel-bg);border:1px solid var(--panel-bdr);border-left:2px solid var(--bronze);padding:var(--sp-sm) var(--sp-md);margin:var(--sp-sm) 0;font-size:9.5pt;line-height:1.6;border-radius:0;}
.warning-box{background:#FFFBF5;border:1px solid #E8D5B8;border-left:2px solid #D4A060;padding:var(--sp-sm) var(--sp-md);margin:var(--sp-sm) 0;font-size:9.5pt;line-height:1.6;border-radius:0;}

/* ═══ KS COMPARE TABLES (refined) ═══ */
.ks-compare{width:100%;border-collapse:collapse;margin:0;}
.ks-compare td,.ks-compare th{padding:0;border:none;}
.ks-compare .ks-provider-head{padding:var(--sp-md) var(--sp-sm) 14px var(--sp-sm);text-align:center;vertical-align:bottom;border-bottom:1px solid var(--panel-bdr);}
.ks-compare .ks-provider-head img{height:108px;width:auto;display:block;margin:0 auto 10px auto;}
.ks-compare .ks-provider-head .ks-fund-name{font-family:var(--font-body);font-size:9pt;font-weight:600;color:var(--dark);letter-spacing:0.2px;}
.ks-compare .ks-provider-head .ks-provider-tag{font-size:7pt;font-weight:600;color:var(--bronze);text-transform:uppercase;letter-spacing:1.2px;margin-top:4px;}
.ks-compare .ks-label-head{padding:var(--sp-md) var(--sp-sm) 14px 0;vertical-align:bottom;border-bottom:1px solid var(--panel-bdr);}
.ks-compare .ks-row td{padding:12px var(--sp-sm);border-bottom:1px solid rgba(230,225,218,0.5);vertical-align:middle;}
.ks-compare .ks-row:last-child td{border-bottom:none;}
.ks-compare .ks-row-label{font-size:9pt;font-weight:500;color:var(--muted);}
.ks-compare .ks-row-val{text-align:center;font-family:var(--font-display);font-size:13pt;font-weight:400;color:var(--black);letter-spacing:-0.3px;}
.ks-compare .ks-row-val.na{font-family:var(--font-body);font-size:9pt;color:var(--subtle);font-style:italic;font-weight:400;}

/* ═══ DUAL COVER / COMPARISON ═══ */
.dual-cover-wrapper .header-recommended{background:var(--bronze);color:var(--white);vertical-align:middle;padding:var(--sp-sm) 14px;}
.dual-cover-wrapper .header-current{background:var(--navy);color:var(--white);vertical-align:middle;padding:var(--sp-sm) 14px;}
.dual-cover-wrapper .spacer-col{width:var(--sp-md);background:var(--white);border-bottom:1px solid var(--panel-bdr);}
.provider-logo{height:78px;width:auto;display:inline-block;vertical-align:middle;}
.provider-logo-badge{display:inline-block;background:var(--white);padding:12px 24px;margin-bottom:10px;}
.provider-logo-badge img{height:90px;width:auto;display:block;}
.provider-header-cell{text-align:center;font-size:7.5pt;font-weight:600;text-transform:uppercase;letter-spacing:1px;}
.provider-header-label{margin-top:8px;opacity:0.85;letter-spacing:1.2px;}

/* ═══ BACK COVER ═══ */
.back-cover{page-break-before:always;background:var(--navy);color:var(--white);margin:0 -44px;padding:0 44px;min-height:calc(297mm - 44mm);display:flex;flex-direction:column;justify-content:space-between;}
.back-cover-top{padding-top:var(--sp-xl);}
.back-cover .back-logo{height:46px;width:auto;filter:brightness(0) invert(1);}
.back-cover .back-rule{width:44px;height:2px;background:var(--bronze);margin:18px 0 0 0;}
.back-cover-bottom{padding-bottom:46px;}
.back-cover h3{font-family:var(--font-display);font-size:18pt;font-weight:700;letter-spacing:-0.2px;margin:0 0 10px 0;}
.back-cover p{margin:0 0 8px 0;opacity:0.92;line-height:1.6;}
.back-cover .muted{opacity:0.78;font-size:9.5pt;}
.back-cover .contact{margin-top:18px;font-size:10pt;}
.back-cover a{color:var(--white);text-decoration:none;border-bottom:1px solid rgba(255,255,255,0.25);}

/* ═══ SIGNATURE / CHECKBOX ═══ */
.signature-grid.single{grid-template-columns:1fr;max-width:420px;}
.checkbox-box svg{display:none;width:11px;height:11px;}
.checkbox-item.checked .checkbox-box svg{display:block;}

/* ═══ DECISIONS BOX (minimalist) ═══ */
/* ═══ PAGE CONTROL UTILITIES ═══ */
.page-section{page-break-inside:avoid;break-inside:avoid;}
.keep-together{page-break-inside:avoid;break-inside:avoid;}
.decisions-section{page-break-before:always;break-before:page;page-break-inside:avoid;break-inside:avoid;display:block !important;padding-top:var(--sp-lg);margin:0;}
.decisions-section *{page-break-inside:avoid;break-inside:avoid;}
.decisions-box{border-top:1px solid var(--panel-bdr);border-bottom:1px solid var(--panel-bdr);padding:var(--sp-md) 0;margin:0;}
.decisions-box h4{font-family:var(--font-body);font-size:10px;font-weight:600;color:var(--bronze);letter-spacing:0.12em;text-transform:uppercase;margin:0 0 var(--sp-sm) 0;}
.decisions-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;}
.decision-card{padding:0 var(--sp-md) 0 0;border-right:1px solid var(--panel-bdr);background:none;border-radius:0;box-shadow:none;}
.decision-card:last-child{border-right:none;padding-right:0;}
.decision-card:not(:first-child){padding-left:var(--sp-md);}
.decision-num{font-family:var(--font-display);font-size:20pt;color:var(--bronze);font-weight:400;line-height:1;}
.decision-title{font-weight:600;font-size:9px;text-transform:uppercase;letter-spacing:0.08em;color:var(--dark);margin:4px 0 3px 0;}
.decision-desc{font-size:8.5pt;color:var(--muted);line-height:1.5;}

/* ═══ STRATEGY CARDS ═══ */
.strategy-card{background:var(--panel-bg);border:none;border-left:2px solid var(--bronze);border-radius:0;padding:var(--sp-sm) var(--sp-md);margin:var(--sp-sm) 0;}
.strategy-card h5{font-family:var(--font-body);font-size:9px;font-weight:600;color:var(--bronze);letter-spacing:0.1em;text-transform:uppercase;margin:0 0 6px 0;}
.strategy-card p{margin:0;font-size:9.5pt;line-height:1.6;color:var(--dark);}

/* ═══ RESEARCH FUNNEL ═══ */
.research-funnel{margin:var(--sp-sm) 0;border-collapse:collapse;width:100%;}
.research-funnel td{padding:10px var(--sp-sm);vertical-align:top;border-bottom:1px solid rgba(230,225,218,0.5);}
.research-funnel .funnel-stage{font-weight:600;font-size:9px;color:var(--bronze);text-transform:uppercase;letter-spacing:0.08em;width:120px;}
.research-funnel .funnel-desc{font-size:9.5pt;color:var(--dark);line-height:1.55;}

/* ═══ IMPLEMENTATION CHECKLIST ═══ */
.impl-checklist{list-style:none;padding:0;margin:0;}
.impl-checklist li{padding:10px 0 10px 28px;border-bottom:1px solid rgba(230,225,218,0.5);position:relative;font-size:9.5pt;line-height:1.55;}
.impl-checklist li:last-child{border-bottom:none;}
.impl-checklist li::before{content:'\\2610';position:absolute;left:4px;top:10px;font-size:12pt;color:var(--bronze);}

/* ═══ SOURCE LIST ═══ */
.source-list{list-style:none;padding:0;margin:0;}
.source-list li{padding:6px 0;border-bottom:1px solid rgba(230,225,218,0.5);font-size:8.5pt;line-height:1.55;}
.source-list li:last-child{border-bottom:none;}
.source-list .source-name{font-weight:600;color:var(--dark);}
.source-list .source-url{color:var(--muted);font-style:italic;}

/* ═══ CHANGE TRIGGERS ═══ */
.change-trigger-list{columns:2;column-gap:var(--sp-md);list-style:none;padding:0;margin:0;}
.change-trigger-list li{padding:4px 0 4px 14px;position:relative;font-size:9pt;color:var(--dark);break-inside:avoid;}
.change-trigger-list li::before{content:'\\2014';position:absolute;left:0;color:var(--bronze);font-size:8pt;}

/* ═══ RISK DIMENSIONS ═══ */
.risk-dimensions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--sp-sm);margin:var(--sp-sm) 0;}
.risk-dim-card{background:var(--panel-bg);border:1px solid var(--panel-bdr);border-radius:0;padding:var(--sp-sm);text-align:center;}
.risk-dim-card .dim-label{font-size:7.5pt;text-transform:uppercase;letter-spacing:0.1em;color:var(--muted);font-weight:600;margin-bottom:6px;}
.risk-dim-card .dim-value{font-family:var(--font-display);font-size:14pt;color:var(--dark);font-weight:400;letter-spacing:-0.3px;}

/* ═══ REVIEW SCHEDULE ═══ */
.review-schedule{display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-sm);margin:var(--sp-sm) 0;}
.review-card{background:var(--panel-bg);border:1px solid var(--panel-bdr);border-radius:0;padding:var(--sp-sm);}
.review-card h5{font-size:9px;font-weight:600;color:var(--dark);text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px 0;}
.review-card p,.review-card ul{font-size:9pt;color:var(--muted);line-height:1.55;margin:0;}
.review-card ul{padding-left:var(--sp-sm);margin-top:4px;}

/* ═══ RECOMMENDATION TWO-COLUMN ═══ */
.rec-layout{display:grid;grid-template-columns:1fr 280px;gap:var(--sp-md);margin:var(--sp-sm) 0;page-break-inside:avoid;}
.rec-layout .rec-text{font-size:10pt;line-height:1.65;}
.rec-panel{background:var(--panel-bg);border:1px solid var(--panel-bdr);padding:var(--sp-md);}
.rec-panel .rec-panel-title{font-size:9px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--bronze);margin-bottom:var(--sp-sm);}
.rec-panel .rec-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(230,225,218,0.5);font-size:9pt;}
.rec-panel .rec-row:last-child{border-bottom:none;}
.rec-panel .rec-label{color:var(--muted);font-weight:500;}
.rec-panel .rec-value{color:var(--dark);font-weight:600;text-align:right;}

/* ═══ FUND DESCRIPTION PANEL ═══ */
.fund-desc{background:var(--panel-bg);border:1px solid var(--panel-bdr);padding:var(--sp-md);margin:var(--sp-sm) 0;page-break-inside:avoid;}
.fund-desc .fund-desc-title{font-size:9px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--bronze);margin-bottom:8px;}
.fund-desc p{font-size:9.5pt;line-height:1.6;color:var(--dark);margin:0 0 6px 0;}
.fund-desc p:last-child{margin-bottom:0;}

/* ═══ ASSET ALLOCATION BAR ═══ */
.alloc-bar-wrap{margin:var(--sp-sm) 0;}
.alloc-bar-label{font-size:8pt;color:var(--muted);font-weight:600;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:6px;}
.alloc-bar{display:flex;height:10px;width:100%;overflow:hidden;}
.alloc-bar .alloc-growth{background:var(--bronze);height:100%;}
.alloc-bar .alloc-income{background:var(--navy);height:100%;opacity:0.3;}
.alloc-bar-legend{display:flex;gap:var(--sp-md);margin-top:6px;font-size:8pt;color:var(--muted);}
.alloc-bar-legend span::before{content:'';display:inline-block;width:8px;height:8px;margin-right:4px;vertical-align:middle;}
.alloc-bar-legend .leg-growth::before{background:var(--bronze);}
.alloc-bar-legend .leg-income::before{background:var(--navy);opacity:0.3;}

/* ═══ DATA TABLE REFINEMENT ═══ */
.data-table th{background:var(--panel-bg);color:var(--dark);border-bottom:1px solid var(--panel-bdr);}

/* ═══ FUND BREAKDOWN SECTION ═══ */
.fb-section{page-break-inside:avoid;break-inside:avoid;margin:var(--sp-md) 0;border:1px solid var(--panel-bdr);background:var(--white);}
.fb-layout{display:grid;grid-template-columns:1fr 220px;gap:0;}
.fb-text{padding:var(--sp-md);border-right:1px solid var(--panel-bdr);}
.fb-chart{padding:var(--sp-md);display:flex;flex-direction:column;align-items:center;justify-content:flex-start;background:var(--panel-bg);}
.fb-section-title{font-family:var(--font-body);font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--bronze);margin-bottom:var(--sp-sm);}
.fb-sub-title{font-family:var(--font-body);font-size:9px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--dark);margin:var(--sp-md) 0 var(--sp-sm) 0;padding-bottom:6px;border-bottom:1px solid var(--panel-bdr);}
.fb-fee-table{margin:0;}
.fb-fee-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(230,225,218,0.5);font-size:9pt;}
.fb-fee-row:last-child{border-bottom:none;font-weight:600;padding-top:8px;margin-top:2px;border-top:1px solid var(--panel-bdr);}
.fb-fee-label{color:var(--muted);}
.fb-fee-value{color:var(--dark);font-weight:600;}
.fb-alloc-split{display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-sm);}
.fb-alloc-group{}
.fb-alloc-group-label{font-size:8px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--bronze);margin-bottom:6px;}
.fb-alloc-item{display:flex;justify-content:space-between;padding:3px 0;font-size:8.5pt;color:var(--dark);border-bottom:1px solid rgba(230,225,218,0.3);}
.fb-alloc-item:last-child{border-bottom:none;}
.fb-chart-inner{margin-bottom:var(--sp-sm);}
.fb-chart-inner svg{display:block;max-width:180px;}
.fb-chart-meta{width:100%;}
.fb-meta-row{display:flex;justify-content:space-between;padding:5px 0;font-size:8.5pt;border-bottom:1px solid rgba(230,225,218,0.5);}
.fb-meta-row:last-child{border-bottom:none;}
.fb-meta-row span:first-child{color:var(--muted);font-weight:500;}
.fb-meta-row span:last-child{color:var(--dark);font-weight:600;}
`;

function buildKiwisaverTemplate(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Statement of Advice - KiwiSaver - Smiths Insurance &amp; KiwiSaver</title>
<style>${SHARED_CSS}${KIWISAVER_EXTRA_CSS}</style>
</head>
<body class="{{BODY_CLASS}}">
<div class="page">

<!-- ═══ COVER PAGE ═══ -->
<div class="cover-hero">
  <div class="cover-logo-overlay">
    <img src="/images/coverlogo.jpg" alt="Smiths Insurance &amp; KiwiSaver">
  </div>
</div>

<div class="cover-page">
  <h1>Statement of Advice</h1>
  <div class="cover-type">KiwiSaver Advice</div>
  <div class="cover-rule"></div>

  <div class="cover-meta">
    <span class="cm-label">Prepared for</span>
    <span class="cm-value"><span class="placeholder">{{ CLIENTS_PREPARED_FOR }}</span></span>

    <span class="cm-label">Date</span>
    <span class="cm-value"><span class="placeholder">{{ ADVICE_DATE_LONG }}</span></span>
  </div>

  <div class="cover-adviser-block">
    <p><strong>Craig Smith</strong></p>
    <p>Financial Adviser | FSP #33042</p>
    <p>Craig Smith Business Services Limited</p>
    <p>FAP Licence #712931</p>
  </div>
</div>

<section class="page-section decisions-section">
  <div class="decisions-box">
    <h4>3 Decisions You Are Making Today</h4>
    <div class="decisions-grid">
      <div class="decision-card">
        <div class="decision-num">1</div>
        <div class="decision-title">Fund Risk Level</div>
        <div class="decision-desc">Which fund type matches your timeframe and comfort with market ups and downs.</div>
      </div>
      <div class="decision-card">
        <div class="decision-num">2</div>
        <div class="decision-title">Fees vs Service</div>
        <div class="decision-desc">The trade-off between low-cost passive management and higher-cost active management.</div>
      </div>
      <div class="decision-card">
        <div class="decision-num">3</div>
        <div class="decision-title">Investment Style</div>
        <div class="decision-desc">Active vs passive management, and any ESG/responsible investment preferences.</div>
      </div>
    </div>
  </div>
</section>

<!-- ═══ SECTION 1 — SCOPE + SPECIAL INSTRUCTIONS (Page 2 only) ═══ -->
<div class="section-page-2">
  <div class="header">
    <img class="logo" src="${LOGO_URL}" alt="Smiths"><span class="doc-label">Statement of Advice</span>
  </div>

  <div class="section-heading"><div class="num">1</div><h2>Scope of Advice You Are Requesting</h2></div>
  <p class="body-text"><em>"How would you like us to help you?"</em></p>
  <p class="body-text">The following are the areas of KiwiSaver advice that you are requesting. Unless noted below, discussions and advice will be limited to:</p>

  <div class="sub-heading"><span class="placeholder">{{ CLIENT_1_NAME }}</span></div>
  <div class="checkbox-group">
    <div class="checkbox-item {{ CLIENT_1_SCOPE_RISK_PROFILE_CLASS }}">
      <span class="checkbox-box"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="3" d="M20 6L9 17l-5-5"/></svg></span>
      <span class="checkbox-label">Risk profile questionnaire and risk tolerance assessment</span>
    </div>
    <div class="checkbox-item {{ CLIENT_1_SCOPE_FUND_REVIEW_CLASS }}">
      <span class="checkbox-box"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="3" d="M20 6L9 17l-5-5"/></svg></span>
      <span class="checkbox-label">Reviewing your current KiwiSaver provider/fund and recommending a suitable fund</span>
    </div>
    <div class="checkbox-item {{ CLIENT_1_SCOPE_CONTRIBUTIONS_CLASS }}">
      <span class="checkbox-box"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="3" d="M20 6L9 17l-5-5"/></svg></span>
      <span class="checkbox-label">Contribution guidance (employee contribution rate and voluntary contributions)</span>
    </div>
    <div class="checkbox-item {{ CLIENT_1_SCOPE_WITHDRAWALS_CLASS }}">
      <span class="checkbox-box"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="3" d="M20 6L9 17l-5-5"/></svg></span>
      <span class="checkbox-label">General discussion on withdrawals and eligibility (first home / hardship / retirement)</span>
    </div>
    <div class="checkbox-item {{ CLIENT_1_SCOPE_LIMITED_ADVICE_CLASS }}">
      <span class="checkbox-box"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="3" d="M20 6L9 17l-5-5"/></svg></span>
      <span class="checkbox-label">This is a limited advice engagement process</span>
    </div>
  </div>

  <div class="sub-heading" style="border-bottom:1.5px solid var(--bronze); padding-bottom:4px;">Special Instructions / Objectives / Comments</div>
  <div class="placeholder-block">{{ SPECIAL_INSTRUCTIONS_HTML }}</div>
</div>

<!-- ═══ SECTION 2 — ADVISER & SERVICE DISCLOSURE ═══ -->
<div class="section-block section-block-break">
  <div class="header">
    <img class="logo" src="${LOGO_URL}" alt="Smiths"><span class="doc-label">Statement of Advice</span>
  </div>

  <div class="section-heading"><div class="num">2</div><h2>Adviser &amp; Service Disclosure</h2></div>
  <p class="body-text"><em>"Who we are and how we work - full transparency"</em></p>

  <div class="info-card">
    <h4>Your adviser</h4>
    <p class="body-text"><strong>Craig Smith</strong> (FSP #33042) is your Financial Adviser, operating under <strong>Craig Smith Business Services Limited</strong> (FAP Licence #712931). Craig is authorised to provide financial advice under the Financial Markets Conduct Act 2013 and complies with the Code of Professional Conduct for Financial Advice Services (the Financial Advice Code).</p>
    <p class="body-text">Under the Financial Advice Code, Craig has a duty to treat you fairly, give advice that is suitable for your circumstances, ensure you understand the advice, and act with integrity at all times.</p>
  </div>

  <div class="info-card">
    <h4>Scope of advice - what we cover</h4>
    <p class="body-text">Craig provides financial advice in relation to KiwiSaver, managed funds, life insurance, health insurance, home, car, and contents insurance. For KiwiSaver specifically, Craig recommends products from the following panel of providers:</p>
    <table class="data-table" style="margin:10px 0 0 0;">
      <thead><tr><th>Advice Area</th><th>Product Providers Considered</th></tr></thead>
      <tbody>
        <tr><td>KiwiSaver / Investment</td><td>Booster, Milford and Generate</td></tr>
        <tr><td>Life Insurance</td><td>Partners Life, AIA, Asteron, Fidelity Life, Chubb and Pinnacle</td></tr>
        <tr><td>Health Insurance</td><td>Partners Life, AIA and NIB</td></tr>
        <tr><td>General Insurance</td><td>AON Insurance Brokers</td></tr>
      </tbody>
    </table>
  </div>

  <div class="warning-box"><strong>Panel-based advice:</strong> Craig is <strong>not independent across all providers</strong>. Recommendations are made from the panel listed above. This means there may be other KiwiSaver schemes in the market that are not considered in this advice. If you would like advice across a broader range of providers, please let us know and we can discuss options.</div>

  <div class="info-card">
    <h4>How we get paid</h4>
    <p class="body-text"><strong>There is no direct fee charged to you for this KiwiSaver advice.</strong></p>
    <p class="body-text">Smiths Insurance &amp; KiwiSaver may receive ongoing trail commission from the recommended KiwiSaver provider. This commission is a small percentage of your fund balance and is paid by the provider - it is <strong>not</strong> deducted from your account in addition to the stated fund fees.</p>
    <p class="body-text"><strong>Example:</strong> On a $100,000 KiwiSaver balance, trail commission of approximately 0.25% would equate to roughly $250 per year paid to us by the provider. This amount varies by provider and fund.</p>
  </div>

  <div class="info-card">
    <h4>Conflicts of interest</h4>
    <p class="body-text">Because we receive commission from providers, there is a potential conflict of interest. We manage this by:</p>
    <ul class="styled-list" style="margin:0;">
      <li>Following a documented advice process that ensures recommendations are based on your needs first</li>
      <li>Comparing products across our full panel before making recommendations</li>
      <li>Disclosing any material conflict that could reasonably be seen as influencing advice</li>
      <li>Maintaining a conflicts register and completing annual compliance training</li>
    </ul>
    <p class="body-text" style="margin-top:8px;">We confirm that no conflict of interest has influenced the recommendation in this document.</p>
  </div>

  <div class="callout-box"><strong>Important:</strong> Any fund performance information in this document is historical only. Past performance is not a reliable indicator of future performance.</div>
</div>

<!-- ═══ SECTION 3 — SCOPE, ASSUMPTIONS & LIMITATIONS ═══ -->
<div class="section-block section-block-break">
<div class="header">
  <img class="logo" src="${LOGO_URL}" alt="Smiths"><span class="doc-label">Statement of Advice</span>
</div>

<div class="section-heading"><div class="num">3</div><h2>Scope, Assumptions &amp; Limitations</h2></div>
<p class="body-text"><em>"What was and wasn't reviewed, and the assumptions we've made"</em></p>

<div class="info-card">
  <h4>What this advice covers</h4>
  <ul class="styled-list" style="margin:0;">
    <li>Your KiwiSaver scheme, including fund selection, provider suitability, and contribution guidance</li>
    <li>Risk profile assessment and fund type alignment</li>
    <li>Fee and performance comparison across our panel of providers</li>
    {% if CLIENT_1_FIRST_HOME_INTENTION %}<li>First-home withdrawal considerations and fund risk implications</li>{% endif %}
  </ul>
</div>

<div class="info-card">
  <h4>What this advice does NOT cover</h4>
  <ul class="styled-list" style="margin:0;">
    <li>Comprehensive retirement planning beyond KiwiSaver</li>
    <li>Debt strategy or budgeting advice</li>
    <li>Life, health, or general insurance advice (separate engagement required)</li>
    <li>Full investment portfolio review (managed funds, shares, property outside KiwiSaver)</li>
    <li>Estate planning, wills, or trusts</li>
    <li>Tax advice (please consult your accountant for personal tax matters)</li>
  </ul>
</div>

<div class="info-card">
  <h4>Information relied upon</h4>
  <p class="body-text">This advice is based on information you provided during our meeting, including:</p>
  <ul class="styled-list" style="margin:0;">
    <li>Verbal information provided during our meeting on <strong>{{ MEETING_DATE_LONG }}</strong></li>
    <li>Any KiwiSaver statements, payslips, or provider documents you supplied</li>
    <li>Your responses to our risk profile assessment</li>
  </ul>
  <p class="body-text" style="margin-top:8px;">Fund performance and fee data is sourced from provider disclosure documents as at <strong>{{ DATA_AS_AT_DATE }}</strong>.</p>
</div>

<div class="info-card">
  <h4>Key assumptions</h4>
  <ul class="styled-list" style="margin:0;">
    <li>Your personal and financial circumstances are as described at the time of our meeting</li>
    <li>Contributions will continue at the current or recommended rate</li>
    {% if CLIENT_1_AGE %}<li>Retirement age of 65 ({{ CLIENT_1_YEARS_TO_65 }} years from now, based on your current age of {{ CLIENT_1_AGE }})</li>{% endif %}
    <li>Current KiwiSaver legislation and tax settings continue (subject to government changes)</li>
  </ul>
</div>

<div class="callout-box" style="background:var(--bronze-wash);border-color:var(--bronze-border);">
  <strong>What could change this advice?</strong>
  <ul class="change-trigger-list" style="margin-top:8px;">
    <li>Significant change in income or employment</li>
    <li>Change in retirement timeline</li>
    <li>Buying or selling property</li>
    <li>Leaving New Zealand</li>
    <li>Receiving a large inheritance or gift</li>
    <li>Major change in health or family situation</li>
    <li>Government changes to KiwiSaver rules</li>
    <li>Material change in market conditions</li>
  </ul>
  <p class="body-text" style="margin-top:8px;font-size:9pt;">If any of these occur, please contact us for a review. This advice should not be relied upon after <strong>30 days</strong> without checking in.</p>
</div>
</div>

<!-- ═══ SECTION 4 — UNDERSTANDING KIWISAVER (updated rules) ═══ -->
<div class="section-block section-block-break">
<div class="header">
  <img class="logo" src="${LOGO_URL}" alt="Smiths"><span class="doc-label">Statement of Advice</span>
</div>

<div class="section-heading"><div class="num">4</div><h2>Understanding KiwiSaver</h2></div>
<p class="body-text">KiwiSaver is a voluntary, work-based savings initiative to help New Zealanders save for retirement. It is governed by the KiwiSaver Act 2006 and administered by Inland Revenue.</p>

<div class="info-card">
  <h4>Contribution rates (current rules)</h4>
  <p class="body-text">If you are employed, you can choose to contribute <strong>3%, 4%, 6%, 8%, or 10%</strong> of your before-tax pay. Your employer is required to contribute a minimum of 3%. Self-employed or non-employed members can make voluntary contributions at any time.</p>
  <div class="warning-box" style="margin-top:10px;"><strong>Upcoming changes:</strong>
    <ul class="styled-list" style="margin:6px 0 0 0;">
      <li><strong>1 April 2026:</strong> Default employee and employer contribution rates increase from <strong>3% to 3.5%</strong></li>
      <li><strong>1 April 2028:</strong> Default rates increase again from <strong>3.5% to 4%</strong></li>
      <li><strong>From 1 February 2026:</strong> A new opt-down mechanism allows members to apply to Inland Revenue to temporarily remain at 3% (for up to 12 months at a time, then reapply)</li>
    </ul>
  </div>
</div>

<div class="info-card">
  <h4>Government contribution</h4>
  <p class="body-text">The government contributes <strong>25 cents per $1 you contribute</strong>, up to a maximum of <strong>$260.72 per year</strong>. To receive the full government contribution, you need to contribute at least <strong>$1,042.86</strong> of your own money between 1 July and 30 June each year.</p>
  <p class="body-text">Eligibility criteria apply, including age and residency requirements. The rules around eligibility (including income thresholds) have been updated - this document reflects rules current as at the date of advice.</p>
</div>

<div class="info-card">
  <h4>PIE funds and your PIR</h4>
  <p class="body-text">KiwiSaver funds are structured as Portfolio Investment Entities (PIEs). Your investment returns are taxed at your Prescribed Investor Rate (PIR) rather than your marginal income tax rate. The available PIR rates for NZ resident individuals are:</p>
  <table class="ks-compare" style="margin:10px 0;">
    <tbody>
      <tr class="ks-row"><td class="ks-row-label" style="width:120px;">10.5%</td><td style="padding:8px 16px;font-size:9pt;">Taxable income up to $14,000 (two years prior) or up to $48,000 (combined)</td></tr>
      <tr class="ks-row"><td class="ks-row-label" style="width:120px;">17.5%</td><td style="padding:8px 16px;font-size:9pt;">Taxable income $14,001 - $48,000 (two years prior) or $48,001 - $70,000 (combined)</td></tr>
      <tr class="ks-row"><td class="ks-row-label" style="width:120px;">28%</td><td style="padding:8px 16px;font-size:9pt;">Taxable income over $48,000 (two years prior) or over $70,000 (combined)</td></tr>
    </tbody>
  </table>
  <p class="body-text"><strong>Choosing the correct PIR matters.</strong> If your PIR is too high, you overpay tax. If too low, you may face a tax bill at year-end. We recommend checking your PIR at least annually, especially after income changes.</p>
</div>

<div class="info-card">
  <h4>When can you access your KiwiSaver?</h4>
  <ul class="styled-list" style="margin:0;">
    <li><strong>Retirement:</strong> You can withdraw your full balance at age 65 (or after 5 years of membership, whichever is later).</li>
    <li><strong>First home purchase:</strong> You may be eligible to withdraw most of your balance after <strong>3 years of membership</strong>. At least <strong>$1,000 must remain</strong> in your KiwiSaver account after withdrawal. You must intend to live in the property. Kainga Ora provides additional guidance on eligibility.</li>
    <li><strong>Significant financial hardship:</strong> Withdrawals may be approved by your provider if you are unable to meet minimum living expenses.</li>
    <li><strong>Serious illness:</strong> Full withdrawal may be permitted if you have a life-threatening condition or permanent disability.</li>
    <li><strong>Permanent emigration:</strong> You may withdraw after being overseas for at least one year (excluding moves to Australia).</li>
  </ul>
</div>
</div>

<!-- ═══ SECTION 5 — FUND TYPES & RISK ═══ -->
<div class="section-block section-block-break">
<div class="header">
  <img class="logo" src="${LOGO_URL}" alt="Smiths"><span class="doc-label">Statement of Advice</span>
</div>

<div class="section-heading"><div class="num">5</div><h2>Fund Types and Investment Risk</h2></div>
<p class="body-text">KiwiSaver funds are categorised by their asset allocation and risk level. The right fund depends on your investment timeframe, goals, and comfort with short-term losses.</p>

<div class="info-card">
  <h4>The five main fund types</h4>
  <table class="ks-compare">
    <thead>
      <tr>
        <th class="ks-label-head" style="width:140px;">Fund Type</th>
        <th class="ks-label-head">Growth Assets</th>
        <th class="ks-label-head">Risk Level</th>
        <th class="ks-label-head">Typical Timeframe</th>
      </tr>
    </thead>
    <tbody>
      <tr class="ks-row"><td class="ks-row-label">Defensive</td><td style="padding:8px 16px;">10-25%</td><td style="padding:8px 16px;">Low</td><td style="padding:8px 16px;">1-3 years</td></tr>
      <tr class="ks-row"><td class="ks-row-label">Conservative</td><td style="padding:8px 16px;">10-35%</td><td style="padding:8px 16px;">Low-Medium</td><td style="padding:8px 16px;">3-5 years</td></tr>
      <tr class="ks-row"><td class="ks-row-label">Balanced</td><td style="padding:8px 16px;">35-63%</td><td style="padding:8px 16px;">Medium</td><td style="padding:8px 16px;">5-7 years</td></tr>
      <tr class="ks-row"><td class="ks-row-label">Growth</td><td style="padding:8px 16px;">63-90%</td><td style="padding:8px 16px;">Medium-High</td><td style="padding:8px 16px;">7-10+ years</td></tr>
      <tr class="ks-row"><td class="ks-row-label">Aggressive</td><td style="padding:8px 16px;">90-100%</td><td style="padding:8px 16px;">High</td><td style="padding:8px 16px;">10+ years</td></tr>
    </tbody>
  </table>
</div>

<p class="body-text"><strong>Growth assets</strong> (shares, property, infrastructure) offer higher long-term returns but with more volatility. <strong>Income assets</strong> (bonds, cash, term deposits) provide stability but lower returns over time. The right balance depends on how long you have until you need the money.</p>

<div class="callout-box"><strong>Key principle:</strong> The longer your investment timeframe, the more growth assets your portfolio can afford. Short-term losses are smoothed out over longer periods, and historically, growth-oriented funds have outperformed conservative funds over 10+ year horizons.</div>
</div>

<!-- ═══ SECTION 6 — YOUR RISK PROFILE ═══ -->
<div class="section-block section-block-break">
<div class="header">
  <img class="logo" src="${LOGO_URL}" alt="Smiths"><span class="doc-label">Statement of Advice</span>
</div>

<div class="section-heading"><div class="num">6</div><h2>Your Risk Profile</h2></div>
<p class="body-text">Your risk profile determines which type of KiwiSaver fund is most appropriate for you. We assess three dimensions independently and combine them to determine your recommended fund type.</p>

<div class="info-card">
  <h4>Risk assessment dimensions</h4>
  <div class="risk-dimensions">
    <div class="risk-dim-card">
      <div class="dim-label">Risk Tolerance</div>
      <div class="dim-value">{{ CLIENT_1_RISK_TOLERANCE }}</div>
      <p style="font-size:7.5pt;color:var(--muted);margin:6px 0 0 0;text-align:center;">Your emotional comfort with market ups and downs</p>
    </div>
    <div class="risk-dim-card">
      <div class="dim-label">Risk Capacity</div>
      <div class="dim-value">{{ CLIENT_1_RISK_CAPACITY }}</div>
      <p style="font-size:7.5pt;color:var(--muted);margin:6px 0 0 0;text-align:center;">Your financial ability to withstand investment losses</p>
    </div>
    <div class="risk-dim-card">
      <div class="dim-label">Time Horizon</div>
      <div class="dim-value">{% if CLIENT_1_TIMEFRAME %}{{ CLIENT_1_TIMEFRAME }}{% else %}-{% endif %}</div>
      <p style="font-size:7.5pt;color:var(--muted);margin:6px 0 0 0;text-align:center;">How long until you need to access these funds</p>
    </div>
  </div>
</div>

<div class="info-card">
  <h4>Risk profile outcome: {{ CLIENT_1_RISK_PROFILE_OUTCOME }}</h4>
  {{ RISK_PROFILE_NARRATIVE }}
</div>

{% if CLIENT_1_ESG_PREFERENCE %}
<div class="info-card">
  <h4>Values and preferences</h4>
  <p class="body-text"><strong>ESG / Responsible investing:</strong> {{ CLIENT_1_ESG_PREFERENCE }}</p>
</div>
{% endif %}
</div>

<!-- ═══ SECTION 7 — YOUR CURRENT POSITION ═══ -->
<div class="section-block section-block-break">
<div class="header">
  <img class="logo" src="${LOGO_URL}" alt="Smiths"><span class="doc-label">Statement of Advice</span>
</div>

<div class="section-heading"><div class="num">7</div><h2>Your Current KiwiSaver Position</h2></div>

<div class="info-card">
  <h4>{{ CLIENT_1_NAME }} - Profile Summary</h4>
  <table class="ks-compare">
    <tbody>
      <tr class="ks-row"><td class="ks-row-label" style="width:200px;">Meeting date</td><td class="ks-row-val" style="text-align:left;font-size:10.5pt;">{{ MEETING_DATE_LONG }}</td></tr>
      {% if CLIENT_1_AGE %}<tr class="ks-row"><td class="ks-row-label" style="width:200px;">Age</td><td class="ks-row-val" style="text-align:left;font-size:10.5pt;">{{ CLIENT_1_AGE }}</td></tr>{% endif %}
      {% if CLIENT_1_EMPLOYMENT_STATUS %}<tr class="ks-row"><td class="ks-row-label" style="width:200px;">Employment status</td><td class="ks-row-val" style="text-align:left;font-size:10.5pt;">{{ CLIENT_1_EMPLOYMENT_STATUS }}</td></tr>{% endif %}
      {% if CLIENT_1_INCOME_ANNUAL %}<tr class="ks-row"><td class="ks-row-label" style="width:200px;">Annual income</td><td class="ks-row-val" style="text-align:left;">{{ CLIENT_1_INCOME_ANNUAL }}</td></tr>{% endif %}
      {% if CLIENT_1_PIR %}<tr class="ks-row"><td class="ks-row-label" style="width:200px;">Prescribed Investor Rate (PIR)</td><td class="ks-row-val" style="text-align:left;font-size:10.5pt;">{{ CLIENT_1_PIR }}</td></tr>{% endif %}
      <tr class="ks-row"><td class="ks-row-label" style="width:200px;">Employee contribution</td><td class="ks-row-val" style="text-align:left;font-size:10.5pt;">{{ CLIENT_1_EMPLOYEE_CONTRIB }}</td></tr>
      <tr class="ks-row"><td class="ks-row-label" style="width:200px;">Employer contribution</td><td class="ks-row-val" style="text-align:left;font-size:10.5pt;">{{ CLIENT_1_EMPLOYER_CONTRIB }}</td></tr>
      {% if CLIENT_1_CURRENT_PROVIDER %}<tr class="ks-row"><td class="ks-row-label" style="width:200px;">Current provider</td><td class="ks-row-val" style="text-align:left;font-size:10.5pt;">{{ CLIENT_1_CURRENT_PROVIDER }}</td></tr>{% endif %}
      {% if CLIENT_1_CURRENT_FUND %}<tr class="ks-row"><td class="ks-row-label" style="width:200px;">Current fund</td><td class="ks-row-val" style="text-align:left;font-size:10.5pt;">{{ CLIENT_1_CURRENT_FUND }}</td></tr>{% endif %}
      {% if CLIENT_1_CURRENT_BALANCE %}<tr class="ks-row"><td class="ks-row-label" style="width:200px;">Current balance</td><td class="ks-row-val" style="text-align:left;">{{ CLIENT_1_CURRENT_BALANCE }}</td></tr>{% endif %}
      {% if CLIENT_1_GOAL %}<tr class="ks-row"><td class="ks-row-label" style="width:200px;">Primary goal</td><td class="ks-row-val" style="text-align:left;font-size:10.5pt;">{{ CLIENT_1_GOAL }}</td></tr>{% endif %}
      {% if CLIENT_1_TIMEFRAME %}<tr class="ks-row"><td class="ks-row-label" style="width:200px;">Investment timeframe</td><td class="ks-row-val" style="text-align:left;font-size:10.5pt;">{{ CLIENT_1_TIMEFRAME }}</td></tr>{% endif %}
      <tr class="ks-row"><td class="ks-row-label" style="width:200px;">Risk profile outcome</td><td class="ks-row-val" style="text-align:left;font-size:10.5pt;">{{ CLIENT_1_RISK_PROFILE_OUTCOME }}</td></tr>
    </tbody>
  </table>
</div>

{% if CLIENT_1_OTHER_ASSETS_DEBTS %}
<div class="info-card">
  <h4>Other assets and debts</h4>
  <p class="body-text">{{ CLIENT_1_OTHER_ASSETS_DEBTS }}</p>
</div>
{% endif %}

{% if CLIENT_1_EMERGENCY_FUND %}
<div class="info-card">
  <h4>Emergency fund / liquidity</h4>
  <p class="body-text">{{ CLIENT_1_EMERGENCY_FUND }}</p>
  <p class="body-text" style="font-size:9pt;color:var(--muted);">Note: KiwiSaver funds are generally locked in until age 65 (with limited exceptions). You should maintain separate emergency savings outside of KiwiSaver.</p>
</div>
{% endif %}
</div>

<!-- ═══ SECTION 8 — KIWISAVER STRATEGY ═══ -->
<div class="section-block section-block-break">
<div class="header">
  <img class="logo" src="${LOGO_URL}" alt="Smiths"><span class="doc-label">Statement of Advice</span>
</div>

<div class="section-heading"><div class="num">8</div><h2>Your KiwiSaver Strategy</h2></div>
<p class="body-text">Before selecting a provider and fund, we consider the broader strategic decisions that will shape your KiwiSaver outcome.</p>

{{ STRATEGY_NARRATIVE }}

<div class="strategy-card">
  <h5>A. Contribution strategy</h5>
  <p>{% if CLIENT_1_RECOMMENDED_CONTRIB_RATE %}We recommend a contribution rate of <strong>{{ CLIENT_1_RECOMMENDED_CONTRIB_RATE }}</strong>.{% else %}Your current contribution rate of <strong>{{ CLIENT_1_EMPLOYEE_CONTRIB }}</strong> has been reviewed.{% endif %} Note that the default rate increases to 3.5% from 1 April 2026 and to 4% from 1 April 2028. If the increased rate creates cashflow difficulty, you can apply to Inland Revenue from 1 February 2026 to temporarily opt down (for up to 12 months).</p>
</div>

<div class="strategy-card">
  <h5>B. Government contribution maximisation</h5>
  <p>To receive the full government contribution of <strong>$260.72</strong>, you need to contribute at least <strong>$1,042.86</strong> of your own money each year (1 July to 30 June). {% if CLIENT_1_EMPLOYEE_CONTRIB %}At your current contribution rate and income, {% endif %}we recommend checking whether your annual contributions reach this threshold. If not, a voluntary top-up before 30 June can make a meaningful difference.</p>
</div>

<div class="strategy-card">
  <h5>C. PIR / tax administration</h5>
  <p>{% if CLIENT_1_PIR %}Your current PIR is <strong>{{ CLIENT_1_PIR }}</strong>.{% else %}We recommend confirming your Prescribed Investor Rate (PIR) with your provider.{% endif %} Choosing the correct PIR is important - if it is too high you overpay tax on your investment returns, and if too low you may face an end-of-year tax bill. We recommend reviewing your PIR annually, especially after any income changes.</p>
</div>

{% if CLIENT_1_FIRST_HOME_INTENTION %}
<div class="strategy-card">
  <h5>D. First home vs retirement priority</h5>
  <p>You have indicated an interest in purchasing your first home{% if CLIENT_1_FIRST_HOME_TIMEFRAME %} within approximately <strong>{{ CLIENT_1_FIRST_HOME_TIMEFRAME }}</strong>{% endif %}. This significantly affects fund selection because a shorter timeframe means your KiwiSaver is more exposed to sequence-of-returns risk. If you plan to withdraw for a first home within 1-3 years, a more conservative fund may be appropriate to protect your balance from short-term market downturns, even if a growth fund would be better for long-term retirement savings. At least $1,000 must remain in your account after a first-home withdrawal.</p>
</div>
{% endif %}
</div>

<!-- ═══ SECTION 9 — MARKET RESEARCH & PROVIDER SELECTION ═══ -->
<div class="section-block section-block-break">
<div class="header">
  <img class="logo" src="${LOGO_URL}" alt="Smiths"><span class="doc-label">Statement of Advice</span>
</div>

<div class="section-heading"><div class="num">9</div><h2>Market Research &amp; Provider Selection</h2></div>
<p class="body-text"><em>"How we surveyed the KiwiSaver market to arrive at our recommendation"</em></p>

<div class="info-card">
  <h4>Our research process</h4>
  <p class="body-text">In preparing this advice, we followed a structured research process to identify the most suitable KiwiSaver fund for your situation. While our advice is limited to our panel of providers (Booster, Milford, and Generate), we reference broader market data to ensure our recommendations are competitive.</p>

  <table class="research-funnel">
    <tbody>
      <tr><td class="funnel-stage">1. Universe</td><td class="funnel-desc">We considered the full NZ KiwiSaver market as listed by Inland Revenue, including default and non-default providers, to understand the competitive landscape.</td></tr>
      <tr><td class="funnel-stage">2. Data sources</td><td class="funnel-desc">Fund data sourced from: Companies Office Disclose Register (official PDS, fund updates, SIPO documents), Sorted Smart Investor comparison tool (uses Disclose Register data), provider websites and disclosure documents.</td></tr>
      <tr><td class="funnel-stage">3. Panel filter</td><td class="funnel-desc">From the broader market, we focused on our panel providers: Booster, Milford, and Generate. We selected funds matching your risk profile ({{ CLIENT_1_RISK_PROFILE_OUTCOME }}).</td></tr>
      <tr><td class="funnel-stage">4. Shortlist</td><td class="funnel-desc">We compared funds on: fees (total cost), investment approach and asset allocation, historical performance (with appropriate caveats), service model and member experience, alignment with your goals and values.</td></tr>
      <tr><td class="funnel-stage">5. Recommendation</td><td class="funnel-desc">The recommended fund was selected as the best overall fit based on the criteria above, weighted towards your specific situation, timeframe, and preferences.</td></tr>
    </tbody>
  </table>
</div>

<div class="callout-box"><strong>Note:</strong> Because our advice is panel-based (not independent across all providers), there may be funds from other providers that were not considered. If you would like a broader market comparison, we can discuss referral to an independent adviser who covers the full market.</div>
</div>

<!-- ═══ SECTION 10 — RECOMMENDATION ═══ -->
<div class="section-block section-block-break">
<div class="header">
  <img class="logo" src="${LOGO_URL}" alt="Smiths"><span class="doc-label">Statement of Advice</span>
</div>

<div class="section-heading"><div class="num">10</div><h2>Our Recommendation</h2></div>

{{ RECOMMENDATION_COMPARISON_BLOCKS }}

{{ FUND_DESCRIPTION_BLOCKS }}

<div class="warning-box"><strong>Timing:</strong> This recommendation should not be acted on after <strong>30 days</strong> from the date of this advice without prior consultation. Markets and personal circumstances change, and the suitability of this advice may be affected.</div>
</div>

<!-- ═══ SECTION 11 — FEES & COSTS ═══ -->
<div class="section-block section-block-break">
<div class="header">
  <img class="logo" src="${LOGO_URL}" alt="Smiths"><span class="doc-label">Statement of Advice</span>
</div>

<div class="section-heading"><div class="num">11</div><h2>Fees and Costs</h2></div>
<p class="body-text">All KiwiSaver funds charge fees, which are deducted from your investment balance. Fees reduce your returns and compound over time, so even small differences can have a meaningful impact on your long-term outcome.</p>
<p class="body-text">Fee information below is sourced directly from provider disclosure documents as at <strong>{{ DATA_AS_AT_DATE }}</strong>.</p>

{{ FEES_TABLE_BLOCKS }}
</div>

<!-- ═══ SECTION 12 — PERFORMANCE ═══ -->
<div class="section-block section-block-break">
<div class="header">
  <img class="logo" src="${LOGO_URL}" alt="Smiths"><span class="doc-label">Statement of Advice</span>
</div>

<div class="section-heading"><div class="num">12</div><h2>Fund Performance</h2></div>
<p class="body-text">Historical performance provides context about how a fund has performed through different market conditions. Returns shown are annualised (the average return per year over the period) and are calculated after fund fees but before tax.</p>

{{ PERFORMANCE_TABLE_BLOCKS }}
</div>

<!-- ═══ SECTION 13 — PROJECTIONS (only if data exists) ═══ -->
{% if HAS_PROJECTIONS %}
<div class="section-heading"><div class="num">13</div><h2>Projections</h2></div>

{% if PROJECTIONS_EXPLANATION_PARAGRAPH %}<p class="body-text">{{ PROJECTIONS_EXPLANATION_PARAGRAPH }}</p>{% endif %}

<div class="info-card">
  <h4>Projection Summary</h4>
  <table class="ks-compare">
    <tbody>
      {% if PROJECTION_TIMEFRAME %}<tr class="ks-row"><td class="ks-row-label" style="width:200px;">Timeframe</td><td class="ks-row-val" style="text-align:left;font-size:10.5pt;">{{ PROJECTION_TIMEFRAME }}</td></tr>{% endif %}
      {% if PROJECTION_BALANCE %}<tr class="ks-row"><td class="ks-row-label" style="width:200px;">Projected balance at retirement</td><td class="ks-row-val" style="text-align:left;">{{ PROJECTION_BALANCE }}</td></tr>{% endif %}
      {% if PROJECTION_WEEKLY_INCOME %}<tr class="ks-row"><td class="ks-row-label" style="width:200px;">Estimated weekly income</td><td class="ks-row-val" style="text-align:left;">{{ PROJECTION_WEEKLY_INCOME }}</td></tr>{% endif %}
      {% if PROJECTION_ASSUMPTIONS %}<tr class="ks-row"><td class="ks-row-label" style="width:200px;">Assumptions</td><td style="padding:11px 16px;font-size:9pt;color:var(--muted);line-height:1.5;">{{ PROJECTION_ASSUMPTIONS }}</td></tr>{% endif %}
    </tbody>
  </table>
</div>

<div class="warning-box"><strong>Important:</strong> Projections are estimates only. They are sensitive to market returns, fees, contributions, and time. Actual outcomes will differ. These figures are provided for illustration purposes and should not be relied upon as a guarantee.</div>
{% endif %}

<!-- ═══ SECTION 14 — IMPLEMENTATION ═══ -->
<div class="section-block section-block-break">
<div class="header">
  <img class="logo" src="${LOGO_URL}" alt="Smiths"><span class="doc-label">Statement of Advice</span>
</div>

<div class="section-heading"><div class="num">14</div><h2>Implementation Plan</h2></div>

<p class="body-text">To action the recommendation in this document, the following steps are required. We will guide you through each step.</p>

<div class="info-card">
  <h4>Implementation checklist</h4>
  <ul class="impl-checklist">
    <li><strong>Sign this Statement of Advice</strong> - confirm you accept the recommendation in Section 20</li>
    <li><strong>Complete identity verification (KYC)</strong> with the new provider - we will assist with this</li>
    <li><strong>Submit transfer/switch request</strong> to the new provider (online or paper application)</li>
    <li><strong>Confirm fund selection</strong> - ensure you are placed in the correct fund (not the default)</li>
    <li><strong>Confirm your PIR</strong> with the new provider{% if CLIENT_1_PIR %} (your PIR: {{ CLIENT_1_PIR }}){% endif %}</li>
    <li><strong>Confirm contribution rate</strong> with your employer{% if CLIENT_1_RECOMMENDED_CONTRIB_RATE %} - change to {{ CLIENT_1_RECOMMENDED_CONTRIB_RATE }} if applicable{% endif %}</li>
    <li><strong>Update beneficiary nominations</strong> if applicable (check with new provider)</li>
    <li><strong>Confirm transfer completed</strong> - typically takes 10-15 business days. We will follow up</li>
  </ul>
</div>

<div class="callout-box"><strong>During the transfer:</strong> Your funds will temporarily be held in cash while being transferred between providers. This is standard and typically takes 10-15 business days. Market movements during this period will not affect your transferring balance.</div>

<div class="info-card">
  <h4>What to watch for after switching</h4>
  <ul class="styled-list" style="margin:0;">
    <li><strong>Employer contributions landing correctly</strong> - check your first payslip after the transfer to confirm your employer contributions are going to the new provider</li>
    <li><strong>PIR correctly applied</strong> - confirm your PIR is correct on your new provider's member portal or first statement</li>
    <li><strong>Fee line items</strong> - review your first statement to ensure fees match what was disclosed</li>
    <li><strong>Fund choice not reset to default</strong> - some providers may initially place you in their default fund during onboarding. Confirm your fund selection is correct</li>
    <li><strong>Government contribution</strong> - if you are near the end of the financial year (approaching 30 June), check whether you need a voluntary top-up to maximise your government contribution</li>
  </ul>
</div>
</div>

<!-- ═══ SECTION 15 — KEY RISKS ═══ -->
<div class="section-block section-block-break">
<div class="header">
  <img class="logo" src="${LOGO_URL}" alt="Smiths"><span class="doc-label">Statement of Advice</span>
</div>

<div class="section-heading"><div class="num">15</div><h2>Key Risks and Considerations</h2></div>

<p class="body-text">All investments carry risk. It is important you understand the following before acting on this advice:</p>

<ul class="styled-list">
  <li><strong>Market risk:</strong> KiwiSaver investments can go up and down in value. Growth and aggressive funds will experience larger short-term fluctuations than conservative or defensive funds.</li>
  <li><strong>Timing risk:</strong> Switching funds during periods of market volatility can crystallise losses. We recommend making changes based on long-term strategy, not short-term market conditions.</li>
  <li><strong>Inflation risk:</strong> Conservative funds may not keep pace with inflation over long periods, which means your purchasing power could decline in real terms.</li>
  <li><strong>Fee impact:</strong> Fees compound over time. Even a 0.5% difference in annual fees can result in a materially different retirement balance over 20-30 years.</li>
  <li><strong>Liquidity risk:</strong> KiwiSaver funds are generally locked in until age 65 (with limited exceptions). You should maintain separate emergency savings outside of KiwiSaver.</li>
  <li><strong>Provider risk:</strong> While KiwiSaver funds are held in trust (separate from the provider's own assets), there is still a small risk of operational failure or regulatory action.</li>
  <li><strong>Basis of advice:</strong> This advice is based on the information you provided at the time of your meeting. If your circumstances change, please contact us for a review.</li>
</ul>
</div>

<!-- ═══ SECTION 16 — ONGOING SERVICE & REVIEW ═══ -->
<div class="section-block section-block-break">
<div class="header">
  <img class="logo" src="${LOGO_URL}" alt="Smiths"><span class="doc-label">Statement of Advice</span>
</div>

<div class="section-heading"><div class="num">16</div><h2>Ongoing Service &amp; Review</h2></div>
<p class="body-text">KiwiSaver is a long-term investment. Your circumstances, the market, and the KiwiSaver landscape will change over time. Regular reviews ensure your strategy stays on track.</p>

<div class="info-card">
  <h4>Our review commitment</h4>
  <div class="review-schedule">
    <div class="review-card">
      <h5>Annual review</h5>
      <p>We offer an annual review of your KiwiSaver position. This includes:</p>
      <ul>
        <li>Fund suitability check against any life changes</li>
        <li>Fee and performance review</li>
        <li>Contribution rate adequacy</li>
        <li>PIR confirmation</li>
        <li>Government contribution check</li>
      </ul>
    </div>
    <div class="review-card">
      <h5>Trigger events</h5>
      <p>Contact us for a review if:</p>
      <ul>
        <li>Your income changes significantly</li>
        <li>You change jobs or employment status</li>
        <li>Your investment timeframe changes</li>
        <li>You plan to buy your first home</li>
        <li>Major life event (marriage, children, inheritance)</li>
        <li>You are approaching age 65</li>
      </ul>
    </div>
  </div>
</div>

<p class="body-text">This engagement is ongoing unless you notify us otherwise. There is no charge for annual reviews as part of this service.</p>
</div>

<!-- ═══ SECTION 17 — FEES, COMMISSION & CONFLICTS ═══ -->
<div class="section-block section-block-break">
<div class="header">
  <img class="logo" src="${LOGO_URL}" alt="Smiths"><span class="doc-label">Statement of Advice</span>
</div>

<div class="section-heading"><div class="num">17</div><h2>Adviser Fees, Commission &amp; Conflicts of Interest</h2></div>

<p class="body-text"><strong>There is no direct fee charged to you for this KiwiSaver advice.</strong></p>
<p class="body-text">Smiths Insurance &amp; KiwiSaver may receive ongoing trail commission from the recommended KiwiSaver provider. Commission is typically a small percentage of your fund balance (approximately 0.20-0.30% p.a.) and is paid by the provider - it is not deducted from your account in addition to the stated fees.</p>

<div class="info-card">
  <h4>Commission example</h4>
  <table class="ks-compare">
    <tbody>
      <tr class="ks-row"><td class="ks-row-label" style="width:220px;">Fund balance</td><td class="ks-row-val" style="text-align:left;font-size:10pt;">$100,000</td></tr>
      <tr class="ks-row"><td class="ks-row-label" style="width:220px;">Estimated trail commission (0.25%)</td><td class="ks-row-val" style="text-align:left;font-size:10pt;">Approx. $250 per year</td></tr>
      <tr class="ks-row"><td class="ks-row-label" style="width:220px;">Paid by</td><td class="ks-row-val" style="text-align:left;font-size:10pt;">The provider (not deducted from your account)</td></tr>
    </tbody>
  </table>
</div>

<p class="body-text">We manage potential conflicts of interest by:</p>
<ul class="styled-list">
  <li>Following a documented advice process that ensures recommendations are based on your needs</li>
  <li>Comparing products across our full panel before making recommendations</li>
  <li>Disclosing any material conflict that could reasonably be seen as influencing advice</li>
  <li>Maintaining a conflicts register and completing annual compliance training</li>
</ul>
<p class="body-text">We confirm that no conflict of interest has influenced the recommendation in this document.</p>
</div>

<!-- ═══ SECTION 18 — COMPLAINTS & PRIVACY ═══ -->
<div class="section-block section-block-break">
<div class="header">
  <img class="logo" src="${LOGO_URL}" alt="Smiths"><span class="doc-label">Statement of Advice</span>
</div>

<div class="section-heading"><div class="num">18</div><h2>Complaints, Disputes &amp; Privacy</h2></div>

<p class="body-text"><strong>Internal complaints:</strong> If you have a concern about our service, please contact us directly:</p>
<p class="body-text" style="margin-left:16px;">Henry Smith: henry@smiths.net.nz | 027 344 5255<br>Craig Smith: craig@smiths.net.nz | 0274 293 939<br>Post: PO Box 8267, Riccarton, Christchurch</p>

<p class="body-text"><strong>External disputes:</strong> If we are unable to resolve your complaint, you can refer the matter to our external dispute resolution scheme:</p>
<p class="body-text" style="margin-left:16px;"><strong>Financial Dispute Resolution Service (FDRS)</strong><br>Website: fdrs.org.nz | Email: enquiries@fdrs.org.nz<br>Freepost 231075, PO Box 2272, Wellington 6140</p>

<p class="body-text"><strong>Privacy:</strong> We collect personal information to provide advice and arrange financial products. Information may be shared with product providers, compliance partners, and service providers as required. Records are retained for a minimum of seven years in accordance with regulatory requirements. You may request access to or correction of your information at any time.</p>
</div>

<!-- ═══ SECTION 19 — APPENDICES & REFERENCES ═══ -->
<div class="section-block section-block-break">
<div class="header">
  <img class="logo" src="${LOGO_URL}" alt="Smiths"><span class="doc-label">Statement of Advice</span>
</div>

<div class="section-heading"><div class="num">19</div><h2>Appendices &amp; References</h2></div>
<p class="body-text">The following sources and references were used in preparing this advice. We encourage you to review these documents for additional information.</p>

<div class="info-card">
  <h4>A. Regulatory framework</h4>
  <ul class="source-list">
    <li><span class="source-name">Financial Advice Code 2025</span> - Code of Professional Conduct for Financial Advice Services (in force from 1 November 2025) <span class="source-url">fma.govt.nz</span></li>
    <li><span class="source-name">Financial Markets Conduct Act 2013</span> - Governing legislation for financial advice in New Zealand</li>
    <li><span class="source-name">KiwiSaver Act 2006</span> - Primary legislation governing KiwiSaver schemes</li>
  </ul>
</div>

<div class="info-card">
  <h4>B. KiwiSaver rules and guidance</h4>
  <ul class="source-list">
    <li><span class="source-name">Employee contribution options</span> - Inland Revenue <span class="source-url">ird.govt.nz</span></li>
    <li><span class="source-name">Government contribution rules</span> - Maximum $260.72 p.a. (25c per $1 contributed, minimum $1,042.86 personal contribution) <span class="source-url">ird.govt.nz</span></li>
    <li><span class="source-name">KiwiSaver changes overview</span> - Default rate changes (3% to 3.5% from 1 April 2026, to 4% from 1 April 2028), opt-down mechanism from 1 February 2026 <span class="source-url">ird.govt.nz</span></li>
    <li><span class="source-name">First-home withdrawal guidance</span> - IRD and Kainga Ora eligibility criteria <span class="source-url">ird.govt.nz / kaingaora.govt.nz</span></li>
    <li><span class="source-name">PIR rates</span> - Prescribed Investor Rate thresholds (10.5%, 17.5%, 28%) <span class="source-url">ird.govt.nz</span></li>
  </ul>
</div>

<div class="info-card">
  <h4>C. Market research sources</h4>
  <ul class="source-list">
    <li><span class="source-name">Companies Office Disclose Register</span> - Official repository for PDS, fund updates, SIPO, and OMI documents <span class="source-url">disclose-register.companiesoffice.govt.nz</span></li>
    <li><span class="source-name">Sorted Smart Investor</span> - Fund comparison tool using Disclose Register data <span class="source-url">smartinvestor.sorted.org.nz</span></li>
    <li><span class="source-name">Sorted KiwiSaver Fund Finder</span> - Risk/fees/services/performance methodology using Disclose data <span class="source-url">sorted.org.nz</span></li>
  </ul>
</div>

<div class="info-card">
  <h4>D. Data timestamps</h4>
  <p class="body-text">Fund performance and fee data in this document is sourced from provider disclosure documents and comparison tools as at <strong>{{ DATA_AS_AT_DATE }}</strong>. Product Disclosure Statements (PDS) and fund updates referenced are the most recent versions available at the date of this advice.</p>
</div>
</div>

<!-- ═══ SECTION 20 — SIGN-OFF ═══ -->
<div class="section-block section-block-break">
<div class="header">
  <img class="logo" src="${LOGO_URL}" alt="Smiths"><span class="doc-label">Statement of Advice</span>
</div>

<div class="section-heading"><div class="num">20</div><h2>Declaration &amp; Sign-Off</h2></div>

<div class="info-card" style="background:var(--white);">
  <p class="body-text">{{ DECLARATION_INTRO }}</p>
  <div class="checkbox-group" style="margin:14px 0;">
    <div class="checkbox-item">
      <span class="checkbox-box"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="3" d="M20 6L9 17l-5-5"/></svg></span>
      <span class="checkbox-label"><strong>ACCEPT</strong> the recommendation(s) in this document</span>
    </div>
    <div class="checkbox-item">
      <span class="checkbox-box"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="3" d="M20 6L9 17l-5-5"/></svg></span>
      <span class="checkbox-label"><strong>DECLINE</strong> the recommendation(s) in this document</span>
    </div>
    <div class="checkbox-item">
      <span class="checkbox-box"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="3" d="M20 6L9 17l-5-5"/></svg></span>
      <span class="checkbox-label"><strong>MODIFY</strong> the recommendation(s) (see notes below)</span>
    </div>
  </div>
</div>

<div class="sub-heading">Modification Notes (if applicable):</div>
<div class="placeholder-block" style="min-height:56px;">{{ MODIFICATION_NOTES_HTML }}</div>

{{ SIGNATURE_BLOCKS }}

<div class="footer">
  <span>Statement of Advice | Confidential</span>
  <span>Craig Smith Business Services Limited | FAP Licence #712931 | <a href="https://www.smiths.net.nz">www.smiths.net.nz</a></span>
</div>
</div>

<!-- ═══ BACK COVER ═══ -->
<div class="back-cover">
  <div class="back-cover-top">
    <img class="back-logo" src="/images/coverlogo.jpg" alt="Smiths Insurance &amp; KiwiSaver">
    <div class="back-rule"></div>
  </div>

  <div class="back-cover-bottom">
    <h3>Smiths Insurance &amp; KiwiSaver</h3>
    <p class="muted">Practical advice. Clear documentation. Ongoing support when it matters.</p>
    <div class="contact">
      <p><strong>Craig Smith</strong> - Financial Adviser | FSP #33042</p>
      <p>craig@smiths.net.nz | 0274 293 939</p>
      <p>FAP Licence #712931</p>
      <p><a href="https://www.smiths.net.nz">www.smiths.net.nz</a></p>
    </div>
    <p class="muted" style="margin-top:18px;">Past performance is not a reliable indicator of future performance.</p>
  </div>
</div>

</div>
</body>
</html>`;
}

// ══════════════════════════════════════════════════════════════
// SOE DEFAULT (placeholder — user will provide template later)
// ══════════════════════════════════════════════════════════════
const SOE_DEFAULT = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Scope of Engagement — Smiths</title>
<!-- Fonts embedded locally via @font-face in CSS -->
<style>${SHARED_CSS}</style>
</head><body>
<div class="accent-bar"></div>
<div class="page">
  <div class="header"><img class="logo" src="${LOGO_URL}" alt="Smiths"><span class="doc-label">Scope of Engagement</span></div>
  <div class="section-heading" style="margin-top:32px;"><div class="num">1</div><h2>Scope of Services</h2></div>
  <div class="info-card">{{ SECTION_SCOPE }}</div>
  <div class="section-heading"><div class="num">2</div><h2>Out of Scope</h2></div>
  <div class="info-card">{{ SECTION_OUT_OF_SCOPE }}</div>
  <div class="section-heading"><div class="num">3</div><h2>Client Responsibilities</h2></div>
  <div class="info-card">{{ SECTION_RESPONSIBILITIES }}</div>
  <div class="footer"><span>Scope of Engagement | Confidential</span><span>Craig Smith Business Services Limited | FAP License #712931 | <a href="https://www.smiths.net.nz">www.smiths.net.nz</a></span></div>
</div>
</body></html>`;
