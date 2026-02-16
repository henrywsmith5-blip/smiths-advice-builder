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
.cover-logo-overlay{position:absolute;bottom:-32px;left:50%;transform:translateX(-50%);z-index:10;background:var(--white);padding:16px 30px;box-shadow:0 2px 16px rgba(0,0,0,0.07);}
.cover-logo-overlay img{height:44px;width:auto;display:block;}
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
.checkbox-list{list-style:none;padding:0;margin:8px 0 14px 4px;}
.checkbox-list li{padding:4px 0 4px 30px;position:relative;line-height:1.5;font-size:10pt;}
.checkbox-list li::before{content:'';position:absolute;left:0;top:6px;width:15px;height:15px;border:1.5px solid var(--bronze);background:var(--white);}
.checkbox-list li.checked::before{content:'\\2713';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--bronze);background:var(--white);}
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
@media print{body{background:white;}.page{max-width:none;padding:0;}.cover-hero{margin:0;width:100%;height:400px;}.cover-page{page-break-after:always;}h2,h3,h4{page-break-after:avoid;}.info-card,.data-table,.dual-cover-wrapper,.single-cover-wrapper,.premium-card,.sig-box,.pros-cons-grid{page-break-inside:avoid;}}
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

<!-- ═══ SECTION 1 — SCOPE ═══ -->
<div class="header page-break">
  <img class="logo" src="${LOGO_URL}" alt="Smiths"><span class="doc-label">${titleShort}</span>
</div>

<div class="section-heading"><div class="num">1</div><h2>Scope of Advice You Are Requesting</h2></div>
<p class="body-text"><em>"How would you like us to help you?"</em></p>
<p class="body-text">The following are the areas of insurance advice that you are requesting. Unless noted below, discussions and advice will be limited to assisting you and your family's financial security in the event of:</p>

<div class="sub-heading"><span class="placeholder">{{ CLIENT_A_NAME }}</span></div>
<ul class="checkbox-list">
  <li{% if LIFE_INCLUDED %} class="checked"{% endif %}>Untimely death (Life Insurance)</li>
  <li{% if TRAUMA_INCLUDED %} class="checked"{% endif %}>Suffering a serious critical illness or injury (Trauma Insurance)</li>
  <li{% if TPD_INCLUDED %} class="checked"{% endif %}>Suffering a permanent disability (Total &amp; Permanent Disability Insurance)</li>
  <li{% if IP_INCLUDED or MP_INCLUDED or INCOME_MP_INCLUDED %} class="checked"{% endif %}>Loss of income due to sickness or injury (Income Protection Insurance)</li>
  <li{% if MP_INCLUDED or INCOME_MP_INCLUDED %} class="checked"{% endif %}>Loss of income due to redundancy (Added benefit to Income/Mortgage Protection)</li>
  <li{% if HEALTH_INCLUDED %} class="checked"{% endif %}>Requiring hospital or specialist treatment (Health Insurance)</li>
  <li>This is a limited advice engagement process</li>
</ul>

{% if IS_PARTNER %}
<div class="sub-heading"><span class="placeholder">{{ CLIENT_B_NAME }}</span></div>
<ul class="checkbox-list">
  <li{% if LIFE_INCLUDED %} class="checked"{% endif %}>Untimely death (Life Insurance)</li>
  <li{% if TRAUMA_INCLUDED %} class="checked"{% endif %}>Suffering a serious critical illness or injury (Trauma Insurance)</li>
  <li{% if TPD_INCLUDED %} class="checked"{% endif %}>Suffering a permanent disability (Total &amp; Permanent Disability Insurance)</li>
  <li{% if IP_INCLUDED or MP_INCLUDED or INCOME_MP_INCLUDED %} class="checked"{% endif %}>Loss of income due to sickness or injury (Income Protection Insurance)</li>
  <li{% if MP_INCLUDED or INCOME_MP_INCLUDED %} class="checked"{% endif %}>Loss of income due to redundancy (Added benefit to Income/Mortgage Protection)</li>
  <li{% if HEALTH_INCLUDED %} class="checked"{% endif %}>Requiring hospital or specialist treatment (Health Insurance)</li>
  <li>This is a limited advice engagement process</li>
</ul>
{% endif %}

<div class="sub-heading" style="border-bottom:1.5px solid var(--bronze); padding-bottom:4px;">Special Instructions / Objectives / Comments</div>
<div class="placeholder-block">{{ SPECIAL_INSTRUCTIONS }}</div>

<!-- ═══ SECTION 2 — NATURE AND SCOPE ═══ -->
<div class="header page-break">
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

