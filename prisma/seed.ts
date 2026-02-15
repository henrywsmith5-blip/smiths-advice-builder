import { PrismaClient, DocType, ClientType } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Seed users
  const users = [
    {
      email: process.env.SEED_USER_1_EMAIL || "henry@smiths.net.nz",
      password: process.env.SEED_USER_1_PASSWORD || "changeme123",
    },
    {
      email: process.env.SEED_USER_2_EMAIL || "craig@smiths.net.nz",
      password: process.env.SEED_USER_2_PASSWORD || "changeme123",
    },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash: hash },
      create: { email: u.email, passwordHash: hash },
    });
    console.log(`  Seeded user: ${u.email}`);
  }

  // Seed default templates
  const defaultTemplates: Array<{
    docType: DocType;
    clientType: ClientType | null;
    name: string;
    html: string;
    css: string;
  }> = [
    {
      docType: DocType.SOA,
      clientType: ClientType.INDIVIDUAL,
      name: "SOA - Individual (Default)",
      html: SOA_INDIVIDUAL_HTML,
      css: "",
    },
    {
      docType: DocType.SOA,
      clientType: ClientType.PARTNER,
      name: "SOA - Partner (Default)",
      html: SOA_PARTNER_HTML,
      css: "",
    },
    {
      docType: DocType.ROA,
      clientType: ClientType.INDIVIDUAL,
      name: "ROA - Individual (Default)",
      html: ROA_PLACEHOLDER_HTML,
      css: "",
    },
    {
      docType: DocType.ROA,
      clientType: ClientType.PARTNER,
      name: "ROA - Partner (Default)",
      html: ROA_PLACEHOLDER_HTML,
      css: "",
    },
    {
      docType: DocType.SOE,
      clientType: null,
      name: "SOE (Default)",
      html: SOE_PLACEHOLDER_HTML,
      css: "",
    },
  ];

  for (const t of defaultTemplates) {
    const existing = await prisma.template.findFirst({
      where: { docType: t.docType, clientType: t.clientType, isActive: true },
    });
    if (!existing) {
      await prisma.template.create({
        data: {
          docType: t.docType,
          clientType: t.clientType,
          name: t.name,
          html: t.html,
          css: t.css,
          version: 1,
          isActive: true,
        },
      });
      console.log(`  Seeded template: ${t.name}`);
    } else {
      console.log(`  Template exists: ${t.name} (skipped)`);
    }
  }
}

// ----- PLACEHOLDER TEMPLATES -----
// These will be replaced with the full Nunjucks templates in the defaults.ts module.
// The seed uses simplified versions.

const SOA_INDIVIDUAL_HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Statement of Advice</title>
<style>body{font-family:'Source Sans 3',sans-serif;font-size:10.5pt;color:#444;max-width:800px;margin:0 auto;padding:40px;}</style>
</head><body>
<h1>Statement of Advice</h1>
<p>Prepared for: {{ CLIENT_A_NAME }}</p>
<p>Date: {{ DATE }}</p>
<p>This is a default template. Upload your custom template via the Templates admin page.</p>
</body></html>`;

const SOA_PARTNER_HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Statement of Advice</title>
<style>body{font-family:'Source Sans 3',sans-serif;font-size:10.5pt;color:#444;max-width:800px;margin:0 auto;padding:40px;}</style>
</head><body>
<h1>Statement of Advice</h1>
<p>Prepared for: {{ CLIENT_A_NAME }} &amp; {{ CLIENT_B_NAME }}</p>
<p>Date: {{ DATE }}</p>
<p>This is a default template. Upload your custom template via the Templates admin page.</p>
</body></html>`;

const ROA_PLACEHOLDER_HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Record of Advice</title>
<style>body{font-family:'Source Sans 3',sans-serif;font-size:10.5pt;color:#444;max-width:800px;margin:0 auto;padding:40px;}</style>
</head><body>
<h1>Record of Advice</h1>
<p>Prepared for: {{ CLIENT_A_NAME }}</p>
<p>Date: {{ DATE }}</p>
<p>This is a default template. Upload your custom template via the Templates admin page.</p>
</body></html>`;

const SOE_PLACEHOLDER_HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Scope of Engagement</title>
<style>body{font-family:'Source Sans 3',sans-serif;font-size:10.5pt;color:#444;max-width:800px;margin:0 auto;padding:40px;}</style>
</head><body>
<h1>Scope of Engagement</h1>
<p>Client: {{ CLIENT_A_NAME }}</p>
<p>Date: {{ DATE }}</p>
<p>This is a default template. Upload your custom template via the Templates admin page.</p>
</body></html>`;

main()
  .then(() => {
    console.log("Seed complete.");
    process.exit(0);
  })
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  });
