import { PrismaClient } from "@prisma/client";
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

  // Clear any placeholder templates so the app uses the full built-in
  // Nunjucks templates from src/lib/templates/defaults.ts
  // Users can later paste their own templates via the /templates admin page
  const deleted = await prisma.template.deleteMany({
    where: {
      name: { contains: "Default" },
    },
  });
  if (deleted.count > 0) {
    console.log(`  Cleared ${deleted.count} placeholder templates (full built-in templates will be used)`);
  }

  console.log("  Templates: using built-in defaults from code (editable via /templates)");
}

main()
  .then(() => {
    console.log("Seed complete.");
    process.exit(0);
  })
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  });