<!-- ═══ SECTION 3 — OUT OF SCOPE ═══ -->
<div class="section-heading"><div class="num">3</div><h2>Out of Scope — What We Do Not Provide</h2></div>
<p class="body-text">The following services are explicitly outside the scope of this engagement:</p>
<ul class="styled-list">
  <li>Fire and general insurance (home, contents, vehicle) — referred to Aon Insurance Brokers</li>
  <li>Mortgages, lending, or budgeting services</li>
  <li>Tax advice, legal advice, or accounting services</li>
  <li>Estate planning, trust structuring, or business succession planning</li>
</ul>
<p class="body-text">If you require advice in these areas, we recommend seeking specialist assistance. Referrals may be provided on request.</p>

<!-- ═══ SECTION 4 — CLIENT RESPONSIBILITIES ═══ -->
<div class="section-heading"><div class="num">4</div><h2>Information We Rely On — Client Responsibilities</h2></div>
<p class="body-text">Our advice is based on information you provide during the Fact Find process. You have a responsibility to:</p>
<ul class="styled-list">
  <li>Provide complete and accurate information about your circumstances, health, income, and financial position</li>
  <li>Disclose all information that could influence an insurer's decision — this is your Duty of Disclosure under the Insurance Contracts Act</li>
  <li>Inform us promptly if your circumstances change (e.g., health, occupation, income, smoking status)</li>
  <li>Read and confirm key documents including policy wordings, quotes, application forms, and disclosures</li>
</ul>

<!-- ═══ SECTION 5 — FEES ═══ -->
<div class="section-heading"><div class="num">5</div><h2>Fees, Commission, and Other Payments</h2></div>
<p class="body-text">There is no fee charged to you for advisory services.</p>
<p class="body-text">Smiths Insurance &amp; KiwiSaver receives commission from insurers when policies are placed. Commission typically includes an upfront payment (based on first-year premium) and ongoing trail commission (based on renewal premiums). Commission varies by provider and product — details are in the Disclosure Statement.</p>

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

<!-- CLIENT A -->
<div class="client-divider"><span>{{ CLIENT_A_NAME }}</span></div>
<div class="sub-heading">Agreed Covers — <span class="placeholder">{{ CLIENT_A_NAME }}</span></div>

{% if HAS_EXISTING_COVER %}
<p class="body-text"><em>{{ CLIENT_A_ADVICE_TYPE_LABEL }}</em></p>
<div class="dual-cover-wrapper">
  <table>
    <thead>
      <tr><th class="header-proposed" colspan="2">{% if CLIENT_A_NEW_INSURER_LOGO %}<img class="insurer-logo" src="{{ CLIENT_A_NEW_INSURER_LOGO }}" alt="{{ CLIENT_A_NEW_INSURER }}"> {% endif %}Proposed Cover</th><th class="spacer-col"></th><th class="header-existing" colspan="2">{% if CLIENT_A_EXISTING_INSURER_LOGO %}<img class="insurer-logo" src="{{ CLIENT_A_EXISTING_INSURER_LOGO }}" alt="{{ CLIENT_A_EXISTING_INSURER }}"> {% endif %}Existing Cover</th></tr>
      <tr><th style="background:var(--white);color:var(--dark);">Cover Type</th><th style="background:var(--white);color:var(--dark);text-align:right;">Sum Insured</th><th class="spacer-col"></th><th style="background:var(--white);color:var(--dark);">Cover Type</th><th style="background:var(--white);color:var(--dark);text-align:right;">Sum Insured</th></tr>
    </thead>
    <tbody>
      <tr><td>Life</td><td style="text-align:right;">{{ CLIENT_A_NEW_LIFE }}</td><td class="spacer-col"></td><td>Life</td><td style="text-align:right;">{{ CLIENT_A_OLD_LIFE }}</td></tr>
      <tr><td>Progressive Care / Trauma</td><td style="text-align:right;">{{ CLIENT_A_NEW_TRAUMA }}</td><td class="spacer-col"></td><td>Trauma</td><td style="text-align:right;">{{ CLIENT_A_OLD_TRAUMA }}</td></tr>
      <tr><td>T.P.D.</td><td style="text-align:right;">{{ CLIENT_A_NEW_TPD }}</td><td class="spacer-col"></td><td>T.P.D.</td><td style="text-align:right;">{{ CLIENT_A_OLD_TPD }}</td></tr>
      <tr><td>Income Protection</td><td style="text-align:right;">{{ CLIENT_A_NEW_IP }}</td><td class="spacer-col"></td><td>Income Protection</td><td style="text-align:right;">{{ CLIENT_A_OLD_IP }}</td></tr>
      <tr><td>Mortgage Protection</td><td style="text-align:right;">{{ CLIENT_A_NEW_MP }}</td><td class="spacer-col"></td><td>Mortgage Protection</td><td style="text-align:right;">{{ CLIENT_A_OLD_MP }}</td></tr>
      <tr><td>Accidental Injury</td><td style="text-align:right;">{{ CLIENT_A_NEW_AIC }}</td><td class="spacer-col"></td><td>Accidental Injury</td><td style="text-align:right;">{{ CLIENT_A_OLD_AIC }}</td></tr>
      <tr><td>Premium Cover</td><td style="text-align:right;">{{ CLIENT_A_NEW_PREMIUM_COVER }}</td><td class="spacer-col"></td><td>Premium Cover</td><td style="text-align:right;">{{ CLIENT_A_OLD_PREMIUM_COVER }}</td></tr>
    </tbody>
  </table>
</div>
{% else %}
<p class="body-text"><em>Recommended new cover</em></p>
<div class="single-cover-wrapper">
  <div class="side-header">{% if CLIENT_A_NEW_INSURER_LOGO %}<img class="insurer-logo" src="{{ CLIENT_A_NEW_INSURER_LOGO }}" alt="{{ CLIENT_A_NEW_INSURER }}"> {% endif %}Recommended Cover</div>
  <table>
    <tr><th>Cover Type</th><th style="text-align:right;">Sum Insured</th></tr>
    <tr><td>Life</td><td style="text-align:right;">{{ CLIENT_A_NEW_LIFE }}</td></tr>
    <tr><td>Progressive Care / Trauma</td><td style="text-align:right;">{{ CLIENT_A_NEW_TRAUMA }}</td></tr>
    <tr><td>T.P.D.</td><td style="text-align:right;">{{ CLIENT_A_NEW_TPD }}</td></tr>
    <tr><td>Income Protection</td><td style="text-align:right;">{{ CLIENT_A_NEW_IP }}</td></tr>
    <tr><td>Mortgage Protection</td><td style="text-align:right;">{{ CLIENT_A_NEW_MP }}</td></tr>
    <tr><td>Accidental Injury</td><td style="text-align:right;">{{ CLIENT_A_NEW_AIC }}</td></tr>
    <tr><td>Premium Cover</td><td style="text-align:right;">{{ CLIENT_A_NEW_PREMIUM_COVER }}</td></tr>
  </table>
</div>
{% endif %}

{% if IS_PARTNER %}
<!-- CLIENT B -->
<div class="client-divider"><span>{{ CLIENT_B_NAME }}</span></div>
<div class="sub-heading">Agreed Covers — <span class="placeholder">{{ CLIENT_B_NAME }}</span></div>

{% if HAS_EXISTING_COVER %}
<p class="body-text"><em>{{ CLIENT_B_ADVICE_TYPE_LABEL }}</em></p>
<div class="dual-cover-wrapper">
  <table>
    <thead>
      <tr><th class="header-proposed" colspan="2">{% if CLIENT_B_NEW_INSURER_LOGO %}<img class="insurer-logo" src="{{ CLIENT_B_NEW_INSURER_LOGO }}" alt="{{ CLIENT_B_NEW_INSURER }}"> {% endif %}Proposed Cover</th><th class="spacer-col"></th><th class="header-existing" colspan="2">{% if CLIENT_B_EXISTING_INSURER_LOGO %}<img class="insurer-logo" src="{{ CLIENT_B_EXISTING_INSURER_LOGO }}" alt="{{ CLIENT_B_EXISTING_INSURER }}"> {% endif %}Existing Cover</th></tr>
      <tr><th style="background:var(--white);color:var(--dark);">Cover Type</th><th style="background:var(--white);color:var(--dark);text-align:right;">Sum Insured</th><th class="spacer-col"></th><th style="background:var(--white);color:var(--dark);">Cover Type</th><th style="background:var(--white);color:var(--dark);text-align:right;">Sum Insured</th></tr>
    </thead>
    <tbody>
      <tr><td>Life</td><td style="text-align:right;">{{ CLIENT_B_NEW_LIFE }}</td><td class="spacer-col"></td><td>Life</td><td style="text-align:right;">{{ CLIENT_B_OLD_LIFE }}</td></tr>
      <tr><td>Progressive Care / Trauma</td><td style="text-align:right;">{{ CLIENT_B_NEW_TRAUMA }}</td><td class="spacer-col"></td><td>Trauma</td><td style="text-align:right;">{{ CLIENT_B_OLD_TRAUMA }}</td></tr>
      <tr><td>T.P.D.</td><td style="text-align:right;">{{ CLIENT_B_NEW_TPD }}</td><td class="spacer-col"></td><td>T.P.D.</td><td style="text-align:right;">{{ CLIENT_B_OLD_TPD }}</td></tr>
      <tr><td>Income Protection</td><td style="text-align:right;">{{ CLIENT_B_NEW_IP }}</td><td class="spacer-col"></td><td>Income Protection</td><td style="text-align:right;">{{ CLIENT_B_OLD_IP }}</td></tr>
      <tr><td>Mortgage Protection</td><td style="text-align:right;">{{ CLIENT_B_NEW_MP }}</td><td class="spacer-col"></td><td>Mortgage Protection</td><td style="text-align:right;">{{ CLIENT_B_OLD_MP }}</td></tr>
      <tr><td>Accidental Injury</td><td style="text-align:right;">{{ CLIENT_B_NEW_AIC }}</td><td class="spacer-col"></td><td>Accidental Injury</td><td style="text-align:right;">{{ CLIENT_B_OLD_AIC }}</td></tr>
      <tr><td>Premium Cover</td><td style="text-align:right;">{{ CLIENT_B_NEW_PREMIUM_COVER }}</td><td class="spacer-col"></td><td>Premium Cover</td><td style="text-align:right;">{{ CLIENT_B_OLD_PREMIUM_COVER }}</td></tr>
    </tbody>
  </table>
</div>
{% else %}
<p class="body-text"><em>Recommended new cover</em></p>
<div class="single-cover-wrapper">
  <div class="side-header">{% if CLIENT_B_NEW_INSURER_LOGO %}<img class="insurer-logo" src="{{ CLIENT_B_NEW_INSURER_LOGO }}" alt="{{ CLIENT_B_NEW_INSURER }}"> {% endif %}Recommended Cover</div>
  <table>
    <tr><th>Cover Type</th><th style="text-align:right;">Sum Insured</th></tr>
    <tr><td>Life</td><td style="text-align:right;">{{ CLIENT_B_NEW_LIFE }}</td></tr>
    <tr><td>Progressive Care / Trauma</td><td style="text-align:right;">{{ CLIENT_B_NEW_TRAUMA }}</td></tr>
    <tr><td>T.P.D.</td><td style="text-align:right;">{{ CLIENT_B_NEW_TPD }}</td></tr>
    <tr><td>Income Protection</td><td style="text-align:right;">{{ CLIENT_B_NEW_IP }}</td></tr>
    <tr><td>Mortgage Protection</td><td style="text-align:right;">{{ CLIENT_B_NEW_MP }}</td></tr>
    <tr><td>Accidental Injury</td><td style="text-align:right;">{{ CLIENT_B_NEW_AIC }}</td></tr>
    <tr><td>Premium Cover</td><td style="text-align:right;">{{ CLIENT_B_NEW_PREMIUM_COVER }}</td></tr>
  </table>
</div>
{% endif %}
{% endif %}

<!-- ═══ SECTION 8 — PREMIUM SUMMARY ═══ -->
<div class="header page-break">
  <img class="logo" src="${LOGO_URL}" alt="Smiths"><span class="doc-label">${titleShort}</span>
</div>

<div class="section-heading"><div class="num">8</div><h2>Premium Summary</h2></div>

<div class="premium-card">
  {% if HAS_EXISTING_COVER %}
  <div class="premium-grid">
    <div class="premium-cell"><div class="p-label">Existing Premium</div><div class="p-amount">{{ OLD_PREMIUM }}</div><div class="p-freq">{{ PREMIUM_FREQUENCY }}</div></div>
    <div class="premium-cell"><div class="p-label">New Premium</div><div class="p-amount">{{ NEW_PREMIUM }}</div><div class="p-freq">{{ PREMIUM_FREQUENCY }}</div></div>
  </div>
  {% else %}
  <div class="premium-grid single-row">
    <div class="premium-cell"><div class="p-label">Recommended Combined Premium</div><div class="p-amount">{{ NEW_PREMIUM }}</div><div class="p-freq">{{ PREMIUM_FREQUENCY }}</div></div>
  </div>
  {% endif %}
</div>

<!-- ═══ SECTION 9 — MIGRATION ANALYSIS (existing cover only) ═══ -->
{% if HAS_EXISTING_COVER %}
<div class="section-heading"><div class="num">9</div><h2>Migration Analysis — Pros &amp; Cons</h2></div>
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
  <li>Claims assistance — guidance, documentation support, and liaison with insurers</li>
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
<ul class="checkbox-list" style="margin:16px 0 16px 12px;">
  <li>You have not received therapy or treatment since completing the application form</li>
  <li>You are not currently receiving treatment not already disclosed</li>
  <li>There have not been any changes in your health, occupation, or pastimes</li>
  <li>I can confirm that I provided all the answers myself</li>
  <li>The adviser explained any additional exclusions applicable to this policy</li>
  <li>The adviser explained the payment dates and premium amounts</li>
  <li>The adviser explained the risk of non-disclosure or misstatement</li>
  <li>The adviser explained the difference between my new and previous insurance policy</li>
</ul>
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
  <ul class="checkbox-list" style="margin:14px 0;">
    <li><strong>ACCEPT</strong> the sign-off document</li>
    <li><strong>DECLINE</strong> the sign-off document</li>
    <li><strong>MODIFY</strong> the sign-off document (see notes below)</li>
  </ul>
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
